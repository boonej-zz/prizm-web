
var subdomain = require('express-subdomain');
var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs');
var opts = {
  key: fs.readFileSync('ssl/PrizmApp.key'),
  cert: fs.readFileSync('ssl/star_prizmapp_com.crt'),
  ca: fs.readFileSync('ssl/DigiCertCA.crt'),
  requestCert: false,
  rejectUnauthorized: false
};

// var db = require('./db/db');
var models = require('./models');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes/routes');
var admin = require('./routes/admin');


var app = express();
https.createServer(opts, app).listen(443);

app.use(function(req, res, next){
  var protocol = req.protocol;
  if (protocol == 'http'){
    res.redirect('https://' + req.hostname + req.originalUrl);
  } else {
    next();
  }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(path.join(__dirname, 'public/images/favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(function(req, res, next){
  switch (req.host){
    case('admin.prizmapp.com'):
      admin;
      break;
    default:
      next();
      break;
  }
});


app.use(subdomain('admin', admin));

app.use(subdomain('*', routes));


/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
