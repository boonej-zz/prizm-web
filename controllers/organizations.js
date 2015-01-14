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

// Organizations Methods
exports.displayOrganization = function(req, res) {
  var name = req.params.name;
  var auth = false;
  var currentUser = {};
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
      User.findOne({_id: ObjectId(organization.owner)}, function(err, owner) {
        if (err) {
          console.log(err);
          res.send(404);
        }
        if (owner) {
          _users.getTrustedLuminariesForUserId(owner.id, function(err, luminaries) {
            if (err) {
              luminaries = [];
            }
            _posts.getPostsForProfileByUserId(owner.id, function(err, posts) {
              if (err) {
                posts = [];
              }
              posts = _time.addTimeSinceFieldToPosts(posts);
              res.render('organization', {
                auth: auth,
                currentUser: currentUser,
                organization: organization,
                luminaries: luminaries,
                owner: owner,
                posts: posts });
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