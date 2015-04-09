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

exports.displayUserMessagesFeed = function(req, res){
  console.log('in request');
  var user = req.user;
  var org = req.params.organization; 
  var options = {
    title: 'Message',
    bodyId: 'messageList',
    topics: [],
    auth: true,
    currentUser: user
  };
  console.log(user.org_status);
  var userOrgs = _.filter(user.org_status, function(status){
    if (status.status != 'active') return false;
    else if (String(status.organization._id) != String(org)) return false
    else return true;
  });
  if (userOrgs.length > 0) {
    console.log('finding org details');
    Organization.findOne({_id: org})
    .populate({
      path: 'owner',
      select: '_id name profile_photo_url'
    })
    .exec(function (err, organization){
      options.currentUser = user;
      options.organization = organization.toObject();
      options.topics = userOrgs[0].groups || [];
      console.log('fetching messages');
      Message.fetchMessages(
        {
          organization: org,
          group: 'all'
        },
        function(err, messages){
          console.log('rendering page');
          options.messages = messages.reverse() || [];
          res.render('messages/messages', options);
        }
      );
    });
  } else {
    res.redirect('/');
  }
};

exports.displayOwnerMessagesFeed = function(req, res){
  var user = req.user;
  var options = {
    title: 'Message',
    bodyId: 'messageList',
    topics: [],
    auth: true,
    currentUser: user
  };
  if (user.type == 'institution_verified') {
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
