var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var _posts = require('../controllers/posts');
var _users = require('../controllers/users');
var Activity = mongoose.model('Activity');
var Record = mongoose.model('Record');
var Post = mongoose.model('Post');
var User = mongoose.model('User');
var Insight = mongoose.model('Insight');
var InsightTarget = mongoose.model('InsightTarget');
var Interest = mongoose.model('Interest');
var Organization = mongoose.model('Organization');
var Push = require('../classes/push_notification');
var config = require('../config');
var mandrill = require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';
var ejs = require('ejs');
var jade = require('jade');
var fs = require('fs');
var path = require('path');
var mail = fs.readFileSync(path.join(__dirname + '/../lib/mail.ejs'), 'utf8');
var rejectMail = fs.readFileSync(path.join(__dirname +
      '/../views/reject_mail.jade'), 'utf8');
var acceptMail = fs.readFileSync(path.join(__dirname +
      '/../views/accept_mail.jade'), 'utf8');
var adminBody = fs.readFileSync(path.join(__dirname + 
      '/../views/adminMail.ejs'), 'utf8');
var postFeed = fs.readFileSync(path.join(__dirname +
      '/../views/post_feed.jade'), 'utf8');
var adminEmail = 'info@prizmapp.com';
var ObjectId = require('mongoose').Types.ObjectId;
var moment = require('moment');
var utils = require('../utils');
var validateEmail = require('../utils').validateEmail;
var uuid = require('../utils').generateUUID;
var aws = require('aws-sdk');
var _ = require('underscore');

var AWS_ACCESS_KEY = 'AKIAJ656TNM2SYQUMHCA';
var AWS_SECRET_KEY = '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'; 
var S3_BUCKET = 'higheraltitude.prizm.insights'; 

moment.relativeTimeThreshold('d', 6);
moment.relativeTimeThreshold('M', 52);

moment.locale('en', {
  relativeTime: {
    past: "%s",
    s:  "%ds",
    m:  "%dm",
    mm: "%dm",
    h:  "%dh",
    hh: "%dh",
    d:  "%dd",
    dd: "%dd",
    M:  "4w",
    MM: function(number, withoutSuffix, key, isFuture){
      return number*4 + 'w';
    },
    y:  "%dy",
    yy: "%dy"
                } 
});

/* Website */
router.get('/', function(req, res) {
  res.render('index', { title: 'Prizm App', selected:'home', bodyId: 'body-home' });

});

router.get('/about', function(req, res) {
  res.redirect('/#about');
});

router.get('/insight', function(req, res) {
  res.redirect('/#insight');
});

router.get('/mission', function(req, res) {
  res.redirect('/#mission');
})

router.get('/terms', function(req, res) {
  res.render('terms', { title: 'Prizm App | Legal', selected:'none'});
});

router.get('/privacy', function(req, res){
  res.render('privacy', { title: 'Prizm App | Privacy', selected:'none'});
});

router.get('/partner', function(req, res){
  res.render('partner', { title: 'Prizm App | Partners', selected: 'none'});
});

router.get('/luminary', function(req, res){
  res.render('luminary', { title: 'Prizm App | Luminary', selected: 'none'});
});

router.get('/download', function(req, res){
  res.render('download', { title: 'Prizm App | Download', selected: 'none'});
});

/* Posts */
router.get('/posts/', _posts.fetchPosts);
router.get('/posts/:id', _posts.singlePost)

/* Users */
router.get('/users/:id/password', _users.passwordReset);
router.get('/users', utils.auth, _users.fetchUsers);
router.get('/users/:id/institutions', _users.institutionApproval);

/** Organization Pages **/

router.get('/:name', function(req, res) {
  var name = req.params.name;
  Organization.findOne({namespace: name}, function(err, organization) {
    if (err) {
      console.log(err);
      res.send(404);
    }
    else if (organization) {
      User.findOne({_id: ObjectId(organization.owner)}, function(err, owner) {
        if (err) {
          console.log(err);
          res.send(404);
        }
        if (owner) {
          Post
          .find({creator: ObjectId(owner._id)})
          .sort({ create_date: -1, _id: -1 })
          .limit(20)
          .exec(function(err, posts) {
            if (err) {
              console.log(err);
              res.render('organization', {organization: organization,
                                          owner: owner,
                                          noPosts: true,
                                          posts: [] });
            }
            else {
              res.render('organization', {organization: organization,
                                          owner: owner,
                                          noPosts: false,
                                          posts: posts });
            }
          });
        }
      });
    }
    else {
      res.send(404);
    }
  });
});

module.exports = router;