'use strict';
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt-nodejs');

const User = require('../app/models/user');
// expose this function to our app using module.exports
module.exports = (passport) => {

    const cryptPassword = (password) => {
        const salt = bcrypt.genSaltSync(10);
        return bcrypt.hashSync(password, salt, null);
    };

    const validPassword = (password, userPassword) => {
        return bcrypt.compareSync(password, userPassword);
    };

    // used to serialize the user for the session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
            done(err, user);
        });
    });

    passport.use('local-register', new LocalStrategy({
            passReqToCallback: true
        }, (req, username, password, done) => {
            User.findOne({'username': {$regex: new RegExp(username, "i")}},
                (err, user) => {
                    if (err) {
                        console.log(err);
                        return done(err);
                    }
                    if (user) {
                        console.log('found');
                        return done(null, false, req.flash('errorMessage', 'Username already taken.'));
                    } else {
                        console.log('new user');
                        User.create({
                            username: username,
                            password: cryptPassword(password),
                            xboxuser: {id: null, name: null},
                            steamuser: {id: null, name: null},
                            library: [],
                            backlog: [],
                        }).then((json) => {
                            return done(null, json)
                        });
                    }
                });
        })
    );

    passport.use('local-login', new LocalStrategy({
            passReqToCallback: true
        }, (req, username, password, done) => {
            User.findOne({username: {$regex: new RegExp(username, "i")}},
                (err, user) => {
                    if (err) {
                        return done(err);
                    }
                    if (!user) {
                        return done(null, false, req.flash('errorMessage', 'Incorrect username.'));
                    }
                    if (!validPassword(password, user.password)) {
                        return done(null, false, req.flash('errorMessage', 'Incorrect password.'));
                    }
                    return done(null, user);
                });
        }
    ));
};
