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
var Group         = mongoose.model('Group');

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
    .populate({
      path: 'groups',
      model: 'Group'
    })
    .exec(function (err, organization){
      options.currentUser = user;
      options.organization = organization.toObject();
      options.topics = userOrgs[0].groups || [];
      console.log('fetching messages');
      Message.fetchMessages(
        {
          organization: org,
          group: null 
        },
        function(err, messages){
          console.log('rendering page');
          if (err) console.log(err);
          options.messages = messages?messages.reverse():[];
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
    .populate({path: 'groups', model: 'Group'})
    .exec(function(err, organization){
      if (organization) {
        options.topics = organization.groups || [];
        options.organization = organization;
        Message.fetchMessages(
          {
            organization: organization._id,
            group: null 
          },
          function(err, messages){
            if (err) console.log(err);
            options.messages = messages?messages.reverse():[];
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
      group: group == 'all'?null:group
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

exports.newGroup = function(req, res){
  var user = req.user;
  var organization = req.get('organization');
  if (organization) {
    Organization.findOne({_id: organization}, function(err, org){
      User.findOrganizationMembers({organization: org._id, status: 'active'}, 
        org.owner, false, false, function(err, members) {
          var leaders = _.filter(members, function(user){
            return user.org_status[0].role == 'leader';
          });
          res.render('messages/new_group', {members: members, leaders: leaders});
        });
    });
  } else {
    res.status(400).send();
  }
}

exports.addNewGroup = function(req, res){
  var user = req.user;
  var organization = req.get('organization');
  var members = req.body.members;
  var data = {
    name: req.body.name,
    description: req.body.description,
    leader: req.body.leader,
    organization: organization
  };
  Group.newGroup(data, function(err, group){
    if (!err) {
      Organization.findOne({_id: organization}, function(err, org){
        if (org) {
          org.groups.push(group._id);
          org.save(function(err, saved){
            if (err) console.log(err);
          });
        }
      });
      console.log(members);
      User.find({_id: {$in: members}}, function(err, users){
        if (users) {
          console.log('found ' + users.length + ' users');
          _.each(users, function(u, i, l){
            _.each(u.org_status, function(s, c, p){
              if (String(s.organization) == String(group.organization)) {
                if (! _.isArray(s.groups)){
                  s.groups = [];
                }
                s.groups.push(group._id);
                console.log(s);
              }
            });
            u.save(function(err, u){
              if (err) console.log(err);
            });
          });
        }
        res.send(200);
      });
    } else {
      console.log(err);
      res.send(500);
    }  
  });

}
