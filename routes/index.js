var express   = require('express');
var app    = express();
var subdomain = require('express-subdomain');

app.use(subdomain('admin', require('./admin')));
app.use(subdomain('*', require('./routes')));

module.exports = app;
