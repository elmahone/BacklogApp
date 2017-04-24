'use strict';
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const passport = require('passport');
const mongoose = require('mongoose');
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');

const app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');

const Game = require('./app/models/game');

require('./app/passport')(passport);

app.use(cookieParser());
app.use(session({
    secret: 'secretsss',
    resave: false,
    saveUninitialized: true,
    cookie: {secure: true}
}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use('/vendor', express.static('node_modules'));
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static('public'));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

if (process.env.ENV === 'dev') {
    const sslkey = fs.readFileSync('ssl-key.pem');
    const sslcert = fs.readFileSync('ssl-cert.pem');

    const options = {
        key: sslkey,
        cert: sslcert,
    };
    https.createServer(options, app).listen(8080);
    http.createServer((req, res) => {
        res.writeHead(301, {'Location': 'https://localhost:8080' + req.url});
        res.end();
    }).listen(3000);
} else {
    app.enable('trust proxy');
    app.use((req, res, next) => {
        if (req.secure) {
            // request was via https, so do no special handling
            next();
        } else {
            // request was via http, so redirect to https
            res.redirect('https://' + req.headers.host + req.url);
        }
    });
    app.listen(3000);
}

mongoose.connect(`mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`).then(() => {
    console.log('connected!');
}, (err) => {
    console.log('failed: ' + err);
});

require('./app/routes')(app, passport);
