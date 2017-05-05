'use strict';
const express = require('express');
const router = express.Router();
const igdb = require('igdb-api-node');
const User = require('../models/user');
const Game = require('../models/game');

router.get('/games/:searchTitle', (req, res) => {
    let games = [];
    let dbGames = [];
    igdb.games({
        search: req.params.searchTitle,
        limit: 20,
        filters: {
            'game-not_exists': true,
            'cover-exists': true,
        },
        fields: 'id,name,time_to_beat,first_release_date,cover,total_rating'

    }).then((output) => {
        for (const game of output.body) {
            games.push(game);
            dbGames.push({
                id: game.id,
                name: game.name,
                platform: 'other',
                reviewScore: game.total_rating ? game.total_rating : 0,
                playTime: game.time_to_beat ? game.time_to_beat.normally : 0,
            });
        }
        saveNewGamesToDb(dbGames, () => {
            res.send(games);
        });
    });
});


// Check if game with name exists already
// Also check with alternate names
const isGameInDb = (gameName, cb) => {
    Game.findOne({
        name_lower: gameName.toLowerCase()
    }).then((json) => {
        if (json) {
            cb(json);
        } else {
            const altNames = generateAltNames(gameName);
            Game.findOne({
                altNames: altNames
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

// Save games to Games collection if it doesn't exist already
// If game exists, check if it has an id
// If not add the id to the game.
const saveNewGamesToDb = (games, cb) => {
    if (games.length >= 1) {
        for (const game of games) {
            isGameInDb(game.name, (response) => {
                if (!response) {
                    Game.create({
                        name: game.name,
                        name_lower: game.name.toLowerCase(),
                        altNames: generateAltNames(game.name),
                        igdbID: game.id,
                        playTime: {apiTime: game.playTime},
                        reviewScore: {apiScore: game.reviewScore},

                    });
                } else {
                    Game.findOne({igdbID: game.id}).then((data) => {
                        // If no game with this ID is found then continue
                        if (!data) {
                            Game.findByIdAndUpdate(response._id,
                                {
                                    igdbID: game.id,
                                    'playTime.apiTime': game.playTime,
                                    'reviewScore.apiScore': game.reviewScore,
                                },
                                {new: true}, (err, res) => {
                                });
                        } else {
                            Game.findByIdAndUpdate(response._id,
                                {
                                    'playTime.apiTime': game.playTime,
                                    'reviewScore.apiScore': game.reviewScore
                                },
                                {new: true}, (err, res) => {
                                });
                        }
                    }, (err) => {
                        if (err) {
                            return err;
                        }
                    });
                }
            });
        }
        cb();
    }
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
    let strippedName = name.replace(/\./g, '')
        .replace(/\'/g, '')
        .replace(/[^\w\s!?]/g, ' ')
        .replace('_', ' ')
        .replace(/  +/g, ' ').toLowerCase();
    if (strippedName !== name.toLowerCase()) {
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
        convertedName = convertedName.join(' ').toLowerCase();
        if (convertedName !== name.toLowerCase() && convertedName !== strippedName) {
            altNames.push(convertedName.trim());
        }
        return altNames;
    } else {
        return null;
    }
};

module.exports = router;