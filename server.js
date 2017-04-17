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

const Game = require('./app/models/game');

require('./app/passport')(passport);

app.use(cookieParser());
app.use(session({secret: 'secretsss'}));
app.use(bodyParser.urlencoded({extended: true}));

app.use('/vendor', express.static('node_modules'));
app.use('/uploads', express.static('uploads'));
app.use('/data', express.static('data'));
app.use('/', express.static('public'));

app.use(passport.initialize());

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

mongoose.connect(`mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/backlog`).then(() => {
    console.log('connected!');
}, (err) => {
    console.log('failed: ' + err);
});

require('./app/routes')(app, passport);
