'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise; // ES6 promise

const gameSchema = new Schema({
    name: String,
    altNames: [String],
    igdbID: Number,
    steamID: Number,
    xboxID: Number,
});

module.exports = mongoose.model('Game', gameSchema);
