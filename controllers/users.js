// Users Controller
var express     = require('express');
var router      = express.Router();
var mongoose    = require('mongoose');
var ObjectId    = require('mongoose').Types.ObjectId;
var User        = mongoose.model('User');
var config      = require('../config');
var jade        = require('jade');
var fs          = require('fs');
var path        = require('path');
var rejectMail  = fs.readFileSync(path.join(__dirname +
                  '/../views/reject_mail.jade'), 'utf8');
var acceptMail  = fs.readFileSync(path.join(__dirname +
                  '/../views/accept_mail.jade'), 'utf8');
var mandrill    = require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';

// User Methods
exports.passwordReset = function(req, res){
  var id = req.params.id;
  var resetKey = req.query.reset_key;
  User.findOne({_id: new ObjectId(id)}, function(err, user){
    if (err) {
      console.log(err);
      res.render('reset', {success: false});
    }
    if (user) {
      if (user.reset_key && user.reset_key == resetKey && user.password_reset) {
        user.password = user.password_reset;
        if (user.hashPassword()){
          user.password_reset = null;
          user.reset_key = null;
          user.reset_date = null;
          user.save(function(err,result){
            if (err) {
              res.render('reset', {success: false});
            } else {
              res.render('reset', {success: true});
            }
          });
        } else {
          res.render('reset', {success: false});
        }
      } else {
        res.render('reset', {success: false});
      } 
    } else {
      res.render('reset', {success: false});
    }
  }); 
};

exports.fetchUsers = function(req, res){
  var limit = req.query.limit || 50;
  if (req.query.name) {
    var search = new RegExp(req.query.name, 'i');
    User.find({name: search}).limit(limit).exec(function(err, users) {
      if (err) {
        res.send(500);
      }
      res.send(users);
    });
  }
};

exports.institutionApproval = function(req, res){
  var id = req.params.id;
  var approval = req.query.approval;
  var review_key = req.query.review_key;
  User.findOne({_id: new ObjectId(id)}, function(err, user){
    if (err) {
      console.log(err);
      res.send(401);
    }
    if (user.review_key == review_key && user.type == 'institution'){
      var html = '';
      var subject = '';
      if (approval == 'yes') {
        user.type = 'institution_verified';
        user.review_key = null;
        user.save();
        subject = 'You have been approved!';
        html = jade.render(acceptMail, {user: user});
      } else if (approval == 'no') {
        user.type = 'user';
        user.review_key = null;
        user.save();
        subject = 'Thank you for your interest.';
        html = jade.render(rejectMail,  {user: user}); 
      }
      console.log(user.email);
      mandrill(mandrillEndpointSend, {
        message: {
                  to: [{email: user.email}],
                  from_email: 'info@prizmapp.com',
                  subject: subject,
                  html: html
               }   
       }, function(err, response) {
         if (err) {
           console.log(response);
            res.render('error', err);
         }
        res.render('approve_deny');
       });
    } else {
      res.render('error', err); 
    }
  });
};