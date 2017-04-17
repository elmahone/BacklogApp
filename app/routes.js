'use strict';
const unirest = require('unirest');

module.exports = (app, passport) => {

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
};