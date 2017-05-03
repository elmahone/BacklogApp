'use strict';
const express = require('express');
const router = express.Router();
const igdb = require('igdb-api-node');
const moment = require('moment');

router.get('/games/:searchTitle', (req, res) => {
    console.log('got ' + req.params.searchTitle);
    let games = [];
    igdb.games({
        search: req.params.searchTitle,
        limit: 20,
        filters: {
            'game-not_exists': true,
            'cover-exists': true,
        },
        fields: 'id,name,time_to_beat,first_release_date,cover'
    }).then((output) => {
        for (const game of output.body) {
            games.push(game);
        }
        res.send(games);
    });
});

router.get('/:gameId', (req, res) => {
    console.log(req.params.gameId);
    igdb.games({ids: [req.params.gameId], fields: '*'}).then((output) => {
        const game = output.body[0];
        let screens = [];
        if (game.screenshots) {
            for (const screen of game.screenshots) {
                screens.push(igdb.image(screen, 'screenshot_huge', 'jpg'));
            }
        }
        res.render('pages/game', {
            user: req.isAuthenticated() ? req.user : null,
            game: game,
            release: moment(game.first_release_date).format('YYYY'),
            cover: igdb.image(game.cover, 'cover_big'),
            screenshots: screens,
        });
    });
});


module.exports = router;