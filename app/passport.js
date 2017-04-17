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
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

    passport.use('local-register', new LocalStrategy({
            passReqToCallback: true
        }, (req, username, password, done) => {
            User.findOne({'username': username}).then((err, user) => {
                if (err) {
                    return done(err);
                }
                if (user) {
                    return done(null, false, {message: 'Username already taken.'});
                } else {
                    User.create({
                        username: username,
                        password: cryptPassword(password),
                        xboxuser: null,
                        steamuser: null,
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
            User.findOne({username: username}, (err, user) => {
                if (err) {
                    return done(err);
                }
                if (!user) {
                    return done(null, false, {message: 'Incorrect username.'});
                }
                if (!validPassword(password, user.password)) {
                    return done(null, false, {message: 'Incorrect password.'});
                }
                return done(null, user);
            });
        }
    ));
};
