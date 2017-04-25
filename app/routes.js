'use strict';
const unirest = require('unirest');
const path = require('path');
const User = require('./models/user');
const Game = require('./models/game');

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
                $regex: new RegExp(newUser, 'i')
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
        let games = [];
        let delay = 0;
        let loop = 0;
        for (const game of library) {
            delay++;
            // Small delay so api doesn't get overloaded
            setTimeout(() => {
                loop++;
                getSteamGameInformation(game.appid, (game) => {
                    if (game) {
                        games.push(game);
                    }
                    console.log(loop + '/' + library.length);
                });

                // Final loop
                if (loop === library.length) {
                    console.log('Done');
                    saveNewGamesToDb(games, () => {
                        console.log('save');
                        cb(games);
                        return false;
                    });
                }
            }, delay * 400);
        }
    };

    // Get single games information
    const getSteamGameInformation = (appid, cb) => {
        const platform = 'steam';
        // Get game name for each game in library
        unirest.get(`https://store.steampowered.com/api/appdetails?appids=${appid}`)
            .end(function (response) {
                if (response.body !== null && response.body[appid].success) {
                    const gameName = response.body[appid].data.name;
                    const game = {
                        id: appid,
                        platform: platform,
                        name: gameName,
                        playTime: 0,
                        reviewScore: 0,
                    };
                    cb(game);
                } else {
                    cb(false);
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
    };

    const isRomanNumeral = (val) => {
        return /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(val);
    };
    const isNumber = (val) => {
        return /^\d+$/.test(val);
    };
    const toRoman = (num) => {
        let result = '';
        const decimal = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const roman = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
        for (let i = 0; i <= decimal.length; i++) {
            // looping over every element of our arrays
            while (num % decimal[i] < num) {
                // keep trying the same number until we need to move to a smaller one
                result += roman[i];
                // add the matching roman number to our result string
                num -= decimal[i];
                // subtract the decimal value of the roman number from our number
            }
        }
        return result;
    };
    const fromRoman = (str) => {
        let result = 0;
        // the result is now a number, not a string
        const decimal = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const roman = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
        for (let i = 0; i <= decimal.length; i++) {
            while (str.indexOf(roman[i]) === 0) {
                //checking for the first characters in the string
                result += decimal[i];
                //adding the decimal value to our result counter
                str = str.replace(roman[i], '');
                //remove the matched Roman letter from the beginning
            }
        }
        if (result > 0) {
            return result;
        } else {
            return null;
        }
    };

    const generateAltNames = (name) => {
        let altNames = [];
        let strippedName = name.replace(/\./g, '').replace(/\'/g, '').replace(/[^\w\s!?]/g, ' ').replace('_', ' ').replace(/  +/g, ' ');
        if (strippedName !== name) {
            altNames.push(strippedName.trim());
        }
        const nameArr = strippedName.split(' ');
        if (nameArr.length > 1) {
            let convertedName = nameArr.map((word) => {
                if (isRomanNumeral(word)) {
                    return fromRoman(word);
                } else if (isNumber(word)) {
                    return toRoman(word);
                }
                return word;
            });
            convertedName = convertedName.join(' ');
            if (convertedName !== name && convertedName !== strippedName) {
                altNames.push(convertedName.trim());
            }
            return altNames;
        } else {
            return null;
        }
    };

    const isGameInDb = (gameName, cb) => {
        Game.findOne({
            name: {
                $regex: new RegExp(gameName, 'i')
            }
        }).then((json) => {
            if (json) {
                cb(json);
            } else {
                const altNames = generateAltNames(gameName);
                Game.findOne({
                    altNames: {
                        $regex: new RegExp(altNames, 'i')
                    }
                }).then((json) => {
                    if (json) {
                        cb(json);
                    } else {
                        cb(null);
                    }
                });
            }
        });
    };

    const saveNewGamesToDb = (games, cb) => {
        console.log(games);
        if (games.length >= 1) {
            for (const game of games) {
                isGameInDb(game.name, (response) => {
                    if (!response) {
                        console.log('NOT IN DB ' + game.name);
                        switch (game.platform) {
                            case 'xbox': {
                                Game.create({
                                    name: game.name,
                                    altNames: generateAltNames(game.name),
                                    xboxID: game.id,
                                }).then(() => {
                                    cb();
                                });
                                break;
                            }
                            case 'steam': {
                                Game.create({
                                    name: game.name,
                                    altNames: generateAltNames(game.name),
                                    steamID: game.id,
                                }).then(() => {
                                    cb();
                                });
                                break;
                            }
                            default: {
                                break;
                            }
                        }
                    } else {
                        switch (game.platform) {
                            case 'xbox': {
                                Game.findOne({xboxID: game.id}).then((data) => {
                                    // If no game with this steamID is found then continue
                                    if (!data) {
                                        Game.findByIdAndUpdate(response._id, {xboxID: game.id}, {new: true}, (err) => {
                                            if (err) {
                                                return handleError(err);
                                            }
                                        });
                                    }
                                    cb();
                                });
                                break;
                            }
                            case 'steam': {
                                Game.findOne({steamID: game.id}).then((data) => {
                                    // If no game with this steamID is found then continue
                                    if (!data) {
                                        Game.findByIdAndUpdate(response._id, {steamID: game.id}, {new: true}, (err) => {
                                            if (err) {
                                                return handleError(err);
                                            }
                                        });
                                    }
                                    cb();
                                });
                                break;
                            }
                            default: {
                                break;
                            }
                        }
                    }
                });
            }
        }
    };
}
;
