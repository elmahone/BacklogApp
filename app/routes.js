'use strict';
const unirest = require('unirest');
const path = require('path');
const User = require('./models/user');

module.exports = (app, passport) => {

    app.get('/', (req, res) => {
        if (req.isAuthenticated()) {
            res.render('pages/index', {
                user: req.user,
                errorMessage: req.flash('errorMessage'),
            });
        } else {
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

    app.get('/validateUsername/:platform/:user', (req, res) => {
        const platform = req.params.platform;
        const username = req.params.user;
        switch (platform) {
            case 'xbox': {
                getXboxUserId(username, (resp, err) => {
                    if (!err) {
                        res.send(resp.user);
                    } else {
                        res.send(err);
                    }
                });
                break;
            }
            case 'steam': {
                checkSteamId(username, (resp, err) => {
                    if (!err) {
                        res.send(resp.user);
                    } else {
                        res.send(err);
                    }
                });
                break;
            }
        }
    });

    app.get('/getGames/:platform/:user', (req, res) => {
        const platform = req.params.platform;
        const username = req.params.user;
        switch (platform) {
            case 'xbox': {
                getXboxUserId(username, (xuid, err) => {
                    if (!err) {
                        getXboxGames(xuid, (games) => {
                            res.send(games);
                        })
                    } else {
                        res.send(err);
                    }
                });
                break;
            }
            case 'steam': {
                checkSteamId(username, (resp, err) => {
                    if (!err) {
                        getSteamGames(resp.library, (games) => {
                            res.send(games);
                        });
                    } else {
                        res.send(err.message);
                    }
                });
                break;
            }
            default: {
                break;
            }
        }
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

    app.get('/logout', (req, res) => {
        req.logout();
        req.session.destroy();
        res.redirect('/');
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

    app.patch('/savePlatformUsername', (req, res) => {
        const updateObj = {};
        if (req.body.platform === 'steam') {
            updateObj['steamuser'] = req.body.userInfo;
        } else if (req.body.platform === 'xbox') {
            updateObj['xboxuser'] = req.body.userInfo;
        }
        User.findByIdAndUpdate(req.body.userId, updateObj, {new: true}, (err) => {
            if (err) {
                return handleError(err);
            }
            res.sendStatus(200);
        });
    });

    // FUNCTIONS =============================

    // check steam id validity. if valid return library
    const checkSteamId = (username, cb = null) => {
        username = encodeURIComponent(username.trim());
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
                        if (typeof response.body.response !== 'undefined') {
                            const library = response.body.response.games;
                            const resp = {
                                success: true,
                                user: steamid,
                                library: library,
                            };
                            cb(resp, null);
                        } else {
                            const error = {success: false, message: 'Invalid SteamID or Steam User'};
                            cb(null, error);
                        }
                    })

            });
    };

    // Loop through users library and get each game's name
    const getSteamGames = (library, cb) => {
        let requests = library.length;
        let games = [];
        let i = 0;
        for (const game of library) {
            i++;
            // Small delay so api doesn't get overloaded
            setTimeout(() => {
                requests--;
                getSteamGameInformation(game.appid, (game) => {
                    games.push(game);
                });
                if (requests === 0) {
                    //DONE
                    cb(games);
                }
            }, i * 220);
        }
    };

    // Get single games information
    const getSteamGameInformation = (appid, cb) => {
        const platform = 'steam';
        // Get game name for each game in library
        unirest.get(`https://store.steampowered.com/api/appdetails?appids=${appid}`)
            .end(function (response) {
                if (response.body !== null && response.body[appid].success) {
                    const game = {
                        id: appid,
                        platform: platform,
                        name: response.body[appid].data.name,
                        playTime: 0,
                        reviewScore: 0,
                    };
                    cb(game);
                }
            });
    };

    // Get xbox users id with username
    const getXboxUserId = (username, cb = null) => {
        username = encodeURIComponent(username.trim());
        unirest.get('https://xboxapi.com/v2/xuid/' + username)
            .headers({'X-Auth': process.env.XBOX_API})
            .end(function (response) {
                if (response.body.error_code) {
                    if (cb) {
                        const error = {success: false, message: 'Invalid gamertag'};
                        cb(null, error);
                    } else {
                        return false;
                    }
                } else {
                    const resp = {success: true, user: response.body};
                    if (cb) {
                        cb(resp, null);
                    } else {
                        return response.body;
                    }
                }
            });
    };

    // Get xbox users games library with id
    const getXboxGames = (xuid, cb) => {
        const platform = 'xbox';
        let xboneReady = false;
        let x360Ready = false;
        let games = [];
        // Get Xbox user id with given username
        // Get users xbox one game library
        unirest.get('https://xboxapi.com/v2/' + xuid + '/xboxonegames')
            .headers({'X-Auth': process.env.XBOX_API})
            .end(function (response) {
                const library = response.body.titles;
                for (const game of library) {
                    if (game.maxGamerscore !== 0) {
                        games.push({
                            id: game.titleId.toString(16), // Convert to game id hash
                            platform: platform,
                            name: game.name,
                            playTime: 0,
                            reviewScore: 0,
                        });
                    }
                }
                xboneReady = true;
                if (xboneReady && x360Ready) {
                    cb(games);
                }
            });
        // Get users xbox 360 game library
        unirest.get('https://xboxapi.com/v2/' + xuid + '/xbox360games')
            .headers({'X-Auth': process.env.XBOX_API})
            .end(function (response) {
                const library = response.body.titles;
                for (const game of library) {
                    if (game.totalGamerscore !== 0) {
                        games.push({
                            id: game.titleId.toString(16), // Convert to game id hash
                            platform: platform,
                            name: game.name,
                            playTime: 0,
                            reviewScore: 0,
                        });
                    }
                }
                x360Ready = true;
                if (xboneReady && x360Ready) {
                    cb(games);
                }
            });
    }
};
