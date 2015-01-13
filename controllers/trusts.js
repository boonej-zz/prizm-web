// Trusts Controller
var express       = require('express');
var router        = express.Router();
var mongoose      = require('mongoose');
var ObjectId      = require('mongoose').Types.ObjectId;
var User          = mongoose.model('User');
var Trust         = mongoose.model('Trust');

// Trusts Methods
exports.findTrustsByUserId = function(userId, next) {
  User.findOne({_id: ObjectId(userId)}, function(err, user) {
    if (err) {
      next(err);
    }
    if (user) {
      Trust.find({from: ObjectId(userId)}, function(err, trusts) {
        if (err) {
          next(err);
        }
        if (trusts) {
          next(null, trusts);
        }
      });
    }
    else {
      next({error: "Invalid User Id"});
    }
  });
}



