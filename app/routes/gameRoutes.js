'use strict';
const express = require('express');
const router = express.Router();
const igdb = require('igdb-api-node');
const moment = require('moment');
const User = require('../models/user');
const Game = require('../models/game');


router.get('/:gameId', (req, res) => {
    igdb.games({ids: [req.params.gameId], fields: '*'}).then((output) => {
        const game = output.body[0];
        let screens = [];
        if (game.screenshots) {
            for (const screen of game.screenshots) {
                screens.push(igdb.image(screen, 'screenshot_huge', 'jpg'));
            }
        }
        let inLibrary = false;
        let inBacklog = false;
        if (req.isAuthenticated()) {
            inBacklog = isInBacklog(req.user._id, game);
            inLibrary = isInLibrary(req.user._id, game);
            console.log(inBacklog + inLibrary);
        }
        res.render('pages/game', {
            user: req.isAuthenticated() ? req.user : null,
            game: game,
            release: moment(game.first_release_date).format('YYYY'),
            cover: igdb.image(game.cover, 'cover_big'),
            screenshots: screens,
            isInLibrary: inLibrary,
            isInBacklog: inBacklog,
        });
    });
});

router.post('/addToBacklog', (req, res) => {
    const user = req.body.userId;
    const game = {
        id: req.body.gameId,
        name: req.body.name,
        hidden: true,
    };
    if (!user) {
        res.sendStatus(500);
    } else {
        addToLibrary(user, game, (err) => {
            if (err) {
                res.sendStatus(500);
            } else {
                // OK
                addToBacklog(user, game, (err) => {
                    if (err) {
                        res.sendStatus(500);
                    } else {
                        res.sendStatus(200);
                    }
                });
            }
        });
    }
});

router.post('/addToLibrary', (req, res) => {
    const user = req.body.userId;
    const game = {
        id: req.body.gameId,
        name: req.body.name,
        hidden: false,
    };
    if (!user) {
        res.sendStatus(500);
    } else {
        addToLibrary(user, game, (err) => {
            if (err) {
                res.sendStatus(500);
            } else {
                res.sendStatus(200);
            }
        });
    }
});

const isInLibrary = (user, game) => {
    User.findOne({_id: user, 'library.id': game.id}).then((resp) => {
        if (resp) {
            return true;
        } else {
            return false;
        }
    });
};

const isInBacklog = (user, game) => {
    User.findOne({_id: user, 'backlog.id': game.id, 'backlog.platform': 'other'}).then((resp) => {
        if (resp) {
            return true;
        } else {
            return false;
        }
    });
};

const addToLibrary = (user, game, cb) => {
    //Add to library
    User.findByIdAndUpdate(user, {$push: {library: game}}, {new: true}, (err) => {
        if (err) {
            cb(err);
        } else {
            cb();
        }
    });
};

const addToBacklog = (user, game, cb) => {
    //Add to library
    User.findByIdAndUpdate(user, {$push: {backlog: game}}, {new: true}, (err) => {
        if (err) {
            cb(err);
        } else {
            cb();
        }
    });
};

module.exports = router;
