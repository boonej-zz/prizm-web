// Organizations Controller
var express       = require('express');
var router        = express.Router();
var mongoose      = require('mongoose');
var ObjectId      = require('mongoose').Types.ObjectId;
var User          = mongoose.model('User');
var Post          = mongoose.model('Post');
var Organization  = mongoose.model('Organization');
var Trust         = mongoose.model('Trust');
var Theme         = mongoose.model('Theme');
var Invite        = mongoose.model('Invite');
var _users        = require('../controllers/users');
var _posts        = require('../controllers/posts');
var _stripe       = require('../controllers/stripe');
var _time         = require('../lib/helpers/date_time');
var _profile      = require('../lib/helpers/profile');
var _image        = require('../lib/helpers/image');
var path          = require('path');
var Mixpanel      = require('mixpanel');
var mixpanel      = Mixpanel.init(process.env.MIXPANEL_TOKEN);
var _             = require('underscore');
var jade          = require('jade');
var config 			= require('../config');
var mandrill 		= require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';

var inviteMail    = path.join(__dirname, '/../views/mail/invite_mail.jade');
var Notification  = mongoose.model('Notification');
var sms = require('../classes/sms');
var SMS = mongoose.model('SMS');
var util = require('util');
var moment = require('moment');
var Image = require('../lib/helpers/image');
var uuid = require('node-uuid');

// Organizations Methods
exports.displayOrganization = function(req, res) {
  var name = req.params.name;
  var auth = false;
  var currentUser = {};
  var isCurrent = false;
  var isTrust = false;
  if (req.isAuthenticated()) {
    auth = true;
    currentUser = req.user;
  }
  Organization.findOne({namespace: name}, function(err, organization) {
    if (err) {
      console.log(err);
      res.send(404);
    }
    else if (organization) {
      User.findOne({_id: ObjectId(organization.owner)}, function(err, user) {
        if (err) {
          console.log(err);
          res.send(404);
        }
        mixpanel.track('Organization Viewed', user.mixpanelProperties());
        if (user) {
          _users.getTrustedLuminariesForUserId(user.id, function(err, luminaries) {
            if (err) {
              luminaries = [];
            }
            Post.findPostsForProfileByUserId(user.id, false, false, function(err, posts) {
              var headerImages;
              if (err) {
                posts = [];
                headerImages = [];
              }
              var showMembers = String(currentUser._id) == String(user._id);
              posts = _time.addTimeSinceFieldToObjects(posts);
              if (req.user) {
                _.each(posts, function(post, idx, list){
                  post.liked = false;
                  _.each(post.likes, function(like, index, listb){
                    if (String(like._id) == String(req.user._id)){
                      post.liked = true
                    };
                  });
                });
              }        

              headerImages = _profile.shufflePostImagesForProfileHeader(posts);
              res.render('profile/profile', {
                bodyId: 'profile',
                auth: auth,
                currentUser: currentUser,
                organization: organization,
                luminaries: luminaries,
                user: user,
                headerImages: headerImages,
                posts: posts,
                showMembers: showMembers
              });
            });
          });
        }
      });
    }
    else {
      res.send(404);
    }
  });
}

exports.getNamespaceByOwnerId = function(owner_id, next) {
  Organization.findOne({owner: ObjectId(owner_id)}, function(err, organization) {
    if (err) {
      next(err);
    }
    if (organization) {
      next(null, organization.namespace);
    }
    else {
      next(null, false);
    }
  });
};

var verifyOrgCode = function(req, res) {

  var code = req.get('data');
  console.log('verifying... ' + code);
  Organization.findOne({code: code}, function(err, org) {
    if (err) {
      res.status(500).send({error: err});
    }
    if (org) {
      res.status(403).send({error: 'Already in use'});
    }
    else {
      mixpanel.track('New organization code verified', req.user.mixpanel);
      res.status(200).send({
        success: 'Code is available',
        code: code
      });
    }
  });
}

var verifyOrgNamespace = function(req, res) {

  var namespace = req.get('data');
  Organization.findOne({namespace: namespace}, function(err, org) {
    if (err) {
      res.status(500).send({error: err});
    }
    if (org) {
      console.log(org);
      res.status(403).send({
        error: 'The desired namespace is currently in use by another organization'
      });
    }
    else {
      mixpanel.track('New namespace found', req.user.mixpanel);
      res.status(200).send({
        success: 'Namespace is available',
        namespace: namespace
      });
    }
  });
}

var displayRegistrationPage = function(req, res) {
  Theme.find(function(err, themes) {
    if (err) {
      themes = []
    }
    mixpanel.track('Viewed payments page.', req.user.mixpanel);
    res.render('registration/registration_org', {
      bodyId: 'payments',
      themes: themes
    });
  });
}

// exports.uploadPhoto = function (req, res) {
//   if (req.accepts('application/json')) {
//     console.log('json req...')
//   }
//   console.log("action: " +req.get('action'));
//   console.log("Uploading photo...");
//   var userId = req.params.id;
//   console.log(userId);
//   _image.uploadPhoto(req, res, userId, function(err, url) {
//     if (err) {
//       res.status(500).send({error: err});
//     }
//     if (url) {
//       res.status(200).send({
//         success: 'Uploaded successfully',
//         url: url
//       });
//     }
//   });
// }

exports.displayOrgRegistration = function(req, res) {
  var action = req.get('action');
  if (req.user.type == 'institution_verified') {
    mixpanel.track('Entered partner setup', req.user.mixpanel);
    if (req.accepts('html')) {
      displayRegistrationPage(req, res);
    }
    if (req.accepts('application/json')) {
      console.log('req accepts json...');
      console.log(req.get('action'));
      if (action == 'checkCode') {
        verifyOrgCode(req, res);
      }
      if (action == 'checkNamespace') {
        verifyOrgNamespace(req, res);
      }
    }
  }
  else {
    res.send('Partner account must be verified before proceeding');
  }
}

exports.updateOrg = function (req, res) {
  var action = req.query.action;
  var userId = req.params.id;

  if (action == 'uploadPhoto') {
    var settings = {
      userId: userId
    };
    
    _image.uploadImage(req, res, settings, function(err, url) {
      if (err) {
        res.status(500).send({error: err});
      }
      if (url) {
        mixpanel.track('Partner image uploaded.', req.user.mixpanel);
        res.status(200).send({
          success: 'Uploaded successfully',
          url: url
        });
      }
    });
  };

  if (action == 'createStripeAccount') {
    _stripe.createCustomerAccount(req, res, function(err, customer) {
      if (err) {
        res.status(500).send({error: err});
      }
      if (customer) {
        mixpanel.track('Added credit card data.', req.user.mixpanel);
        res.status(200).send({
          success: 'Stripe customer account created',
          customer: customer
        });
      }
    });
  };

  if (action == 'createOrg') {
    var code = req.get('code');
    var namespace = req.get('namespace');
    var welcomeImage = req.get('welcomeImage');
    var stripeId = req.get('stripeId');
    var theme = req.get('theme');

    User.findOne({_id: userId}, function(err, owner) {
      if (err) {
        res.status(500).send({error: err});
      }
      if (owner) {
        org = new Organization({
          owner: owner,
          namespace: namespace,
          code: code,
          name: owner.name ? owner.name : owner.first_name,
          welcome_image_url: welcomeImage,
          theme: ObjectId(theme),
          stripe_id: stripeId
        });
        owner.theme = ObjectId(theme);
        owner.save(function(err, res){
          if (err) console.log(err);
        });
        org.save(function(err, org) {
          if (err) {
            res.status(500).send({error: err});
          }
          if (org) {
            mixpanel.track('Partner setup complete', req.user.mixpanel);
            res.status(200).send({success: org});
          }
        });
      }
      else {
        res.status(400).send({error: 'Invalid user id'});
      }
    });
  };
}

exports.renderCSVModal = function(req, res){
  res.render('create/csv');
}

exports.exportCSV = function(req, res){
  var user = req.user;
  var members = [];
  var fields = req.query.fields;
  if (_.isArray(fields)){
    fields = fields.join(',');
  }
  fields = fields.split(',');
  var fieldParams = {};
  _.each(fields, function(f, i, l){
    if (f == 'address') {
      fieldParams.city = 1;
      fieldParams.state = 1;
      fieldParams.zip_postal = 1;
    } else if (f == 'social') {
      fieldParams.followers_count = 1;
      fieldParams.following_count = 1;
      fieldParams.posts_count = 1;
    } else {
      fieldParams[f] = 1;
    }
  });
  Organization.findOne({owner: user._id}, function(err, org){
    if (org){
      Trust.find({from: user._id, status: 'accepted'}, function(err, trusts){
        if (trusts) {
          members = _.pluck(trusts, 'to');
        }
        User.find({
          $or: [
            {_id: {$in: members}},
            {org_status: {$elemMatch: {organization: org._id, status: 'active'}}}
          ]
        })
        .select(fieldParams)
        .populate({path: 'interests', model: 'Interest'})
        .exec(function(err, users){
          var body = '';
          _.each(users, function(user, idx, list){
            var raw = user.toObject();
            var head = false;
            if (body == '') {
              head = [];
              for (var prop in fieldParams) {
                if (prop != '_id')
                  head.push(prop);
              }
              head = head.join(',');
              head = head.concat('\n');
            }
            var line = [];
            for (var prop in fieldParams) {
              if (prop == 'interests') {
                var interests = _.pluck(raw[prop], 'text');
                line.push(interests.join(' '));
              }
              else if (prop != '_id')
                line.push(raw[prop]);
            }
            line = line.join(',');
            line = line.concat('\n');
            if (head) {
              body = body.concat(head);
            }
            body = body.concat(line);
          });
          res.status(200);
          res.contentType('application/octet-stream');
          res.send(body);
        });
      });
    } else {
      response.status(500).send(error);
    }
  });
};

exports.addMembers = function(req, res){
  var user = req.user;
  var orgId = req.params.id;
  console.log(orgId);
  Organization.findOne({
    _id: orgId
  })
  .populate({path: 'groups', model: 'Group'})
  .exec(function(err, org){
    if (err) {
      console.log(err);
    }
    if (org){
      Invite.find({
        organization: orgId,
        status: 'sent'
      })
      .exec(function(err, invites){
        invites = invites||[];
        var options = {
          organization : org,
          currentUser  : user,
          invites      : invites,
          groups       : org.groups || []
        };
        res.render('create/member', options);
      });
    }else {
      res.status(400).send();
    }
  });
};

exports.createInvites = function(req, res) {
  console.log('in request');
  var user = req.user;
  var orgId = req.params.id;
  var addresses = req.body.invites;
  console.log(orgId);
  console.log(addresses);
  addresses = addresses.replace(/\n/g, ';');
  addresses = addresses.replace(/,/g, ';');
  addresses = addresses.replace(/\s+/g, ';');
  addresses = addresses.split(';');
  _.each(addresses, function(a, i, l){
    a = a.replace(/\s/g, '');
  });
  addresses = _.uniq(addresses);
  console.log(addresses);
  Organization.findOne({_id: orgId})
  .exec(function(err, org){
    if (err) {
      console.log(err);
    }
    if (org) {
      var results = [];
      Invite.find({address: {$in: addresses}, organization: org._id})
      .exec(function(err, addys){
        console.log(addys);
        _.each(addys, function(a, i, l){
          var idx = _.indexOf(addresses, a.address);
          console.log(idx);
          if (idx > -1){
            addresses.splice(idx, 1);
            console.log(addresses);
          } 
          if (a.status == 'unsent') {
            console.log('unsent');
            results.push(a);
          } else if (a.status == 'cancelled') {
            console.log('cancelled');
            a.status == 'unsent';
            results.push(a);
          } else if (a.status == 'sent') {
            console.log('sent');
          }

        });
        var r = /^\S+@\S+\.\S+$/i;
        _.each(addresses, function(a, i, l){
          if (r.test(a)){
            var invite = new Invite({
              organization: org._id,
              address: a,
              status: 'unsent'
            });
            invite.save(function(err, result){
              if (err) console.log(err);
            });
            results.push(invite);
          }
        });
        res.render('create/invites', {invites: results});
      }); 
    } else {
      res.status(400).send();
    }
  });
};

exports.sendInvites = function(req, res){
  console.log('in request');
  var user = req.user;
  var orgId = req.params.id;
  var invites = req.body.invites;
  var group = req.body.group;
  console.log(group);
  console.log(invites);
  if (!_.isArray(invites)){
    invites = invites.split(',');
  }
  Organization.findOne({_id: orgId}, function (err, org){
    if (err) console.log(err);
    if (org){
      Invite.find({_id: {$in: invites}}, function(err, objects){
        if (err) console.log(err);
        if (objects) {
          console.log('have invites');
          _.each(objects, function(o, i, l) {
            o.status = 'sent';
            o.group = group || null;
            o.save (function(err, result){
              if (err) console.log(err);
              var mail = jade.renderFile(inviteMail, {org: org, invite: result});
              mandrill(mandrillEndpointSend, {
                message: {
                  to: [{email: o.address}],
                  from_email: 'info@prizmapp.com',
                  from_name: 'Prizm',
                  subject: 'You\'ve been invited to join Prizm!',
                  html: mail  
                }}, function (err, response){
                  if (err) console.log(err);
                });
            });
          });
          res.render('create/invites', {invites: objects});
        } else {
          res.status(400).send();
        } 
      });
    } else {
      res.status(400).send();
    }
  });
};

exports.deleteInvite = function(req, res){
  var orgID = req.params.org_id;
  var inviteID = req.params.invite_id;
  var user = req.user;
  Invite.findOne({_id: inviteID})
  .populate({path: 'organization'})
  .exec(function(err, invite){
    if (err) console.log(err);
    if (invite){
      if (String(invite.organization.owner) == String(user._id)) {
        invite.status = 'cancelled';
        invite.save(function(err, result){
          if (err)console.log(err);
          res.status(200).send();
        });
      } else {
        res.status(401).send();
      }
    } else {
      res.status(400).send();
    }
  });

};

exports.resendInvite = function(req, res){
  console.log('in request');
  var inviteID = req.params.invite_id;
  console.log(inviteID);
  Invite.findOne({_id: inviteID})
  .populate({path: 'organization'})
  .exec(function(err, invite){
    if (err) console.log(err);
    console.log('found invite');
    if (invite) {
       var mail = jade.renderFile(inviteMail, {org: invite.organization, invite: invite});
        mandrill(mandrillEndpointSend, {
        message: {
          to: [{email: invite.address}],
          from_email: 'info@prizmapp.com',
          from_name: 'Prizm',
          subject: 'You\'ve been invited to join Prizm!',
          html: mail  
        }}, function (err, response){
          if (err) console.log(err);
        });
        res.status(200).send();

    } else {
      res.status(400).send();
    }
  });

};

exports.showNotificationForm = function(req, res){
  var user = req.user;
  var criteria = false;
  console.log(user.type);
  if (user.type == 'institution_verified') {
    criteria = {};
    criteria.owner = user._id;
  } else {
    var org_id = false;
    _.each(user.org_status, function(o){
      if (o.role == 'leader' && o.status == 'active') {
        org_id = o.organization;
      } 
    });
    if (org_id) {
      criteria = {};
      criteria._id = org_id;
    }
  }
  console.log(criteria);
  if (criteria){ 
    Organization.findOne(criteria)
    .populate({path: 'groups', model: 'Group'})
    .exec(function(err, org){
      if (err) console.log(err);
      if (org) {
        User.findOrganizationMembers({organization: org._id, status: 'active'}, org.owner, false, false, function(err, members){
          var options = {members: members, organization: org, sender: user};
          res.render('create/notification', options);
        });
      } else {
        res.status(400).send();
      }
    });
  } else {
    res.status(403).send('Forbidden');
  }
};

exports.createNotification = function(req, res){
  var process = function(members, body, user, res){
   _.each(members, function(to){
    console.log('sending to ' + to);
    var note = Notification.create({
      from: user._id,
      to: to,
      type: body.type,
      title: body.title,
      text: body.text
    }, function(err, n){
      notes.push(n);
    });
    });
   res.send(notes);
  };
  var user = req.user;
  var body = req.body;
  var notes = [];
  console.log(body);
  var members = _.isArray(body.members)?body.members:[body.members];
  if (body.group) {
    User.find({org_status: 
      {$elemMatch: 
        {groups: body.group, status: 'active'}
      }
    }, function (err, users){
      if (users) {
        _.each(users, function(u){
          members.push(String(u._id));
        });
      }
      process(members, body, user, res); 
    });
  } else {
    process(members, body, user, res);
  }

};

exports.renderNotificationsPage = function(req, res){
  var user = req.user;
  if (user.type == 'institution_verified') {
  Notification.refreshMessageStatus(user, function(err, sms){
    Organization.findOne({owner: user._id})
    .exec(function(err, org){
      var grouped = _.groupBy(sms, function(o){
        return o.type + '&|&' + o.title + '&|&' + o.text;
      });
      var items = [];
      for (var key in grouped){
        var item = {};
        var itemA = key.split('&|&');
        item.type = itemA[0];
        item.title = itemA[1];
        item.text = itemA[2];
        var date = grouped[key][0].create_date;
        item.date = moment(date).format('M/D/YYYY');
        item.time = moment(date).format('h:mm A');
        item.key = key;
        item.unique = String(uuid.v1())
        if (item.type == 'sms') {
          item.type = item.type.toUpperCase();
          var delivered = _.filter(grouped[key], function(o){
            var r = false;
            if (o.sms &&( o.sms.status == 'delivered' || o.sms.status == 'sent')){
              r = true;
            } 
            return r;
          });
          item.delivered = delivered.length;
        } else {
          item.type = item.type.substr(0, 1).toUpperCase() + item.type.substr(1);
          item.delivered = false;
        }
        console.log(item);
        items.push(item);
      }
      res.render('notifications/main', {
        bodyId: 'notifications',
        currentUser: user, 
        auth: true, 
        org: org, 
        notes: grouped,
        items: items,
        title: 'Notifications'
      });
    });
  });
  } else {
    res.status(403).send('Unauthorized');
  }
};

exports.renderPartnerSettings = function(req, res) {
   var user = req.user; 
   var options ={
        bodyId: 'partner-settings',
        currentUser: user, 
        auth: true, 
        title: 'Settings'
    }
   Organization.findOne({owner: user._id})
   .populate({path: 'theme'})
   .exec(function(err, org){
     options.org = org;
     res.render('settings/partner', options);
   });
}

exports.updateSettings = function(req, res){
  var user = req.user;
  var action = req.get('action');
  var organization = req.params.org_id;
  if (action == 'branding'){
    var allowed = ['namespace', 'reply_to', 'display_name'];
    Image.uploadSettings(req, function(err, path, fields){
      Organization.findOne({_id: organization}, function(err, org){
        if (org) {
          if (String(org.owner) == String(user._id)){
            for (var prop in fields){
              if (_.indexOf(allowed, prop) != -1){
                var value = fields[prop][0];
                org[prop] = value;
              }
            }
            if (path) org.logo_url = path;
            org.save(function(err, org){
              if (err) res.status(500).send(err);
              else res.status(200).send(org);
            });
        } else {
          res.status(403).send('Unauthorized');
        }
        }
      });
    });
  } else if (action == 'theme'){
    var theme = req.body.theme;
    Theme.findOne({background_url: theme}, function(err, t){
      console.log(t);
      Organization.findOne({_id: organization}, function(err, org){
        if (org && (String(org.owner) == String(user._id))){
          var th = t?t._id:null;
          org.theme = th;
          org.save(function(err, o){
            User.find({$or: [{org_status: {$elemMatch:{organization: org._id, status: 'active'}}}, {_id: org.owner}]})
            .exec(function(err, users){
              _.each(users, function(u){
                u.theme = th;
                u.save(function(err, r){
                  if (err) console.log(err);
                });
              });
            });
            res.status(200).send(o);
          });
        } else {
          res.status(403).send('Forbidden');
        }
      });
    });
  } else if (action == 'welcome'){
    Image.uploadSettings(req, function(err, path, fields){
      Organization.findOne({_id: organization}, function(err, org){
        if (org) {
          org.welcome_image_url = path;
          org.save(function(err, o){
            if (err) {
              console.log(err);
              res.status(500).send(err);
            } else {
              res.status(200).send(o);
            }
          });
        } else {
          res.status(403).send('Forbidden');
        }
      });
    });
  } else if (action == 'follow'){
    Organization.findOne({_id: organization}, function(err, org){
      if (org) {
        var follow = req.body.follow;
        if (!_.isArray(follow)){
          follow = [follow];
        }
        var wtf = {
          luminaries: false,
          org_luminaries: false,
          ambassadors: false,
          leaders: false
        };
        _.each(follow, function(f){
          switch(f){
            case 'pl':
              wtf.luminaries = true;
              break;
            case 'ol':
              wtf.org_luminaries = true;
              break;
            case 'l':
              wtf.leaders = true;
              break;
            case 'a':
              wtf.ambassadors = true;
              break;
            default:
              break;
          }
        });
        org.who_to_follow = wtf;
        org.save(function(err, o){
          if (err) {
            console.log(err);
            res.status(500).send(err);
          } else {
            res.status(200).send(o);
          }
        });
      } else {
        res.status(403).send('Forbidden');
      }
    });
  } else if (action == 'featured') {
    Organization.findOne({_id: organization}, function(err, org){
      if (org) {
        var featured = req.body.featured;
        if (!_.isArray(featured)){
          featured = [featured];
        }
        var fe = {
          partners: false,
          luminaries: false,
          ambassadors: false,
          leaders: false
        };
        _.each(featured, function(f){
          switch(f){
            case 'pl':
              fe.luminaries = true;
              break;
            case 'p':
              fe.partners = true;
              break;
            case 'l':
              fe.leaders = true;
              break;
            case 'a':
              fe.ambassadors = true;
              break;
            default:
              break;
          }
        });
        org.featured = fe;
        org.save(function(err, o){
          if (err) {
            console.log(err);
            res.status(500).send(err);
          } else {
            res.status(200).send(o);
          }
        });
      } else {
        res.status(403).send('Forbidden');
      }
    });

  }
}

exports.displayNewMessage = function(req, res){
  var user = req.user;
  Organization.findOne({owner: user._id})
  .populate({path: 'groups', model: 'Group'})
  .exec(function(err, org){
    if (org) {
      res.render('create/message', {organization: org});
    } else {
      if (err) console.log(err);
      res.status(500).send('Forbidden');
    }
  });
}
