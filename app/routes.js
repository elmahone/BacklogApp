'use strict';
const unirest = require('unirest');
const User = require('./models/user');
const Game = require('./models/game');

module.exports = (app, passport) => {

    // INDEX ROUTE
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
    // PROFILE ROUTE
    app.get('/profile', (req, res) => {
        if (req.isAuthenticated()) {
            const hiddenLibraries = getHiddenGamesNotInBacklog(req.user);
            res.render('pages/profile', {
                user: req.user,
                hiddenGames: hiddenLibraries,
            });
        } else {
            res.redirect('/');
        }
    });
    // BACKLOG ROUTE
    app.get('/backlog', (req, res) => {
        if (req.isAuthenticated()) {
            res.render('pages/backlog', {
                user: req.user,
                backlog: orderBacklog(req.user.backlog),
            });
        } else {
            res.redirect('/');
        }
    });
    // Checks if username exists on selected platform
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
    // Import game library from selected platform
    app.get('/importGames/:platform/:user/:userID', (req, res) => {
        const platform = req.params.platform;
        const username = req.params.user;
        const uID = req.params.userID;
        switch (platform) {
            case 'xbox': {
                // Check if username exists
                getXboxUserId(username, (resp, err) => {
                    if (!err) {
                        // Get all games from XboxAPI
                        getXboxGames(resp.user, (games) => {
                            // Save library to users xboxLibrary
                            User.findByIdAndUpdate(uID, {xboxLibrary: games}, {new: true}, (err) => {
                                if (err) {
                                    res.send(err);
                                }
                                res.send(games);
                            });
                        });
                    } else {
                        res.send(err);
                    }
                });
                break;
            }
            case 'steam': {
                // Check if steam account exists
                checkSteamId(username, (resp, err) => {
                    if (!err) {
                        // Import game library from Steam Web API
                        // and loop through it getting each games name
                        getSteamGames(resp.library, (games) => {
                            // Save games to users steamLibrary
                            User.findByIdAndUpdate(uID, {steamLibrary: games}, {new: true}, (err) => {
                                if (err) {
                                    res.send(err);
                                }
                                res.send(games);
                            });
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
    // Add game to backlog and hide it from library
    app.post('/addToBacklog', (req, res) => {
        const user = req.body.userId;
        const game = JSON.parse(req.body.game);
        const addedGame = {
            id: game['id'],
            name: game['name'],
            platform: req.body.platform,
            playTime: game['playTime'],
            reviewScore: game['reviewScore'],
        };
        User.findByIdAndUpdate(user, {$push: {backlog: addedGame}}, {new: true})
            .then(() => {
                console.log('saved?');
                showOrHideGameFromLibrary(true, user, game['id'], req.body.platform, () => {
                    res.sendStatus(200);
                });
            });
    });

    // Logout route
    app.get('/logout', (req, res) => {
        req.logout();
        req.session.destroy();
        res.redirect('/');
    });

    // Passport register
    app.post('/register', passport.authenticate('local-register', {
        successRedirect: '/profile',
        failureRedirect: '/',
        failureFlash: true,
    }));

    // Passport login
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
                return;
            }
            res.sendStatus(200);
        });
    });

    app.patch('/saveNewOrder', (req) => {
        saveNewOrder(req.body.userId, req.body.newOrder);
    });
    app.patch('/showOrHideFromLibrary', (req, res) => {
        const body = req.body;
        showOrHideGameFromLibrary(body.hide, body.userId, body.gameId, body.platform, () => {
            res.sendStatus(200);
        });
    });

    // FUNCTIONS =============================

    // check steam id validity. if valid return library
    const checkSteamId = (username, cb = null) => {
        username = encodeURIComponent(username.trim());
        console.log(username);
        // Get steam user id with given username
        unirest.get(`http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${process.env.STEAM_API}&vanityurl=${username}`)
            .end(function (response) {
                const body = response.body.response;
                let steamid = '';
                // If username is not found assume user gave their steam id as username
                if (body.success === 42 || typeof body.steamid === 'undefined') {
                    steamid = username;
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
                    });

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

                getSteamGameInformation(game.appid, (game) => {
                    loop++;
                    if (game) {
                        games.push(game);
                    }
                    console.log(loop + '/' + library.length);

                    // Final loop
                    if (loop === library.length) {
                        console.log('Done');
                        saveNewGamesToDb(games, 'steam', () => {
                            cb(games);
                        });
                    }
                });
            }, delay * 400);
        }
    };

    // Get single games information
    const getSteamGameInformation = (appid, cb) => {
        // Only make a call if this game doesn't exist already
        Game.findOne({steamID: appid}).then((data) => {
            if (!data) {
                // Get game name for each game in library
                unirest.get(`https://store.steampowered.com/api/appdetails?appids=${appid}`)
                    .end(function (response) {
                        if (response.body !== null && response.body[appid].success) {
                            const gameName = response.body[appid].data.name;
                            const game = {
                                id: appid,
                                name: gameName,
                                playTime: 0,
                                reviewScore: 0,
                            };
                            cb(game);
                        } else {
                            cb(false);
                        }
                    });
            } else {
                const game = {
                    id: data.steamID,
                    name: data.name,
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
                console.log(response.body);
                const library = response.body.titles;
                for (const game of library) {
                    if (game.maxGamerscore !== 0) {
                        games.push({
                            id: game.titleId.toString(16), // Convert to game id hash
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
                console.log(response.body);
                const library = response.body.titles;
                let loop = 0;
                for (const game of library) {
                    loop++;
                    if (game.totalGamerscore !== 0) {
                        games.push({
                            id: game.titleId.toString(16), // Convert to game id hash
                            name: game.name,
                            playTime: 0,
                            reviewScore: 0,
                        });
                    }
                }
                x360Ready = true;
                if (xboneReady && x360Ready) {
                    saveNewGamesToDb(games, platform, () => {

                        cb(games);
                    });
                }
            });
    };

    // Check if game with name exists already
    // Also check with alternate names
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

    // change games hidden property to true
    const showOrHideGameFromLibrary = (hide, userId, gameId, platform, cb) => {
        switch (platform) {
            case 'xbox': {
                User.update({
                    _id: userId,
                    'xboxLibrary.id': gameId
                }, {$set: {'xboxLibrary.$.hidden': hide}}, {new: true}, (err, res) => {
                    cb();
                });
                break;
            }
            case 'steam': {
                User.update({
                    _id: userId,
                    'steamLibrary.id': gameId
                }, {$set: {'steamLibrary.$.hidden': hide}}, {new: true}, (err, res) => {
                    cb();
                });
                break;
            }
            case 'other': {
                User.update({
                    _id: userId,
                    'library.id': gameId
                }, {$set: {'library.$.hidden': hide}}, {new: true}, (err, res) => {
                    cb();
                });
                break;
            }
            default: {
                break;
            }
        }
    };

    // Save games to Games collection if it doesn't exist already
    // If game exists, check if it has an id for this platform
    // If not add the id to the game.
    const saveNewGamesToDb = (games, platform, cb) => {
        if (games.length >= 1) {
            for (const game of games) {
                isGameInDb(game.name, (response) => {
                    if (!response) {
                        switch (platform) {
                            case 'xbox': {
                                Game.create({
                                    name: game.name,
                                    altNames: generateAltNames(game.name),
                                    xboxID: game.id,
                                });
                                break;
                            }
                            case 'steam': {
                                Game.create({
                                    name: game.name,
                                    altNames: generateAltNames(game.name),
                                    steamID: game.id,
                                });
                                break;
                            }
                            default: {
                                break;
                            }
                        }
                    } else {
                        switch (platform) {
                            case 'xbox': {
                                Game.findOne({xboxID: game.id}).then((data) => {
                                    // If no game with this xboxID is found then continue
                                    if (!data) {
                                        Game.findByIdAndUpdate(response._id, {xboxID: game.id}, {new: true}, (err) => {
                                            if (err) {
                                                return;
                                            }
                                        });
                                    }
                                }, (err) => {
                                    if (err) {
                                        return;
                                    }
                                });
                                break;
                            }
                            case 'steam': {
                                Game.findOne({steamID: game.id}).then((data) => {
                                    // If no game with this steamID is found then continue
                                    if (!data) {
                                        Game.findByIdAndUpdate(response._id, {steamID: game.id}, {new: true}, (err) => {
                                            if (err) {
                                                return;
                                            }
                                        });
                                    }
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
            cb();
        }
    };

    // Save the new order of backlog list to db
    const saveNewOrder = (userId, newOrder) => {
        for (let i = newOrder.length; i >= 0; i--) {
            User.update({
                _id: userId,
                'backlog.id': newOrder[i]
            }, {$set: {'backlog.$.listIndex': i}}, {new: true}, (err, res) => {
                if (err) {
                    console.log(err);
                }
                console.log(res);
            });
        }
    };

    const orderBacklog = (backlog) => {
        return backlog.sort((a, b) => {
            const itemA = a.listIndex;
            const itemB = b.listIndex;
            if (itemA < itemB) {
                return -1;
            }
            if (itemA > itemB) {
                return 1;
            }
            return 0;
        });
    };

    const getHiddenGamesNotInBacklog = (user) => {
        let xboxLibrary = [];
        for (let i = 0; i < user.xboxLibrary.length; i++) {
            const data = user.backlog.find((item) => {
                return item.name === user.xboxLibrary[i].name;
            });
            if (!data) {
                xboxLibrary.push(user.xboxLibrary[i]);
            }
        }
        let steamLibrary = [];
        for (let i = 0; i < user.steamLibrary.length; i++) {
            const data = user.backlog.find((item) => {
                return item.name === user.steamLibrary[i].name;
            });
            if (!data) {
                steamLibrary.push(user.steamLibrary[i]);
            }
        }
        let library = [];
        for (let i = 0; i < user.library.length; i++) {
            const data = user.backlog.find((item) => {
                return item.name === user.library[i].name;
            });
            if (!data) {
                library.push(user.library[i]);
            }
        }
        return {xboxLibrary: xboxLibrary, steamLibrary: steamLibrary, library: library};

    };

    // TOOLS =======================================
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
};
