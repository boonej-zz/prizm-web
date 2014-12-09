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

var models = require('./models');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes/routes');
var adminRoute = require('./routes/admin');

var herokuHostname = 'safe-lake-1236.herokuapp.com';

var app = express();
https.createServer(opts, app).listen(4433);

app.use(function(req, res, next){
  var protocol = req.protocol;
  var hostname = req.headers.host;
  var originalUrl = req.originalUrl;
  if (hostname == herokuHostname) {
    next();
  }
  else if (protocol == 'http'){
    res.redirect('https://' + hostname + originalUrl);
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


app.use(subdomain('admin', adminRoute));

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
