'use strict';
const express = require('express');
const router = express.Router();

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
            res.render('pages/backlog', {
                user: req.user,
                backlog: orderBacklog(req.user.backlog),
            });
        } else {
            res.redirect('/');
        }
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
        successRedirect: '/profile',
        failureRedirect: '/',
        failureFlash: true,
    }));


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

    return router;
};
