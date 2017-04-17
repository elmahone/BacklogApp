'use strict';
const LocalStrategy = require('passport-local').Strategy;
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const passport = require('passport');
const mongoose = require('mongoose');
const unirest = require('unirest');
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');

const Schema = mongoose.Schema;
const app = express();

mongoose.Promise = global.Promise; // ES6 promise

const userSchema = new Schema({
    username: String,
    password: String,
    xboxuser: String,
    steamuser: String,
    created: {type: Date, default: Date.now},
    library: [
        {
            id: String,
            platform: String,
            name: String,
            playTime: Number,
            reviewScore: Number,
        }
    ],
    backlog: [
        {
            id: String,
            platform: String,
            name: String,
            playTime: Number,
            reviewScore: Number,
            listIndex: Number,
        }
    ]
});

const gameSchema = new Schema({
    id: Number,
    name: String,
    igdbID: Number,
    steamID: Number,
    xboxID: Number,
});

const Game = mongoose.model('Game', gameSchema);
const User = mongoose.model('User', userSchema);

const cryptPassword = (password) => {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt, null);
};

const validPassword = (password, userPassword) => {
    return bcrypt.compareSync(password, userPassword);
};

// used to serialize the user for the session
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});


passport.use('local-register', new LocalStrategy({
        passReqToCallback: true
    }, (req, username, password, done) => {
        User.findOne({'username': username}).then((err, user) => {
            if (err) {
                return done(err);
            }
            if (user) {
                return done(null, false, {message: 'Username already taken.'});
            } else {
                User.create({
                    username: username,
                    password: cryptPassword(password),
                    xboxuser: null,
                    steamuser: null,
                    library: [],
                    backlog: [],
                }).then((json) => {
                    return done(null, json)
                });
            }
        })
        ;
    })
)
;

passport.use('local-login', new LocalStrategy({
        passReqToCallback: true
    }, (req, username, password, done) => {
        User.findOne({username: username}, (err, user) => {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false, {message: 'Incorrect username.'});
            }
            if (!validPassword(password, user.password)) {
                return done(null, false, {message: 'Incorrect password.'});
            }
            return done(null, user);
        });
    }
));

app.use(cookieParser());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: {secure: true}
}));
app.use('/vendor', express.static('node_modules'));
app.use(bodyParser.urlencoded({extended: true}));
app.use('/uploads', express.static('uploads'));
app.use('/data', express.static('data'));
app.use(express.static('public'));
app.use(passport.initialize());

const sslkey = fs.readFileSync('ssl-key.pem');
const sslcert = fs.readFileSync('ssl-cert.pem');

const options = {
    key: sslkey,
    cert: sslcert,
};

https.createServer(options, app).listen(8080);
http.createServer((req, res) => {
    res.writeHead(301, {'Location': 'https://localhost:8080' + req.url});
    res.end();
}).listen(3000);

mongoose.connect(`mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/backlog`).then(() => {
    console.log('connected!');
}, (err) => {
    console.log('failed: ' + err);
});

app.get('/', (req, res) => {
    res.redirect('/index.html');
});

app.get('/getGames/:platform/:user', (req, res) => {
    const platform = req.params.platform;
    const username = req.params.user;
    let games = [];
    switch (platform) {
        case 'xbox': {
            let xboneReady = false;
            let x360Ready = false;
            unirest.get('https://xboxapi.com/v2/xuid/' + username)
                .headers({'X-Auth': process.env.XBOX_API})
                .end(function (response) {
                    let xuid = '';
                    if (response.body.success) {
                        xuid = response.body;
                        unirest.get('https://xboxapi.com/v2/' + xuid + '/xboxonegames')
                            .headers({'X-Auth': process.env.XBOX_API})
                            .end(function (response) {
                                const library = response.body.titles;
                                console.log(response.body.titles);
                                for (const game of library) {
                                    if (game.maxGamerscore !== 0) {
                                        games[platform].push({
                                            id: game.titleId.toString(16),
                                            platform: platform,
                                            name: game.name,
                                            playTime: 0,
                                            reviewScore: 0,
                                        });
                                    }
                                }
                                xboneReady = true;
                                if (xboneReady && x360Ready) {
                                    res.send(games);
                                }
                            });
                        unirest.get('https://xboxapi.com/v2/' + xuid + '/xbox360games')
                            .headers({'X-Auth': process.env.XBOX_API})
                            .end(function (response) {
                                const library = response.body.titles;
                                console.log(response.body.titles);
                                for (const game of library) {
                                    if (game.totalGamerscore !== 0) {
                                        games[platform].push({
                                            id: game.titleId.toString(16),
                                            platform: platform,
                                            name: game.name,
                                            playTime: 0,
                                            reviewScore: 0,
                                        });
                                    }
                                }
                                x360Ready = true;
                                if (xboneReady && x360Ready) {
                                    res.send(games);
                                }
                            });
                    } else {
                        res.send('No gamertag ' + username + ' found');
                    }
                });
            break;
        }

        case 'steam': {
            unirest.get(`http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${process.env.STEAM_API}&vanityurl=${username}`)
                .end(function (response) {
                    const body = response.body.response;
                    let steamid = '';
                    if (body.success === 42 || typeof body.steamid === 'undefined') {
                        steamid = username
                    } else {
                        steamid = body.steamid;
                    }
                    unirest.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_API}&steamid=${steamid}&format=json`)
                        .end(function (response) {
                            console.log(response.body);
                            const library = response.body.response.games;
                            let requests = library.length;
                            for (const game of library) {
                                const appid = game.appid;
                                // Small delay so api doesn't get overloaded
                                setTimeout(() => {
                                    unirest.get(`https://store.steampowered.com/api/appdetails?appids=${appid}`)
                                        .end(function (response) {
                                            requests--;
                                            console.log(requests);
                                            console.log(appid);
                                            if (response.body !== null && response.body[appid].success) {
                                                games[platform].push(
                                                    {
                                                        id: appid,
                                                        platform: platform,
                                                        name: response.body[appid].data.name,
                                                        playTime: 0,
                                                        reviewScore: 0,
                                                    });
                                                console.log(games.length);
                                            }
                                            else {
                                                console.log('error');
                                            }
                                            if (requests === 0) {
                                                //DONE
                                                res.send(games);
                                            }

                                        });
                                }, 500);
                            }
                        });
                });
            break;
        }
        default: {
            break;
        }
    }
});

app.post('/register', passport.authenticate('local-register', {
    successRedirect: '/succ',
    failureRedirect: 'fail',
}));

app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/succ',
    failureRedirect: '/fail',
}));
