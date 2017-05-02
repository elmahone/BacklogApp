'use strict';
const express = require('express');
const router = express.Router();
const igdb = require('igdb-api-node');

router.get('/games/:searchTitle', (req, res) => {
    console.log('got ' + req.params.searchTitle);
    let games = [];
    igdb.games({
        search: req.params.searchTitle,
        fields: 'id,name,time_to_beat,first_release_date,screenshots,cover,game'
    }).then((output) => {
        for (const game of output.body) {
            if (!game.game && game.cover) {
                games.push(game);
            }
        }
        res.send(games);
    });
});

router.get('/:gameId', (req, res) => {
    igdb.games({ids: [req.params.gameId], fields: '*'}).then((output) => {
        res.send(output);
    });
});


module.exports = router;