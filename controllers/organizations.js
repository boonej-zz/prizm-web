// Organizations Controller
var express       = require('express');
var router        = express.Router();
var mongoose      = require('mongoose');
var ObjectId      = require('mongoose').Types.ObjectId;
var User          = mongoose.model('User');
var Post          = mongoose.model('Post');
var Organization  = mongoose.model('Organization');
var _users        = require('../controllers/users');
var _posts        = require('../controllers/posts');
var _time         = require('../lib/helpers/date_time');
var _profile      = require('../lib/helpers/profile');
var Mixpanel      = require('mixpanel');
var mixpanel      = Mixpanel.init(process.env.MIXPANEL_TOKEN);

// Organizations Methods
exports.displayOrganization = function(req, res) {
  var name = req.params.name;
  var auth = false;
  var currentUser = {};
  var isCurrent = false;
  var isTrust = false;
  if (req.isAuthenticated()) {
    auth = true;
    currentUser = req.user;
  }
  Organization.findOne({namespace: name}, function(err, organization) {
    if (err) {
      console.log(err);
      res.send(404);
    }
    else if (organization) {
      User.findOne({_id: ObjectId(organization.owner)}, function(err, user) {
        if (err) {
          console.log(err);
          res.send(404);
        }
        mixpanel.track('Organization Viewed', user.mixpanelProperties());
        if (user) {
          _users.getTrustedLuminariesForUserId(user.id, function(err, luminaries) {
            if (err) {
              luminaries = [];
            }
            Post.findPostsForProfileByUserId(user.id, false, false, function(err, posts) {
              var headerImages;
              if (err) {
                posts = [];
                headerImages = [];
              }
              var showMembers = String(currentUser._id) == String(user._id);
              posts = _time.addTimeSinceFieldToObjects(posts);
              headerImages = _profile.shufflePostImagesForProfileHeader(posts);
              res.render('profile/profile', {
                auth: auth,
                currentUser: currentUser,
                organization: organization,
                luminaries: luminaries,
                user: user,
                headerImages: headerImages,
                posts: posts,
                showMembers: showMembers
              });
            });
          });
        }
      });
    }
    else {
      res.send(404);
    }
  });
}

exports.getNamespaceByOwnerId = function(owner_id, next) {
  Organization.findOne({owner: ObjectId(owner_id)}, function(err, organization) {
    if (err) {
      next(err);
    }
    if (organization) {
      next(null, organization.namespace);
    }
    else {
      next(null, false);
    }
  });
};

var verifyOrgCode = function(req, res) {

  var code = req.get('data');
  console.log('verifying... ' + code);
  Organization.findOne({code: code}, function(err, org) {
    if (err) {
      res.status(500).send({error: err});
    }
    if (org) {
      res.status(403).send({
        error: 'The code entered is currently in use by another organization'
      });
    }
    else {
      console.log("avail!");
      res.status(200).send({
        success: 'Code is available',
        code: code
      });
    }
  });
}

var verifyOrgNamespace = function(req, res) {

  var namespace = req.get('data');
  Organization.findOne({namespace: namespace}, function(err, org) {
    if (err) {
      res.status(500).send({error: err});
    }
    if (org) {
      console.log(org);
      res.status(403).send({
        error: 'The desired namespace is currently in use by another organization'
      });
    }
    else {
      res.status(200).send({
        success: 'Namespace is available',
        namespace: namespace
      });
    }
  });
}

exports.displayOrgRegistration = function(req, res) {
  if (req.accepts('html')) {
    res.render('registration/registration_org', {
      bodyId: 'payments'
    });
  }
  if (req.accepts('application/json')) {
    console.log('req accepts json...');
    console.log(req.get('action'));
    if (req.get('action') == 'checkCode') {
      verifyOrgCode(req, res);
    }
    if (req.get('action') == 'checkNamespace') {
      verifyOrgNamespace(req, res);
    }
  }
}

exports.createOrg = function (req, res) {
  var owner = req.params.id;
  var code = req.get('code');
  var namespace = req.get('namespace')
  // var welcomeImage = req.get('welcomeImage')
  // var theme = req.get('theme');

  User.findOne({_id: owner}, function(err, owner) {
    if (err) {
      res.status(500).send({error: err});
    }
    if (owner) {
      org = new Organization({
        owner: owner,
        namespace: namespace,
        code: code,
        name: owner.name ? owner.name : owner.first_name,
        // welcome_image_url: welcomeImage,
        // them: ObjectId(them),
      });
      org.save(function(err, org) {
        if (err) {
          res.status(500).send({error: err});
        }
        if (org) {
          res.status(200).send({success: org});
        }
      });
    }
    else {
      res.status(400).send({error: 'Invalid user id'});
    }
  });
}


