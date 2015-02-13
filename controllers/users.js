// Users Controller
var express         = require('express');
var router          = express.Router();
var mongoose        = require('mongoose');
var ObjectId        = require('mongoose').Types.ObjectId;
var User            = mongoose.model('User');
var Post            = mongoose.model('Post');
var Organization    = mongoose.model('Organization');
var config          = require('../config');
var passport        = require('passport');
var jade            = require('jade');
var fs              = require('fs');
var path            = require('path');
var _               = require('underscore');
var _time           = require('../lib/helpers/date_time');
var _trusts         = require('../controllers/trusts');
var _profile        = require('../lib/helpers/profile');
var _organizations  = require('../controllers/organizations');
var activeMembers   = fs.readFileSync(path.join(__dirname +
                      '/../views/profile/profile_members_active.jade'), 'utf8');
var pendingMembers  = fs.readFileSync(path.join(__dirname +
                      '/../views/profile/profile_members_pending.jade'), 'utf8');
var memberCardPath  = path.join(__dirname, '/../views/profile/profile_members_card.jade')
var memberCard      = fs.readFileSync(memberCardPath, 'utf8');
var rejectMail      = fs.readFileSync(path.join(__dirname +
                      '/../views/reject_mail.jade'), 'utf8');
var acceptMail      = fs.readFileSync(path.join(__dirname +
                      '/../views/accept_mail.jade'), 'utf8');
var mandrill        = require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';
var Mixpanel = require('mixpanel');
var mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);

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
              mixpanel.track('Password Reset', user.mixpanelProperties());
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

exports.shortPasswordReset = function(req, res){
  var email = req.body.email || false;
  var password = req.body.password || false;
  console.log(email + ':' + password);
  User.findOne({email: email}, function(err, user){
    if (err) {
      console.log(err);
      res.render('reset', {success: false});
    }
    if (user && password){
      user.password = password;
      if (user.hashPassword()){
        user.save(function(err, result){
          if (err) {
            res.render('reset', {success: false});
          } else {
            res.render('reset', {success: true});
          }
        });
      } else {
        res.render('reset',{success: false});
      }
    } else {
      console.log('missing user or password');
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

exports.updateOrgStatus = function(req, res) {
  var org_id = req.get('org');
  var status = req.get('status');
  if (req.isAuthenticated()) {
    User.findOne({_id: req.params.id}, function(err, user) {
      if (err) { 
        res.status(500).send(err);
      }
      if (user) {
        if (user.userBelongsToOrganization(org_id)) {
          User.findOneAndUpdate({
            _id: user.id,
            org_status: {$elemMatch: { organization: org_id}}
          },
          {
            $set: {'org_status.$.status': status}
          },
          function(err, user) {
            res.status(200).send({message: 'User org_status updated'});
          });
        }
        else {
          res.status(400).send({error: 'User does not have org_status with organization'});
        }
      }
      else {
        res.status(400).send({error: 'User not found'});
      }
    });
  }
  else {
    res.status(401).send({error: 'User must be authenticated, can not process request'});
  }
};

// User Partner Methods (Organizations)

exports.getTrustedLuminariesForUserId = function(userId, next) {
  var trustedUserIds = [];
  _trusts.findTrustsByUserId(userId, function(err, trusts) {
    if (err) {
      next(err);
    }
    if (trusts) {
      _.each(trusts, function(trust, index, list) {
        trustedUserIds.push(trust.to);
      });
      console.log("These are the trusted users: " + trustedUserIds);
      User
      .find({_id: { $in: trustedUserIds}})
      .where('subtype').equals('luminary')
      .exec(function(err, users) {
        if (err) {
          next(err);
        }
        if (users) {
          next(null, users);
        }
        else {
          next({error: "UserId has not trusted Luminaries"});
        }
      });
    }
    else({error: "UserId has no trusts"});
  });
}

// User Authentication Methods

exports.authRequired = function (req, res, next) {
  if (req.isAuthenticated()) {
   return next(); 
 }
  res.redirect('/login')
}

exports.displayLogin = function(req, res) {
  mixpanel.track('Login Page loaded');
  res.render('login/login');
};

exports.handlePrizmLogin = function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err) }
    if (!user) {
      req.session.messages =  [info.message];
      return res.redirect('/login')
    }
    req.logIn(user, function(err) {
      if (err) { 
        mixpanel.track('Login Failure');
        return next(err); 
      }
     
      mixpanel.track('Login Success', user.mixpanelProperties());
      if (user.type == 'institution_verified') {
        _organizations.getNamespaceByOwnerId(user.id, function(err, namespace) {
          if (namespace) {
            return res.redirect('/' + namespace);
          }
        });
      }
      else {
        return res.redirect('/');
      }
    });
  })(req, res, next);
};

exports.handleFacebookLogin = function(req, res, next) {
  // Check to determine if this is orginal auth call to facebook or callback
  if (!req.query.code) {
    // If callback query 'code' is not present request facebook authorization
    passport.authenticate('facebook')(req, res, next);
  }
  else {
    // Handle Facebook callback
    passport.authenticate('facebook', function(err, user, info) {
      if (err) { return next(err) }
      if (!user) {
        req.session.messages =  [info.message];
        return res.redirect('/login');
      }
      req.logIn(user, function(err) {
        if (err) { 
          mixpanel.track('Login Failure');
          return next(err); 
        }
        mixpanel.track('Login Success', user.mixpanelProperties());
        if (user.type == 'institution_verified') {
          _organizations.getNamespaceByOwnerId(user.id, function(err, namespace) {
            if (namespace) {
              return res.redirect('/' + namespace);
            }
          });
        }
        else {
          return res.redirect('/');
        }
      });
    })(req, res, next);
  }
};

exports.handleTwitterLogin = function(req, res, next) {
  // Check to determine if this is orginal auth call to twitter or callback
  if (!req.query.oauth_token) {
    // If callback query 'code' is not present request twitter authorization
    passport.authenticate('twitter')(req, res, next);
  }
  else {
    // Handle Twitter callback
    passport.authenticate('twitter', function(err, user, info) {
      if (err) { 
        return next(err) }
      if (!user) {
        req.session.messages =  [info.message];
        return res.redirect('/login');
      }
      req.logIn(user, function(err) {
        if (err) {
          mixpanel.track('Login Failure'); 
          return next(err); 
        }
        mixpanel.track('Login Success', user.mixpanelProperties());
        if (user.type == 'institution_verified') {
          _organizations.getNamespaceByOwnerId(user.id, function(err, namespace) {
            if (namespace) {
              return res.redirect('/' + namespace);
            }
          });
        }
        else {
          return res.redirect('/');
        }
      });
    })(req, res, next);
  }
};

exports.handleLogout = function(req, res) {
  req.logout();
  mixpanel.track('Logout success');
  res.redirect('/login');
};

// User Profile Methods

var fetchHomeFeed = function(user, params, next){
  if (typeof params === 'function') {
    next = params;
  }
  var limit = params.limit || 25;
  var skip = params.skip || 0;
  user.fetchHomeFeedCriteria(function(err, criteria){
    Post
    .find(criteria)
    .sort({create_date: -1, _id: -1})
    .populate({
      path: 'creator',
      select: User.basicFields()
    })
    .populate({
      path: 'comments.creator',
      select: User.basicFields()
    })
    .skip(skip)
    .limit(limit)
    .exec(function(err, results){
      next(err, results);
    });
  });
};

exports.displayHomeFeed = function(req, res) {
  if (!req.user) {
    res.render('index', { title: 'Prizm App', selected:'home', bodyId: 'body-home' });
  }
  else {
    var id = req.user.id
    User.findOne({_id: ObjectId(id)}, function(err, user) {
      if (err) {
        res.send(400);
      }
      if (user) {
        mixpanel.track('Profile Viewed', user.mixpanelProperties());
        fetchHomeFeed(user, function(err, posts) {
          posts = _time.addTimeSinceFieldToObjects(posts);
          res.render('profile/profile_home', {
            auth: true,
            currentUser: req.user,
            posts: posts
          });
        });
      }
      else {
        res.status(400).send({error: "User can not be found"});
      }
    });
  }
}

exports.displayProfileById = function(req, res) {
  var id = req.params.id
  var auth = false
  var currentUser = {};
  var isCurrent = false;
  var isTrust = false;
  if (req.isAuthenticated()) {
    auth = true;
    currentUser = req.user;
    if (req.params.id == currentUser._id.toString()){
      isCurrent = true;
    }
  }
  User.findOne({_id: ObjectId(id)}, function(err, user) {
    if (err) {
      res.send(400);
    }
    if (user) {
      User.findOne({_id: currentUser._id}, function(err, cu){
        var props = {};
        if (cu){
          props = cu.mixpanelProperties();
        }
        props.viewedProfileFor = user.email;
        mixpanel.track('Profile Viewed', props);
      });
      Post.findPostsForProfileByUserId(user.id, isCurrent, isTrust, function(err, posts) {
        var headerImages;
        if (err) {
          posts = [];
          headerImages = [];
        }
        posts = _time.addTimeSinceFieldToObjects(posts);
        headerImages =_profile.shufflePostImagesForProfileHeader(posts);
        res.render('profile/profile', {
          auth: auth,
          currentUser: currentUser,
          user: user,
          headerImages: headerImages,
          posts: posts
        });
      });
    }
    else {
      res.status(400).send({error: "User can not be found"})
    }
  });
}

// User Members Methods

exports.displayMembers = function(req, res) {
  if (req.accepts('html')) {
    membersHTMLRequest(req, res);
  }
  else if (req.accepts('application/jade')) {
    membersJADERequest(req, res);
  }
  else if (req.accepts('application/json')) {
    membersJSONRequest(req, res);
  }
};

var membersHTMLRequest = function(req, res) {
  // We may want to display differet pages if they pending verification
  var currentUser = req.user;
  if (req.user.type == 'user') {
    res.redirect('/');
  }
  if (req.user.type == 'institution_pending') {
    res.status(400).send({error: 'Status is still pending'});
  }
  if (req.user.type == 'institution_verified') {
    mixpanel.track('Org Members Viewed', {organization: req.user.name});
    Organization
      .getOrganizationByOwnerId(req.params.id, function(err, organization) {
        if (err) {
          res.status(500).send({error: err});
        }
        if (!organization) {
          res.redirect('/');
        }
        else {
          User.findOrganizationMembers({organization: organization.id, status: 'active'}, function(err, members) {
            if (err) {
                res.status(500).send({error: err});
            }
            else {
              res.render('profile/profile_members', {
                auth: true,
                currentUser: currentUser,
                organization: organization,
                members: members});
            }
          });
        }
      });
  }
  else {
    res.status(400).send({error: 'User is unknown type'});
  }
};

var membersJADERequest = function(req, res) {
  var status = req.get('memberStatus');
  if (status == 'active') {
    memberList = activeMembers;
  }
  else if (status == 'pending') {
    memberList = pendingMembers;
  }
  Organization
    .getOrganizationByOwnerId(req.params.id, function(err, organization) {
      if (err) {
        console.log(err);
        res.status(500).send({error: err});
      }
      if (!organization) {
        console.log('no organization');
        res.status(404).send({error: 'Invalid Organization ID'});
      }
      else {
        User.findOrganizationMembers({
          organization: organization.id,
          status: status
        }, function(err, members) {
          if (err) {
              console.log(err);
              res.status(500).send({error: err});
          }
          else {
            var content = jade.render(memberList, {
              filename: memberCardPath,
              members: members
            });
            res.send(content);
          }
        });
      }
    });    
};

var membersJSONRequest = function(req, res) {
  var status = req.get('memberStatus');
  var criteria = {};
  if (status) {
    criteria.status = status;
  }
  Organization
    .getOrganizationByOwnerId(req.params.id, function(err, organization) {
      if (err) {
        console.log('error');
        res.status(500).send({error: err});
      }
      if (!organization) {
        res.status(404).send({error: 'Invalid Organization ID'});
      }
      else {
        criteria.organization = organization.id;
        User.findOrganizationMembers(criteria, function(err, members) {
          if (err) {
            console.log(err);
              res.status(500).send({error: err});
          }
          else {
            res.send(members);
          }
        });
      }
    });
};
