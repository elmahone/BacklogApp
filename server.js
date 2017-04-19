'use strict';
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bodyParser = require('body-parser');
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
app.use(session({secret: 'secretsss'}));
app.use(bodyParser.urlencoded({extended: true}));

app.use('/vendor', express.static('node_modules'));
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static('public'));

app.use(passport.initialize());
app.use(passport.session());

const sslkey = fs.readFileSync('ssl-key.pem');
const sslcert = fs.readFileSync('ssl-cert.pem');

const options = {
    key: sslkey,
    cert: sslcert,
};

mongoose.connect(`mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`).then(() => {
    console.log('connected!');
}, (err) => {
    console.log('failed: ' + err);
});

require('./app/routes')(app, passport);

https.createServer(options, app).listen(8080);
http.createServer((req, res) => {
    res.writeHead(301, {'Location': 'https://localhost:8080' + req.url});
    res.end();
}).listen(3000);
