// Organizations Controller
var express       = require('express');
var router        = express.Router();
var mongoose      = require('mongoose');
var ObjectId      = require('mongoose').Types.ObjectId;
var User          = mongoose.model('User');
var Post          = mongoose.model('Post');
var Organization  = mongoose.model('Organization');
var config        = require('../config');
var jade          = require('jade');
var fs            = require('fs');
var path          = require('path');

// Organizations Methods
exports.fetchOrganizationByName = function(req, res) {
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
}