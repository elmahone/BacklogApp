'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise; // ES6 promise

const userSchema = new Schema({
    username: String,
    password: String,
    xboxuser: {
        id: String,
        name: String,
    },
    steamuser: {
        id: String,
        name: String,
    },
    created: {type: Date, default: Date.now},
    library: [
        {
            id: String,
            name: String,
            playTime: Number,
            reviewScore: Number,
            hidden: Boolean,
        }
    ],
    xboxLibrary: [
        {
            id: String,
            name: String,
            playTime: Number,
            reviewScore: Number,
            hidden: Boolean,
        }
    ],
    steamLibrary: [
        {
            id: String,
            name: String,
            playTime: Number,
            reviewScore: Number,
            hidden: Boolean,
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
