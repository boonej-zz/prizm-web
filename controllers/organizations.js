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
  }, function(err, org){
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
          invites      : invites
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
  var addresses = req.get('invites');
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
  var invites = req.get('invites');
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
            var mail = jade.renderFile(inviteMail, {org: org, invite: o});
            o.status = 'sent';
            o.save (function(err, result){
              if (err) console.log(err);
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
       var mail = jade.renderFile(inviteMail, {org: invite.organization});
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
