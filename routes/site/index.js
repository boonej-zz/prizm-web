var express   = require('express');
var mongoose = require('mongoose');

var app    = express();
var Post = mongoose.model('Post');

app.get('/', function(req, res) {
  
  var action = req.get('action') || false;
  var user = req.user || false;
  var lastPost = req.get('lastPost') || false;
  var createDate = req.get('createDate') || false;
  var currentTime = Date(req.get('current_time'));
  var serverTime = new Date();

  var params = {
    title: 'Prizm App',
    selected: 'home',
    bodyId: 'body-home'
  };

  if (user) {
     
  } else if (action) {
    res.status(400).send();
  } else {
    res.render('site/index', params);
  }

});

app.use('/users', require('./users'));

function fetchHomeFeed(user, action, next) {

  user.fetchHomeFeedCriteria(function(err, criteria){
    criteria.create_date = {'$
  });
}

module.exports = app;
