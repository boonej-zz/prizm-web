var express       = require('express');
var router        = express.Router();
var mongoose      = require('mongoose');
var Mixpanel      = require('mixpanel');
var mixpanel      = Mixpanel.init(process.env.MIXPANEL_TOKEN);
var _             = require('underscore');

/** Models **/
var User          = mongoose.model('User');
var Organization  = mongoose.model('Organization');
var Message       = mongoose.model('Message');
var Trust         = mongoose.model('Trust');

exports.displayMessagesFeed = function(req, res){
  var user = req.user;
  var options = {
    title: 'Message',
    bodyId: 'messageList',
    topics: [],
    auth: true,
    currentUser: user
  };
  if (user.type == 'user') {
    User.findOne({_id: user._id})
    .populate({path: 'org_status.organization'})
    .populate({path: 'org_status.organization.owner'})
    .exec(function(err, user){
      if (user && user.org_status && user.org_status.length > 0) {
        options.currentUser = user;
        options.topics = user.org_status[0].groups || [];
        var userOrgs = _.filter(user.org_status, function(status){
          return status.status == 'active';
        });
        if (userOrgs.length == 0) res.redirect('/');
        options.organization = userOrgs[0];
        Message.fetchMessages(
          {
            organization: user.org_status[0].organization,
            group: 'all'
          },
          function(err, messages){
            options.messages = messages.reverse() || [];
            console.log(options);
            res.render('messages/messages', options);
          }
        );
      } else {
        res.redirect('/');
      }
    });
  } else if (user.type == 'institution_verified') {
    Organization.findOne({owner: user._id})
    .populate({path: 'owner'})
    .exec(function(err, organization){
      if (organization) {
        options.topics = organization.groups || [];
        options.organization = organization;
        Message.fetchMessages(
          {
            organization: organization._id,
            group: 'all'
          },
          function(err, messages){
            options.messages = messages.reverse() || [];
            res.render('messages/messages', options);
          }
        );
      } else {
        res.redirect('/');
      }      
    });
  }
};

exports.fetchMessages = function(req, res){
  var group = req.params.group;
  var organization = req.get('organization');
  var lastDate = req.get('lastDate');
  var options = {};
  if (group && organization) {
    var criteria = {
      organization: organization,
      group: group
    };
    if (lastDate) {
      criteria.create_date = {$lt: new Date(lastDate)};
    }
    Message.fetchMessages(
        criteria, 
        function(err, messages){
          options.messages = messages.reverse() || [];
          res.render('messages/message_feed', options);
        }
    );
  } else {
    res.status(400).send();
  }
};

exports.createMessage = function(req, res){
  var user = req.user;
  var organization = req.get('organization');
  var group = req.get('group');
  var text = req.get('text');
  if (organization && group && text) {
    var message = new Message({
      organization: organization,
      group: group,
      text: text,
      creator: user._id
    });
    message.save(function(err, result){
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(201).send();
      }
    });
  } else {
    res.status(400).send();
  }
}
