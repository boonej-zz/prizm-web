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
var iPush = require('../classes/i_push');
var Image = require('../lib/helpers/image');

var markRead = function(messages, user_id){
  _.each(messages, function(message){
    var hasRead = false;
    _.each(message.read, function(r){
      if (String(r) == String(user_id)){
        hasRead = true;
      }
    });
    if (!hasRead){
      message.read.push(ObjectId(user_id));
      message.markModified('read');
      message.save(function(err, obj){});
    }
  });
}

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
            markRead(messages, user._id);
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
  var group = req.get('group');
  console.log('display owner message feed');
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
      currentUser: user,
      group: group || false
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
                group: group || null 
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
                markRead(messages, user._id);
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

exports.fetchViewed = function(req, res){
  var group = req.params.group;
  if (group == 'all') group = null;
  var organization = req.get('organization');
  var message_id = req.get('message_id');
  var user = req.user;
  var options = {};
  var criteria = {status: 'active'};
  var match = {};
  if (organization) {
    match.organization = organization;
    match.group = group;
    match.status = active; 
  }
  var oStatus = {$elemMatch: match};
  criteria.org_status = oStatus;
  User.find(criteria)
  .select('_id name profile_photo_url org_status subtype')
  .sort({name: 1})
  .exec(function(err, users){
    Message.findOne({_id: message_id}, function(err, message){
      if (err) console.log(err);
      if (message) {
        _.each(users, function(u){
          u.hasViewed = false;
          _.each(message.read, function(r){
            if (String(r) == String(u._id)){
              u.hasViewed = true;
            }
          });
        });
      }
      options.members = users;
      options.message = message;
      res.render('messages/member_feed', options);
    });
  });
}

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
      criteria.group = group; 
    } 
    if (lastDate) {
      criteria.create_date = {$lt: new Date(lastDate)};
    }
    Group.findOne({_id: group}, function(err, group){
      Message.fetchMessages(
        criteria, 
        function(err, messages){
          if (err) console.log(err);
          messages = messages || [];
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
            markRead(messages, user._id);
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
              markRead(messages, user._id);
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

var processMessageText = function(message, next){
  var urls = url.urls(message.text);
  if (urls && urls.length > 0) {
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
        next(message);
      });
      var parser = new htmlparser.Parser(handler);
      parser.parseComplete(body);
    });
  } else {
    next(message);
  }
};

var fetchTotalMessageCount = function(user_id, org_id, next){
  var countMessages = function(criteria, next){
    Message.find(criteria)
      .select({_id: 1, read: 1})
      .exec(function(err, messages){
        if (messages) {
        var unread = _.reject(messages, function(obj){
          var read = false;
          _.each(obj.read, function(r, i, l){
            if (String(r) == String(user_id)) {
              read = true;
            }
          });
          return read;
        });
        next(unread.length);
        } else {
          next(0);
        }
      });
  };
  User.findOne({_id: user_id})
  .populate({path: 'org_status.groups', model: 'Group'})
  .exec(function(err, user){
    if (user) {
      if (user.type = 'institution_verified') {
        Group.find({organization: org_id, status: {$ne: 'inactive'}}, function(err, groups){
          var groupList = _.pluck(groups, '_id');
          var criteria = {organization: org_id, group: {$in: groupList}};
          countMessages(criteria, next);
        });
      } else {
        var groups = [];
        _.each(user.org_status, function(o,i,l){
          if (String(o.organization) == String(org_id) && o.status == 'active') {
            groups = o.groups;
          }
        });
        groups = _.filter(groups, function(g){
          return g.status != 'inactive';
        });
        groups = _.pluck(groups, '_id');
        var criteria1 = {organization: org_id, group: null};
        var criteria2 = {organization: org_id, group: {$in: groups}};
        var criteria = {$or: [criteria1, criteria2]};
        countMessages(criteria, next);
      }
    } else {
      next(0);
    } 
  });
};


var sendMessageWithMutes = function(user, message, mutes ){
  var send = String(user.id) != String(message.creator._id);
  
  if (send) {
    _.each(mutes, function(m, i, l){
      if (String(m) == String(user._id)){
        send = false;
      }
    });
  }
  if (send){
    fetchTotalMessageCount(user._id, message.organization, function(c){
      console.log('sending');
      if (user.device_token){
        message.prettyText(function(prettyText){
          var messageString = '#';
          var groupName = message.group?'#' + message.group.name:'all';
          if (message.group){
            messageString = messageString + message.group.name + ':';
          } else {
            messageString = messageString + 'all:';
          }
          if (message.text) {
            messageString = messageString = message.creator.name + '\n' 
              + prettyText;
          } else {
            messageString = message.creator.name + ' just posted an image in ' 
              + groupName + '.';
          }
          iPush.sendNotification({
            device: user.device_token,
            alert: messageString,
            payload: {_id: message._id},
            badge: c 
          }, function(err, result){
            if (err) console.log(err);
            else console.log('Sent push'); 
          });      
        });
      }
    }); 
  } else {
    console.log('not sending to ' + user.name);
  }
}

var notifyUsers = function(m){
  Message.findOne({_id: m._id})
  .populate({path: 'creator'})
  .populate({path: 'organization', select: '_id name owner'})
  .populate({path: 'organization.owner', select: '_id name'})
  .populate({path: 'group'})
  .exec(function(err, message){
    var organization = message.organization;
    if (organization) {
      var criteriaa = {_id: organization.owner._id};
      var criteriab = {};  
      if (message.group){
        criteriab.org_status = {$elemMatch: {status: 'active', organization: organization._id,  groups: {$elemMatch: {$eq: message.group}}}};
      } else {
        criteriab.org_status = {$elemMatch: {organization: organization._id, status: 'active'}};
      }
      var criteria = {$or: [criteriaa, criteriab]};
      User.find(criteria)
        .populate({path: 'org_status.organization', model: 'Organization'})
        .populate({path: 'org_status.organization.groups', model: 'Group'})
        .exec(function(err, users){
          _.each(users, function(user, i, l){
              var send = true;
              sendMessageWithMutes(user, message, organization.mutes);
          });
      });
  }
  });

}

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
    var save = function(message){
      message.save(function(err, result){
        if (err) {
          res.status(500).send(err);
        } else {
          notifyUsers(message);
          res.status(201).send();
        }
      });
    };
    processMessageText(message, save);
  } else if (organization){
    Image.uploadMessageImage(req, function(err, path, fields){
      if (err) {
        console.log(err);
        res.status(500).send(err);
        return;
      }
      if (path) {
        var data = {creator: user._id, image_url: path, organization: organization, group: group};
        var message = new Message(data);
        message.save(function(err, data){
          if (err) console.log(err);
          res.status(200).send(data);
        });
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
  var action = req.get('action');
  var name = req.get('name');
  var organization = req.get('organization');
  var options = {};
  if (organization && name && action == 'edit'){
    criteria = {
      organization: organization,
      name: name
    };
    Organization.findOne({_id: organization}, function(err, org){
      if (err) {
        console.log(err);
        res.send(400);
        return;
      } 
      User.findOrganizationMembers({organization: org._id, status: 'active'}, 
          org.owner, false, false, function(err, members) {
        var options = {};
        options.organization = org; 
        options.leaders = _.filter(members, function(user){
          var match = false;
          if (user.org_status.length > 0) {
            match = user.org_status[0].role == 'leader';
          }
          return match;
        });
        _.each(members, function(m, i, l) {
          _.each(m.org_status, function(o, ind, li){
            if (String(o.organization) == String(org._id)){
              _.each(o.groups, function(group, index, list){
                if (String(group.name) == String(name)){
                  m.inGroup = true;
                }
              });
            }
          });
        });
        options.members = members;
        Group.findOne(criteria, function(err, group){
          options.group = group; 
          options.edit = true;
          res.render('create/group', options);
        });
      });

    });
    
  } else {
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
}

exports.updateGroup = function(req, res){
  var groupID = req.params.group_id;
  var currentUser = req.user;
  var organization = req.get('organization');
  var members = req.body.members;
  if (members && !_.isArray(members)){
    members = [members];
  }
  var data = {
    name: req.body.name,
    description: req.body.description,
    leader: req.body.leader && req.body.leader != ''?req.body.leader:null,
    organization: organization
  };
  if (req.body.name && !req.body.description && !req.body.leader){
    data = {name: req.body.name};
  }
  Group.findOneAndUpdate({_id: groupID}, data, function(err, result){
    if (err) {
      console.log(err);
      res.status(400).send();
      return;
    }
    if (members) {
      var criteria = {org_status: {$elemMatch: {organization: organization, status:'active'}}};
      User.find(criteria, function(err, users){
        if (err) console.log(err);
        if (users){
          _.each(users, function(user){
            var inMembers = _.find(members, function(item){
              return String(item) == String(user._id);
            });
            _.each(user.org_status, function(status){
              if (String(status.organization) == String(organization)){
                var groupIndex = -1;
                _.each(status.groups, function(group, index){
                  if (String(group) == String(result._id)) {
                    groupIndex = index;
                  }
                }); 
                if (groupIndex == -1) {
                  if (inMembers) {
                    status.groups.push(result._id);
                    var activity = new Activity({
                      from: currentUser._id,
                      to: user._id,
                      action: 'group_added',
                      group_id: result._id
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
                  } 
                } else {
                  if (!inMembers){
                    status.groups.splice(groupIndex, 1);
                  }
                }
              }
            });
            user.save(function(err, u){
              if (err) console.log(err);
            });
          });
        }
      });
    }
    res.status(200).send(result);
  });
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

exports.deleteMessage = function(req, res){
  var user = req.user;
  var message_id = req.params.message_id;
  Message.findOne({_id: message_id}, function(err, message){
    if (err) console.log(err);
    if (!message){
      res.status(400).send('invalid request');
      return;
    }
    if (String(message.creator) != String(user._id) && user.type != 'institution_verified') {
      res.status(401).send('invalid permissions');
      return;
    }
    Message.deleteMessage(message_id, function(err, result){
      if (err) console.log(err);
      if (!result) {
        res.status(500).send('server error');
      }
      res.status(200).send(result);
    });
  });
};

exports.updateMessage = function(req, res){
  var user = req.user;
  var message_id = req.params.message_id;
  var text = req.get('text');
  Message.findOne({_id: message_id}, function(err, message){
    if (err) console.log(err);
    if (!message){
      res.status(400).send('invalid request');
      return;
    }
    if (String(message.creator) != String(user._id) && user.type != 'institution_verified') {
      res.status(401).send('invalid permissions');
      return;
    }
    message.text = text;
    processMessageText(message, function(message){
      message.save(function(err, message){
        if (err) {
          console.log(err);
          res.status(500).send('server error');
          return;
        }
        res.status(200).send(message);
      });
    });
  });
}

exports.showMessageViewOverlay = function(req, res){
  var messageID = req.params.message_id;
  Message.findOne({_id: messageID})
  .populate({path: 'read', model: 'User'})
  .exec(function(err, message){
    if (err) console.log(err);
    if (message){
      var users = message.read;
      var readList = _.pluck(users, '_id');
      console.log(readList);
      var criteria = {};
      criteria.status = 'active';
      criteria.organization = message.organization;
      if (message.group){
        criteria.groups = message.group;
      }
      User.find({org_status: {
        $elemMatch: criteria 
      }, _id: {$nin: readList}}, function(err, unread){
        if (err) console.log(err);
        if (unread){
          var options = {};
          options.read = users;
          options.unread = unread;
          res.render('overlays/message_views', options);
        } else {
          res.status(500).send('server error');
        }
      });
    } else {
      res.status(400).send('bad request');
    }
  });
}
