var express       = require('express');
var router        = express.Router();
var mongoose      = require('mongoose');
var User          = mongoose.model('User');
var stripe        = require("stripe")("sk_test_8LKzLNkqIgdEphX5DZSNCygz");

exports.createCustomerAccount = function(req, res, next) {
  var stripeToken = req.body.stripeToken;
  var userId      = req.params.id
  var userEmail;

  function createStripeCustomer(next) {
    stripe.customers.create({
      source: stripeToken,
      email: userEmail,
      description: 'Prizm Partner',
      metadata: {
        prizm_user_id: userId,
      }
    }, function(err, customer) {
      if (err)  {
        next(err);
      }
      else {
        next(null, customer);
      }
    });
  };

  User.findOne({_id: userId}, function(err, user) {
    if (err) next(err);
    if (user) {
      userEmail = user.email;
      createStripeCustomer(function(err, customer) {
        if (err) {
          next(err);
        }
        else {
          next(null, customer);
        }
      });
    }
  });
}