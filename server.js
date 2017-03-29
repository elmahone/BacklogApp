'use strict';
const express = require('express');
const app = express();

app.use(express.static('public'));
app.use('/vendor', express.static('node_modules'));

app.get('/', (req, res) => {
    res.redirect('/index.html');
});

app.listen(3000);
