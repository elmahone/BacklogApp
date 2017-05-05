'use strict';
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Game = require('../models/game');

router.patch('/saveNewOrder', (req) => {
    saveNewOrder(req.body.userId, req.body.newOrder);
});

router.delete('/remove', (req) => {
    removeGame(req.body.userId, req.body.gameId);
    showOrHideGameFromLibrary(false, req.body.userId, req.body.gameId, req.body.platform);
});

router.post('/finish', (req, res) => {
    const data = req.body;
    User.findById(data.userId, (err, user) => {
        if (!user) {
            res.sendStatus(500);
        } else {
            removeGame(data.userId, data.gameId);
            showOrHideGameFromLibrary(false, data.userId, data.gameId, data.platform);
            reviewGame(data.platform, data.gameId, data.review, () => {
                postTime(data.platform, data.gameId, data.playTime, () => {
                    res.redirect('/backlog');
                });
            });
        }
    });

});


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
        });
    }
};

const reviewGame = (platform, game, score, cb) => {
    let platId = {};
    if (platform === 'xbox') {
        platId = {'xboxID': game};
    } else if (platform === 'steam') {
        platId = {'steamID': game};
    } else {
        platId = {'igdbID': game};
    }
    Game.update(platId, {$push: {'reviewScore.userScores': score}}, {new: true}, (err, res) => {
        if (!err) {
            cb();
        }
    });
};

const postTime = (platform, game, time, cb) => {
    time = time * (60*60); // to seconds
    let platId = {};
    if (platform === 'xbox') {
        platId = {'xboxID': game};
    } else if (platform === 'steam') {
        platId = {'steamID': game};
    } else {
        platId = {'igdbID': game};
    }
    Game.update(platId, {$push: {'playTime.userTimes': time}}, {new: true}, (err, res) => {
        if (!err) {
            cb();
        }
    });
};

// change games hidden property to true
const showOrHideGameFromLibrary = (hide, userId, gameId, platform) => {
    switch (platform) {
        case 'xbox': {
            User.update({
                _id: userId,
                'xboxLibrary.id': gameId
            }, {$set: {'xboxLibrary.$.hidden': hide}}, {new: true}, (err, res) => {
            });
            break;
        }
        case 'steam': {
            User.update({
                _id: userId,
                'steamLibrary.id': gameId
            }, {$set: {'steamLibrary.$.hidden': hide}}, {new: true}, (err, res) => {
            });
            break;
        }
        case 'other': {
            User.update({
                _id: userId,
                'library.id': gameId
            }, {$set: {'library.$.hidden': hide}}, {new: true}, (err, res) => {
            });
            break;
        }
        default: {
            break;
        }
    }
};

const removeGame = (user, gameId) => {
    User.update({_id: user}, {$pull: {backlog: {'id': gameId}}}, {new: true}, (err, res) => {
    });
};

module.exports = router;