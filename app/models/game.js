'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise; // ES6 promise

const gameSchema = new Schema({
    name: String,
    name_lower: String,
    altNames: [String],
    igdbID: String,
    steamID: String,
    xboxID: String,
    reviewScore: {
        userScores: [],
        apiScore: Number,
    },
    playTime: {
        userTimes: [],
        apiTime: Number,
    }

});

module.exports = mongoose.model('Game', gameSchema);
