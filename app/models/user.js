'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise; // ES6 promise

const userSchema = new Schema({
    username: String,
    password: String,
    xboxuser: String,
    steamuser: String,
    created: {type: Date, default: Date.now},
    library: [
        {
            id: String,
            platform: String,
            name: String,
            playTime: Number,
            reviewScore: Number,
        }
    ],
    backlog: [
        {
            id: String,
            platform: String,
            name: String,
            playTime: Number,
            reviewScore: Number,
            listIndex: Number,
        }
    ]
});

module.exports = mongoose.model('User', userSchema);
