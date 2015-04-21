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
var ObjectId      = require('mongoose').Types.ObjectId; 

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
      User.find({org_status: {$elemMatch: {organization: organization._id, status: 'active'}}}).count(function(err, c){
        options.groupCount = c;
        Message.fetchMessages(
          {
            organization: org,
            group: null 
          },
          function(err, messages){
            console.log('rendering page');
            if (err) console.log(err);
            options.messages = messages?messages.reverse():[];
            _.each(options.messages, function(m, i, l){
              if (_.find(m.likes, function(u){
                return String(u) == String(user._id);
              })) {
                m.liked = true;
              } else {
                m.liked = false;
              }
            });
            res.render('messages/messages', options);
          }
        );     
      });
    
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
        User.find({org_status: {$elemMatch: {organization: organization._id, status: 'active'}}}).count(function(err, c){
          options.groupCount = c;
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
              _.each(options.messages, function(m, i, l){
                if (_.find(m.likes, function(u){
                  return String(u) == String(user._id);
                })) {
                  m.liked = true;
                } else {
                  m.liked = false;
                }
              });
              res.render('messages/messages', options);
            }
           );
        });
       
      } else {
        res.redirect('/');
      }      
    });
  } else {
    res.redirect('/');
  }
};

exports.fetchMessages = function(req, res){
  var group = req.params.group;
  if (group == 'all') group = null;
  var organization = req.get('organization');
  var lastDate = req.get('lastDate');
  var user = req.user;
  var options = {};
  options.currentUser = req.user;
  if (organization) {
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
          var criteria = {
                     };
          if (group) {
            criteria.org_status = {
              $elemMatch: {
                status: 'active',
                groups: {
                  $elemMatch: {
                    $eq: ObjectId(group)
                  }
                }
              }
            }
          } else {
            criteria.org_status = {$elemMatch: {
              status: 'active',
              organization: organization
            }};
          }
          User.find(criteria).count(function(err, c){
            if (err) console.log(err);
            options.count = c;
            options.messages = messages.reverse() || [];
            _.each(options.messages, function(m, i, l){
              if (_.find(m.likes, function(u){
                return String(u) == String(user._id);
              })) {
                m.liked = true;
              } else {
                m.liked = false;
              }
            });
            res.render('messages/message_feed', options);
          });
          
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
  group = group == 'all'?null:group;

  var text = req.get('text');
  if (organization &&  text) {
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

exports.manipulateMessage = function(req, res){
  var user = req.user;
  var mid = req.params.mid;
  var action = req.get('action');
  if (action == 'like') {
    Message.likeMessage(mid, user, function(err, message){
      if (err) {
        res.status(400).send(err);
      }
      res.status(200).send();
    });
  } else if (action == 'unlike') {
    Message.unlikeMessage(mid, user, function(err, message){
      if (err) {
        res.status(400).send(err);
      }
      res.status(200).send();
    });
  }
}

exports.newGroup = function(req, res){
  var user = req.user;
  var criteria = false;
  var options = {};
  if (user.type == 'institution_verified'){
    criteria = {};
    criteria.owner = user._id;
  } else { 
    _.each(user.org_status, function(s, i, l){
      if (s.status == 'active' && s.role == 'leader'){
        criteria = {};
        criteria._id = s.organization._id;
        options.leader = user._id;
      }
    });
  }
  if (criteria) {
    Organization.findOne(criteria, function(err, org){
      options.organization = org;
      User.findOrganizationMembers({organization: org._id, status: 'active'}, 
        org.owner, false, false, function(err, members) {
          options.members = members;
          options.leaders = _.filter(members, function(user){
            var match = false;
            if (user.org_status.length > 0) {
              match = user.org_status[0].role == 'leader';
            }
            return match;
          });
          console.log(options);
          res.render('create/group', options);
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
