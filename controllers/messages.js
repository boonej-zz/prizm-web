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
var Activity      = mongoose.model('Activity');
var Push            = require('../classes/push_notification');
var ObjectId      = require('mongoose').Types.ObjectId; 
var url = require('../lib/helpers/url');
var request = require('request');
var htmlparser = require('htmlparser');
var utils = require('util');
var S = require('string');

var shortFields = function(org) {
return {
    _id: 1, 
    name: 1, 
    profile_photo_url: 1,
    org_status: {
      $elemMatch: {
        organization: org._id,
        status: 'active'
      }
    }
  };
};

exports.displayUserMessagesFeed = function(req, res){
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
      var o = organization.toObject();
      o.groups = _.filter(o.groups, function(group){
        return group.status != 'inactive';
      });
      options.organization = o; 
      if (userOrgs[0].groups) {
        options.topics = _.filter(userOrgs[0].groups, function(group){
          return group.status != 'inactive';
        });
      } else {
        options.topics = [];
      }
      User.find({org_status: {$elemMatch: {organization: organization._id, status: 'active'}}})
      .select(shortFields(organization))
      .populate({path: 'org_status.groups', model: 'Group'})
      .exec(function(err, users){
        options.count = users.length;
        options.members = users;
        
        Message.fetchMessages(
          {
            organization: org,
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
    
    });
  } else {
    res.redirect('/');
  }
};

exports.displayOwnerMessagesFeed = function(req, res){
  var user = req.user;
  var action = req.get('action');
  var create_date = req.get('create_date');
  if (action){
    if (user.type == 'user'){
      var criteria1 = {organization: {$in: []}, group:null, creator:{$ne: user._id}};
      var criteria2 = {organization: {$in: []}, group:{$in: []}, creator:{$ne: user._id}};
      _.each(user.org_status, function(o, i, l){
        if (o.status == 'active'){
          criteria1.organization.$in.push(o.organization._id);
          if (o.groups && o.groups.length > 0){
            criteria2.organization.$in.push(o.organization._id);
            _.each(o.groups, function(g, i, l){
              criteria2.group.$in.push(g._id);
            });
          }
        }
      });
      criteria = {$or:[criteria1, criteria2], create_date: {$gt: create_date}};
      Message.find(criteria).count(function(err, c){
        if (err) res.status(500).send();
        else {
          res.status(200).send({count: c})
        };
      });

    }
  } else {
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
          User.find({org_status: {$elemMatch: {organization: organization._id, status: 'active'}}})
          .select(shortFields(organization))
          .populate({path: 'org_status.groups', model: 'Group'})
          .exec(function(err, users){
            options.count = users.length;
            options.members = users;
            if (organization.groups) {
              options.topics = _.filter(organization.groups, function(group){
                return group.status != 'inactive';
              });
            } else {
              options.topics = [];
            }
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
  }
};

exports.fetchMessages = function(req, res){
  var group = req.params.group;
  if (group == 'all') group = null;
  var organization = req.get('organization');
  var name = req.get('group_name');
  var lastDate = req.get('lastDate');
  var quick = req.get('quick');
  var user = req.user;
  var options = {};
  options.currentUser = req.user;
  if (organization) {
    var criteria = {
      organization: organization,
    };
    if (name){
      criteria.name = name;
    } else {
      criteria.group == 'all'?null:group
    } 
    if (lastDate) {
      criteria.create_date = {$lt: new Date(lastDate)};
    }
    console.log(criteria);
    Group.findOne({_id: group}, function(err, group){
      Message.fetchMessages(
        criteria, 
        function(err, messages){
          var criteria = {
                     };
          if (group) {
            options.groupName = group.name;
            options.groupDescription = group.description;
            criteria.org_status = {
              $elemMatch: {
                status: 'active',
                groups: {
                  $elemMatch: {
                    $eq: group._id
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
          if (lastDate || quick){
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

          } else {
            User.find(criteria)
            .select(shortFields(organization))
            .populate({path: 'org_status.groups', model: 'Group'})
            .exec(function(err, members){
              if (err) console.log(err);
              options.count = members.length;
              options.members = members;
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
              res.render('messages/content_feed', options);
            });
          }
        }
    );
    });
   
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
  var urls = url.urls(text);
  if (organization &&  text) {
    var message = new Message({
      organization: organization,
      group: group,
      text: text,
      creator: user._id
    });
    var save = function(message){
      message.save(function(err, result){
        if (err) {
          res.status(500).send(err);
        } else {
          res.status(201).send();
        }
      });
    };
    if (urls) {
      request({
        uri: urls[0],
        method: 'GET',
        timeout: 10000,
        followRedirect: true,
        maxRedirects: 10
      }, function(error, response, body) {
        var handler = new htmlparser.DefaultHandler(function(err, dom){
          if (err) console.log(err);
          var meta = [];
          var traverse = function(doc) {
            _.each(doc, function(node, i, l){
              if (node.name == 'meta') {
                if (node.attribs.property && node.attribs.property.match('og:')) {
                  meta.push(node.attribs);
                } 
                if (node.attribs.name && node.attribs.name.match('og:')) {
                  meta.push(node.attribs);
                } 
              } 
              if (node.children && node.children.length > 0){
                traverse(node.children);
              }
            });
          };
          traverse(dom);
          if (meta.length > 0){
            var metaData = {image:{}};
            _.each(meta, function(m, i, l){
              var accessor = '';
              if (m.property) accessor = 'property';
              if (m.name) accessor = 'name';
              if (m[accessor] == 'og:image'){
                metaData.image.url = m.content;
              } 
              if (m[accessor] == 'og:image:width') {
                metaData.image.width = m.content;
              }
              if (m[accessor] == 'og:image:height') {
                metaData.image.height = m.content;
              }
              if (m[accessor] == 'og:description'){
                metaData.description = S(m.content).decodeHTMLEntities().s;
              }
              if (m[accessor] == 'og:title'){
                metaData.title = S(m.content).decodeHTMLEntities().s;
              }
              if (m[accessor] == 'og:url'){
                metaData.url = m.content;
              }
              if (m[accessor] == 'og:video:url'){
                metaData.video_url = m.content;
              }
            });
            message.meta = metaData;
          }
          save(message);
        });
        var parser = new htmlparser.Parser(handler);
        parser.parseComplete(body);
      });
    } else {
      save(message);
    }
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
  if (!_.isArray(members)){
    members = [members];
  }
  var data = {
    name: req.body.name,
    description: req.body.description,
    leader: req.body.leader && req.body.leader != ''?req.body.leader:null,
    organization: organization
  };
  Group.newGroup(data, function(err, group){
    if (!err) {
      Organization.findOne({_id: organization}, function(err, org){
        if (org) {
          org.groups.push(group._id);
          org.save(function(err, saved){
            if (err) console.log('Save error: ' + err);
          });
        }
      });
      User.find({_id: {$in: members}}, function(err, users){
        if (users) {
          _.each(users, function(u, i, l){
            _.each(u.org_status, function(s, c, p){
              if (String(s.organization) == String(group.organization)) {
                if (! _.isArray(s.groups)){
                  s.groups = [];
                }
                s.groups.push(group._id);
              }
            });
            u.save(function(err, u){
              if (err) console.log('User save error: ' + err);
              var activity = new Activity({
                from: user._id,
                to: u._id,
                action: 'group_added',
                group_id: group._id
              });
              activity.save(function (err, result){
                if (err) {
                  console.log(err);
                }
                else {
                  new Push('activity', activity, function(result) {
                });
                }
              });

              });
            });
        res.send(200);
    } else {
      console.log(err);
      res.send(500);
    }  
  });
  }
  });
}

exports.modifyGroup = function(req, res){
  var o = req.params.organization;
  var g = req.params.group;
  var u = req.user;
  var v = false;
  Organization.findOne({_id: o}, function(err, org){
    if (org) {
      if (String(org.owner) == String(u._id)){
        v = true;
      } else {
        _.each(u.org_status, function(s, i, l){
          if (s && s.organization){
            if (String(s.organization._id) == String(org._id) 
              && s.status == 'active'){
              v = s.role.toLowerCase() == 'leader';
            }
          }
        });
      }
      if (v){
        Group.update({_id: g}, {$set: req.body}, function(err, group){
          if (!err) {
            res.status(200).send();
          } else {
            console.log(err);
            res.status(500).send();
          }
        });
      } else {
        res.status(401).send();
      }
    } else {
      console.log(err);
      res.status(400).send();
    }
  });
};
