'use strict';
const unirest = require('unirest');
const path = require('path');
const User = require('./models/user');

module.exports = (app, passport) => {

    app.get('/', (req, res) => {
        if (req.isAuthenticated()) {
            console.log('auth');
            res.render('pages/index', {
                user: req.user,
                errorMessage: req.flash('errorMessage'),
            });
        } else {
            console.log('noauth');
            res.render('pages/index', {
                user: false,
                errorMessage: req.flash('errorMessage'),
            });
        }
    });

    app.get('/profile', (req, res) => {
        if (req.isAuthenticated()) {
            res.render('pages/profile', {
                user: req.user
            });
        } else {
            res.redirect('/');
        }
    });

    app.get('/getGames/:platform/:user', (req, res) => {
        const platform = req.params.platform;
        const username = req.params.user;
        let games = [];
        let fails = [];
        switch (platform) {
            case 'xbox': {
                let xboneReady = false;
                let x360Ready = false;
                // Get Xbox user id with given username
                unirest.get('https://xboxapi.com/v2/xuid/' + username)
                    .headers({'X-Auth': process.env.XBOX_API})
                    .end(function (response) {
                        console.log(response.body);
                        let xuid = '';
                        if (typeof response.body.error_code === 'undefined') {
                            xuid = response.body;
                            // Get users xbox one game library
                            unirest.get('https://xboxapi.com/v2/' + xuid + '/xboxonegames')
                                .headers({'X-Auth': process.env.XBOX_API})
                                .end(function (response) {
                                    const library = response.body.titles;
                                    console.log(response.body.titles);
                                    for (const game of library) {
                                        if (game.maxGamerscore !== 0) {
                                            games.push({
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
                            // Get users xbox 360 game library
                            unirest.get('https://xboxapi.com/v2/' + xuid + '/xbox360games')
                                .headers({'X-Auth': process.env.XBOX_API})
                                .end(function (response) {
                                    const library = response.body.titles;
                                    console.log(response.body.titles);
                                    for (const game of library) {
                                        if (game.totalGamerscore !== 0) {
                                            games.push({
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
                // Get steam user id with given username
                unirest.get(`http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${process.env.STEAM_API}&vanityurl=${username}`)
                    .end(function (response) {
                        const body = response.body.response;
                        let steamid = '';
                        // If username is not found assume user gave their steam id as username
                        if (body.success === 42 || typeof body.steamid === 'undefined') {
                            steamid = username
                        } else {
                            steamid = body.steamid;
                        }
                        // Get users steam library
                        unirest.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_API}&steamid=${steamid}&format=json`)
                            .end(function (response) {
                                console.log(response.body);
                                const library = response.body.response.games;
                                let requests = library.length;
                                let i = 0;
                                for (const game of library) {
                                    const appid = game.appid;
                                    i++;
                                    // Small delay so api doesn't get overloaded
                                    setTimeout(() => {
                                        // Get game name for each game in library
                                        unirest.get(`https://store.steampowered.com/api/appdetails?appids=${appid}`)
                                            .end(function (response) {
                                                requests--;
                                                console.log(requests);
                                                console.log(appid);
                                                if (response.body !== null && response.body[appid].success) {
                                                    games.push(
                                                        {
                                                            id: appid,
                                                            platform: platform,
                                                            name: response.body[appid].data.name,
                                                            playTime: 0,
                                                            reviewScore: 0,
                                                        });
                                                    console.log('Games in Lib: ' + games.length);
                                                }
                                                else {
                                                    fails.push(appid);
                                                }
                                                if (requests === 0) {
                                                    //DONE
                                                    res.send(games);
                                                }

                                            });
                                    }, i * 250);
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
        successRedirect: '/profile',
        failureRedirect: '/',
        failureFlash: true,
    }));

    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/profile',
        failureRedirect: '/',
        failureFlash: true,
    }));

    app.get('/logout', (req, res) => {
        req.logout();
        req.session.destroy();
        res.redirect('/');
    });

    app.get('/findUser/:user', (req, res) => {
        const newUser = req.params.user;
        User.findOne({
            username: {
                $regex: new RegExp(newUser, "i")
            }
        }).then((json) => {
            res.send(json);
        });
    });
};