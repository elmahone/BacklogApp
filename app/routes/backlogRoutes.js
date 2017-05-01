'use strict';
const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.patch('/saveNewOrder', (req) => {
    saveNewOrder(req.body.userId, req.body.newOrder);
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
            console.log(res);
        });
    }
};

module.exports = router;