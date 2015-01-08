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
// var config        = require('../config');
// var jade          = require('jade');
// var fs            = require('fs');
// var path          = require('path');

// Organizations Methods
exports.displayOrganization = function(req, res) {
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
          console.log(owner.id);
          _users.getTrustedLuminariesForUserId(owner.id, function(err, luminaries) {
            if (err) {
              luminaries = [];
            }
            _posts.getPostsForProfileByUserId(owner.id, function(err, posts) {
              console.log(posts);
              if (err) {
                posts = [];
              }
              if (req.isAuthenticated()) {
                var auth = true
              }
              res.render('organization', {
                auth: auth,
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