// Organizations Controller
var express       = require('express');
var router        = express.Router();
var mongoose      = require('mongoose');
var ObjectId      = require('mongoose').Types.ObjectId;
var User          = mongoose.model('User');
var Post          = mongoose.model('Post');
var Organization  = mongoose.model('Organization');
var Theme         = mongoose.model('Theme');
var _users        = require('../controllers/users');
var _posts        = require('../controllers/posts');
var _stripe       = require('../controllers/stripe');
var _time         = require('../lib/helpers/date_time');
var _profile      = require('../lib/helpers/profile');
var _image        = require('../lib/helpers/image');
var Mixpanel      = require('mixpanel');
var mixpanel      = Mixpanel.init(process.env.MIXPANEL_TOKEN);
var _             = require('underscore');

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
              if (req.user) {
                _.each(posts, function(post, idx, list){
                  post.liked = false;
                  _.each(post.likes, function(like, index, listb){
                    if (String(like._id) == String(req.user._id)){
                      post.liked = true
                    };
                  });
                });
              }        

              headerImages = _profile.shufflePostImagesForProfileHeader(posts);
              res.render('profile/profile', {
                bodyId: 'profile',
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
      res.status(403).send({error: 'Already in use'});
    }
    else {
      mixpanel.track('New organization code verified', req.user.mixpanel);
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
      mixpanel.track('New namespace found', req.user.mixpanel);
      res.status(200).send({
        success: 'Namespace is available',
        namespace: namespace
      });
    }
  });
}

var displayRegistrationPage = function(req, res) {
  Theme.find(function(err, themes) {
    if (err) {
      themes = []
    }
    mixpanel.track('Viewed payments page.', req.user.mixpanel);
    res.render('registration/registration_org', {
      bodyId: 'payments',
      themes: themes
    });
  });
}

// exports.uploadPhoto = function (req, res) {
//   if (req.accepts('application/json')) {
//     console.log('json req...')
//   }
//   console.log("action: " +req.get('action'));
//   console.log("Uploading photo...");
//   var userId = req.params.id;
//   console.log(userId);
//   _image.uploadPhoto(req, res, userId, function(err, url) {
//     if (err) {
//       res.status(500).send({error: err});
//     }
//     if (url) {
//       res.status(200).send({
//         success: 'Uploaded successfully',
//         url: url
//       });
//     }
//   });
// }

exports.displayOrgRegistration = function(req, res) {
  var action = req.get('action');
  if (req.user.type == 'institution_verified') {
    mixpanel.track('Entered partner setup', req.user.mixpanel);
    if (req.accepts('html')) {
      displayRegistrationPage(req, res);
    }
    if (req.accepts('application/json')) {
      console.log('req accepts json...');
      console.log(req.get('action'));
      if (action == 'checkCode') {
        verifyOrgCode(req, res);
      }
      if (action == 'checkNamespace') {
        verifyOrgNamespace(req, res);
      }
    }
  }
  else {
    res.send('Partner account must be verified before proceeding');
  }
}

exports.updateOrg = function (req, res) {
  var action = req.query.action;
  var userId = req.params.id;

  if (action == 'uploadPhoto') {
    var settings = {
      userId: userId
    };
    
    _image.uploadImage(req, res, settings, function(err, url) {
      if (err) {
        res.status(500).send({error: err});
      }
      if (url) {
        mixpanel.track('Partner image uploaded.', req.user.mixpanel);
        res.status(200).send({
          success: 'Uploaded successfully',
          url: url
        });
      }
    });
  };

  if (action == 'createStripeAccount') {
    _stripe.createCustomerAccount(req, res, function(err, customer) {
      if (err) {
        res.status(500).send({error: err});
      }
      if (customer) {
        mixpanel.track('Added credit card data.', req.user.mixpanel);
        res.status(200).send({
          success: 'Stripe customer account created',
          customer: customer
        });
      }
    });
  };

  if (action == 'createOrg') {
    var code = req.get('code');
    var namespace = req.get('namespace');
    var welcomeImage = req.get('welcomeImage');
    var stripeId = req.get('stripeId');
    var theme = req.get('theme');

    User.findOne({_id: userId}, function(err, owner) {
      if (err) {
        res.status(500).send({error: err});
      }
      if (owner) {
        org = new Organization({
          owner: owner,
          namespace: namespace,
          code: code,
          name: owner.name ? owner.name : owner.first_name,
          welcome_image_url: welcomeImage,
          theme: ObjectId(theme),
          stripe_id: stripeId
        });
        org.save(function(err, org) {
          if (err) {
            res.status(500).send({error: err});
          }
          if (org) {
            mixpanel.track('Partner setup complete', req.user.mixpanel);
            res.status(200).send({success: org});
          }
        });
      }
      else {
        res.status(400).send({error: 'Invalid user id'});
      }
    });
  };
}

