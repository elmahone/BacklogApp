'use strict';
const express = require('express');
const router = express.Router();
const Game = require('../models/game');


module.exports = (app, passport) => {

    // INDEX ROUTE
    router.get('/', (req, res) => {
        if (req.isAuthenticated()) {
            res.render('pages/index', {
                user: req.user,
                errorMessage: req.flash('errorMessage'),
            });
        } else {
            res.render('pages/index', {
                user: false,
                errorMessage: req.flash('errorMessage'),
            });
        }
    });
    // PROFILE ROUTE
    router.get('/profile', (req, res) => {
        if (req.isAuthenticated()) {
            const hiddenLibraries = getHiddenGamesNotInBacklog(req.user);
            res.render('pages/profile', {
                user: req.user,
                hiddenGames: hiddenLibraries,
            });
        } else {
            res.redirect('/');
        }
    });
    // BACKLOG ROUTE
    router.get('/backlog', (req, res) => {
        if (req.isAuthenticated()) {
            getEstimatedBacklogLength(req.user.backlog, (est) => {
                res.render('pages/backlog', {
                    user: req.user,
                    backlog: orderBacklog(req.user.backlog),
                    backlogLength: est,
                });
            });
        } else {
            res.redirect('/');
        }
    });
    // SEARCH ROUTE
    router.get('/search', (req, res) => {
        res.render('pages/search', {
            user: req.user,
        });
    });

    // Logout route
    router.get('/logout', (req, res) => {
        req.logout();
        req.session.destroy();
        res.redirect('/');
    });

    // Passport register
    router.post('/register', passport.authenticate('local-register', {
        successRedirect: '/profile',
        failureRedirect: '/',
        failureFlash: true,
    }));

    // Passport login
    router.post('/login', passport.authenticate('local-login', {
        failureRedirect: '/',
        failureFlash: true,
    }), (req, res) => {
        res.redirect(req.headers.referer);
    });


    // FUNCTIONS =============================

    const getHiddenGamesNotInBacklog = (user) => {
        let xboxLibrary = [];
        for (let i = 0; i < user.xboxLibrary.length; i++) {
            const data = user.backlog.find((item) => {
                return item.name === user.xboxLibrary[i].name;
            });
            if (!data) {
                xboxLibrary.push(user.xboxLibrary[i]);
            }
        }
        let steamLibrary = [];
        for (let i = 0; i < user.steamLibrary.length; i++) {
            const data = user.backlog.find((item) => {
                return item.name === user.steamLibrary[i].name;
            });
            if (!data) {
                steamLibrary.push(user.steamLibrary[i]);
            }
        }
        let library = [];
        for (let i = 0; i < user.library.length; i++) {
            const data = user.backlog.find((item) => {
                return item.name === user.library[i].name;
            });
            if (!data) {
                library.push(user.library[i]);
            }
        }
        return {xboxLibrary: xboxLibrary, steamLibrary: steamLibrary, library: library};

    };


    const getEstimatedBacklogLength = (backlog, cb) => {
        let times = [];
        let platIds = [];
        for (const game of backlog) {
            if (game.platform === 'xbox') {
                platIds.push({'xboxID': game.id});
            } else if (game.platform === 'steam') {
                platIds.push({'steamID': game.id});
            } else {
                platIds.push({'igdbID': game.id});
            }
        }
        if (platIds.length > 0) {
            Game.find({$or: platIds}).then((data) => {
                for (const game of data) {
                    let gameTime = [];
                    if (typeof game.playTime.apiTime !== 'undefined') {
                        gameTime.push(game.playTime.apiTime);
                    }
                    if (game.playTime.userTimes.length > 0) {
                        for (const userTime of game.playTime.userTimes) {
                            if (userTime > 0) {
                                gameTime.push(userTime);
                            }
                        }
                    }
                    times.push(average(gameTime));
                }
                cb(sum(times));
            });
        } else {
            cb(0);
        }
    };

    const orderBacklog = (backlog) => {
        return backlog.sort((a, b) => {
            const itemA = a.listIndex;
            const itemB = b.listIndex;
            if (itemA < itemB) {
                return -1;
            }
            if (itemA > itemB) {
                return 1;
            }
            return 0;
        });
    };

    const average = (arr) => {
        if (arr.length > 0) {
            return sum(arr) / arr.length;
        } else {
            return 0;
        }
    };

    const sum = (arr) => {
        if (arr.length > 0) {
            let sum = 0;
            for (let i = 0; i < arr.length; i++) {
                sum += parseInt(arr[i]); //don't forget to add the base
            }
            return sum;
        } else {
            return 0;
        }
    };

    return router;
};
