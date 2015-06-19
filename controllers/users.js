// Users Controller
var express         = require('express');
var router          = express.Router();
var mongoose        = require('mongoose');
var ObjectId        = require('mongoose').Types.ObjectId;
var User            = mongoose.model('User');
var Post            = mongoose.model('Post');
var Organization    = mongoose.model('Organization');
var Interest        = mongoose.model('Interest');
var Activity        = mongoose.model('Activity');
var Insight         = mongoose.model('Insight');
var Trust           = mongoose.model('Trust');
var Invite          = mongoose.model('Invite');
var Push            = require('../classes/push_notification');
var config          = require('../config');
var passport        = require('passport');
var jade            = require('jade');
var fs              = require('fs');
var path            = require('path');
var _               = require('underscore');
var _time           = require('../lib/helpers/date_time');
var _trusts         = require('../controllers/trusts');
var _profile        = require('../lib/helpers/profile');
var _mail           = require('../lib/helpers/mail');
var _image          = require('../lib/helpers/image');
var _organizations  = require('../controllers/organizations');
var validateEmail   = require('../utils').validateEmail;
var _utils          = require('../utils.js');
var path = require('path');
var util = require('util');
var profileFollow        = path.join(__dirname, '/../views/profile/profile_follow.jade');
var memberCardPath       = path.join(__dirname, '/../views/profile/profile_members_card.jade');
var profileNotifications = path.join(__dirname, '/../views/profile/profile_activity_notifications.jade');
var profileRequests      = path.join(__dirname, '/../views/profile/profile_activity_requests.jade');
var memberCard      = fs.readFileSync(memberCardPath, 'utf8');
var rejectMail      = fs.readFileSync(path.join(__dirname +
                      '/../views/mail/reject_mail.jade'), 'utf8');
var acceptMail      = fs.readFileSync(path.join(__dirname +
                      '/../views/mail/accept_mail.jade'), 'utf8');
var mandrill        = require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';
var Mixpanel        = require('mixpanel');
var mixpanel        = Mixpanel.init(process.env.MIXPANEL_TOKEN);
var InsightTarget = mongoose.model('InsightTarget');
var moment = require('moment');
var baseMail = path.join(__dirname, '/../views/mail/base_template.jade');

var iPush = require('../classes/i_push');
var ownerGreeting = 'Dear %s,';
var ownerBody1 = '%s has requested to join %s\'s Prizm group. Please go to your admin page <a href="https://www.prizmapp.com/profile/members">here</a> to approve or deny.';
var ownerBody1Alt = '%s has just joined %s\'s Prizm group. Please go to your admin page <a href="https://www.prizmapp.com/profile/members">here</a> to review your members.';
var ownerClosing = 'Thank you,';
var ownerPush = '%s has requested to join your Prizm group. Please go to your admin page to approve or deny.';
var ownerPushAlt = '%s has just joined your Prizm group. Please go to your admin page to review your members.';

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

exports.getUserProps = function(req, res){
  if (req.get('process') == 'analytics'){
    var user = req.user;
    res.status(200).send(req.user.heap); 
  } else {
    res.send(400);
  }
}

exports.shortPasswordReset = function(req, res){
  var type = req.body.email?'admin':'web';
  var email = req.body.email || false;
  var password = req.body.password || false;
  var u = req.user;
  var criteria = {};
  if (type=='web') {
    criteria._id = u._id;
  } else {
    var process = false;
    console.log(req.subdomains);
    _.each(req.subdomains, function(d){
      if (d == 'admin') process = true;
    });
    if (process){
      criteria.email = email;
    }
  }
  if (criteria._id || criteria.email) {
  User.findOne(criteria, function(err, user){
    if (err) {
      console.log(err);
      if (type == 'web') {
        res.status(400).send();
      } else {
        res.render('reset', {success: false});
      }
    }
    if (user && password){
      user.password = password;
      if (user.hashPassword()){
        user.save(function(err, result){
          if (err) {
            if (type == 'web') {
              res.status(500).send();
            } else {
              res.render('reset', {success: false});
            }
          } else {
            if (type == 'web') {
              res.status(200).send(true);
            } else {
              res.render('reset', {success: true});
            }
          }
        });
      } else {
        if (type == 'web') {
          res.status(400).send();
        } else {
          res.render('reset',{success: false});
        }
      }
    } else {
      if (type=='web') {
        res.status(400).send();
      } else {
        console.log('missing user or password');
        res.render('reset', {success: false});
      }
    }
  });
  }
};

exports.fetchUsers = function(req, res){
  var limit = req.query.limit || 50;
  var fields = req.fields || false;
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
            res.render('error', err);
         }
        res.render('approve_deny');
       });
    } else {
      res.render('error', err); 
    }
  });
};

exports.updateUser = function(req, res) {
  var action = req.get('action');
  var orgId = req.get('org');
  var status = req.get('status');
  var userType = req.get('memberType')
  var userId = req.params.id;

  function createActivity() {
    Organization.findOrganizationOwner(orgId, function(err, owner) {
      if (err) {
        console.log(err);
      }
      if (owner) {
        var activity = new Activity({
          to: userId,
          from: owner._id,
          action: 'group_approved'
        });
        activity.save(function(err, result) {
          if (err) {
            console.log(err);
          }
          else {
            new Push('activity', activity, function(result) {
            });
          }
        });
      }
    });
  }

  function updateOrgStatus() {
    User.findOne({_id: userId})
      .populate({path: 'org_status.organization'})
      .exec(function(err, user) {
      if (err) { 
        res.status(500).send({error: err});
      }
      if (user) {
        if (user.userBelongsToOrganization(orgId)) {
          console.log('something is going wrong');
          var update = {'org_status.$.status': status};
          var theme;
          _.each(user.org_status, function(item, idx, list){
            if (String(item.organization._id) == String(orgId)) {
              update.theme = item.organization.theme;
            }
          });
          Invite.findOne({code: user.program_code, organization: orgId}, function(err, invite){

            if (err) console.log(err);
            if (invite){
              invite.status = 'accepted';
              invite.user = user._id;
              update['org_status.$.status'] = 'active';
              invite.save(function(err, result){
                if (err) console.log(err);
              });
            }
            User.findOneAndUpdate({
              _id: user.id,
              org_status: {$elemMatch: { organization: orgId}}
            },
            {
              $set: update 
            },
            function(err, user) {
              if (err) console.log(err);
              if (status == 'active') {
                createActivity();
              }
              res.status(200).send({message: 'User org_status updated'});
            });

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
  };

  function updateSubType(organization) {
    // Need to change string of null from request to null value
    if (userType == 'null') {
      userType = null;
    }

    User.findOne({_id: userId}, function(err, user) {
      if (err) {
        res.status(500).send({error: err});
      }
      if (user) {
        if (userType == 'ambassador' || userType == 'luminary') {
          user.subtype = userType;
        }
        if (userType == 'leader' || userType == 'ambassador') {
          var mOrgStatus = user.org_status;
          _.each(mOrgStatus, function(status, index, list){
            if (String(status.organization) == organization && status.status == 'active'){
              user.org_status[index].role = userType;
            }
          });
        }
        user.save(function(err, result){
          if (err) {
            console.log(err);
          }
        });
        if (userType == 'leader') {
          Organization.findOne({_id: organization}, function(err, org){
            if (org){
              var activity = new Activity({
                from: org.owner,
                to: user._id,
                action: 'leader'
              });
              activity.save(function(err, res){
                if (err) console.log(err);
                else {
                new Push('activity', res, function(result) {
                  console.log(result);
                });
                }
              });
            }
          });
        }
        if (userType == 'luminary') {
          addLuminaryToTrust(function(err, success) {
            if (err) {
              res.status(500).send({error: err});
            }
            else {
             
              res.status(200).send({
                message: 'User was made luminary and added to trust'
              });
            }
          });
        }
        res.status(200).send({message: 'User had been modified'});
      }
      else {
        res.status(500).send({error: 'User Id invalid'});
      }
    });
  }

  function addLuminaryToTrust(next) {
    Organization.findOrganizationOwner(orgId, function(err, owner) {
      if (err) {
        next(err);
      }
      if (!owner) {
        next('Organization has no valid owner');
      }
      else {
        var trust = new Trust({
          from: owner,
          to: userId,
          status: 'accepted'
        });
        trust.save(function(err, trust) {
          if (err) {
            next(err);
          }
          if (trust) {
            next(null, true);
          }
        })
      }
    });
  }

  if (req.isAuthenticated()) {
    if (action == 'updateOrgStatus') {
      updateOrgStatus();
    }
    else if (action == 'updateSubtype') {
      updateSubType(orgId);
    }
    else {
      var update = {};
      var allowedFields = User.allowedFields();
      var didUpdate = false;
      var body = req.body;
      console.log('requesting');
      console.log(body);
      _image.uploadAvatar(req, function(err, path, fields){
        if (path) {
          update.profile_photo_url = path;
          didUpdate = true;
        }
        for (var prop in fields) {
          if (_.indexOf(allowedFields, prop) != -1){
            var value = fields[prop][0];
            if (prop == 'birthday') {
              var date = value.split('-'); 
              if (date.length == 3) {
                date = date[1] + '-' + date[2] + '-' + date[0];
              } else {
                date = false;
              }
              update[prop] = date;
              didUpdate = true;
            } else if (prop == 'date_founded'){
              update[prop] = new Date(value);
              didUpdate = true;
            }
            else if (value) {
              update[prop] = value;
              didUpdate = true;
            }
          }
        }
        if (didUpdate) {
          User.findOneAndUpdate({_id: userId}, update, function(err, result){
            res.status(200).send('ok'); 
          });
        } else {
          res.status(400).send();
        }
      });

      
    }
  }
  else {
    res.status(401).send({error: 'User must be authenticated, can not process request'});
  }
};

// User Partner Methods (Organizations)

function getTrustedLuminariesForUserId(userId, next) {
  var trustedUserIds = [];
  _trusts.findTrustsByUserId(userId, function(err, trusts) {
    if (err) {
      next(err);
    }
    if (trusts) {
      _.each(trusts, function(trust, index, list) {
        trustedUserIds.push(trust.to);
      });
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
  var failure = req.query.failure;
  var bypass = req.query.bypass;
  var agent = req.headers['user-agent'];
  var isIphone = agent.indexOf('iPhone') > -1;
  var isIpad = agent.indexOf('iPad') > -1;

  if (bypass || (!isIphone && !isIpad)) {
    res.render('login/login', {bodyId: 'login', failure: failure});
  } else {
    res.render('redirect');
  }
};

exports.handlePrizmLogin = function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err) }
    if (!user) {
      req.session.messages =  [info.message];
      return res.redirect('/login?failure=true')
    }
    req.logIn(user, function(err) {
      if (err) { 
        mixpanel.track('Login Failure');
        return next(err); 
      }
      mixpanel.track('Login Success', user.mixpanelProperties());
      mixpanel.people.set(String(user._id), user.mixpanelProperties());
      return res.redirect('/');
      // if (user.type == 'institution_verified') {
      //   _organizations.getNamespaceByOwnerId(user.id, function(err, namespace) {
      //     if (namespace) {
      //       return res.redirect('/' + namespace);
      //     }
      //   });
      // }
      // else {
      //   return res.redirect('/');
      // }
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
        mixpanel.people.set(String(user._id), user.mixpanelProperties());
        mixpanel.track('Login Success', user.mixpanelProperties());
        return res.redirect('/');
        // if (user.type == 'institution_verified') {
        //   _organizations.getNamespaceByOwnerId(user.id, function(err, namespace) {
        //     if (namespace) {
        //       return res.redirect('/' + namespace);
        //     }
        //   });
        // }
        // else {
        //   return res.redirect('/');
        // }
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
        return res.redirect('/');
        // if (user.type == 'institution_verified') {
        //   _organizations.getNamespaceByOwnerId(user.id, function(err, namespace) {
        //     if (namespace) {
        //       return res.redirect('/' + namespace);
        //     }
        //   });
        // }
        // else {
        //   return res.redirect('/');
        // }
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
  var latest = params.latest || false;
  user.fetchHomeFeedCriteria(function(err, criteria){
    if (latest) {
      criteria.create_date = {$lt: latest};
    }
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
      _.each(results, function(post, idx, list){
        if (String(post.creator._id) == String(user._id)){
          post.ownPost = true;
        } else {
          post.ownPost = false;
        }
        post.liked = false;
        _.each(post.likes, function(like, index, listb){
          if (String(like._id) == String(user._id)){
            post.liked = true
          };
        });
      });
      next(err, results);
    });
  });
};

exports.displayHomeFeed = function(req, res) {
  if (!req.user) {
    if (req.get('action')){
      res.status(400).send();
    }
    res.render('site/index', {
      title: 'Prizm App',
      selected:'home',
      bodyId: 'body-home'
    });
  }
  else {
    var id = req.user.id;
    var action = req.get('action');
    var lastPost = req.get('lastPost');
    User.findOne({_id: ObjectId(id)}, function(err, user) {
      if (err) {
        res.send(400);
      }
      if (user) {
        var done = 0;
        if (action) {
          var createDate = req.get('create_date');
          var currentTime = Date(req.get('current_time'));
          var serverTime = new Date();
          user.fetchHomeFeedCriteria(function(err, criteria){
            criteria.create_date = {'$gt': createDate};
            Post.find(criteria, {_id: 1})
            .exec(function(err, posts){
              if (err) {
                console.log(err);
                res.status(500).send();
              }
              var count = posts.length;
              var data = {count: count};
              res.status(200).send(data);
            });

            });
       
        } else {

        mixpanel.track('Home Feed Viewed', user.mixpanelProperties());
        var fetch = function(req, res, latest){
          fetchHomeFeed(user, {latest: latest}, function(err, posts) {
          posts = _time.addTimeSinceFieldToObjects(posts);
          if (posts && posts.length > 0) {
          _.each(posts, function(post, idx, list){
            User.resolvePostTags(post, function(err, users){
              if (users && users.length > 0){
                if (post.text) {
                  post.formattedText = _utils.replaceTagsFromUserList(post.text, users);
                }
                _.each(post.comments, function(comment, idx, list){
                  comment.formattedText = _utils.replaceTagsFromUserList(comment.text, users);
                });
              }
              done += 1;
              if (done == list.length){
                if (latest) {
                  res.render('profile/profile_feed.jade', {
                    posts: posts 
                  });
                  
                } else {
                  res.render('profile/profile_home', {
                    title: 'Home',
                    bodyId: 'home-feed',
                    auth: true,
                    currentUser: req.user,
                    posts: posts
                  });
              }
              }
            });
            
          })} else {
            res.render('profile/profile_home', {
              title: 'Home',
              bodyId: 'home-feed',
              auth: true,
              currentUser: req.user,
              posts: []
            }); 
          };
        });};
       
        if (lastPost) {
          Post.findOne({_id: lastPost}, function(err, post){
            if (post){
              fetch(req, res, post.create_date);
            } else {
              fetch(req, res, false);
            }
          });
        } else {
          fetch(req, res, false);
        }
      }
      }
      else {
        res.status(400).send({error: "User can not be found"});
      }
    });
  }
}


exports.displayProfile = function(req, res) {
  var id = req.user.id
  var showMembers = false;
  var edit = req.query.edit?true:false;
  User.findOne({_id: ObjectId(id)}, function(err, user) {
    if (err) {
      res.send(400);
    }
    if (user) {
      mixpanel.track('Profile Viewed', user.mixpanelProperties());
      Post.findPostsForProfileByUserId(user.id, true, true, function(err, posts) {
        var headerImages;
        if (err) {
          posts = [];
          headerImages = [];
        }
        posts = _time.addTimeSinceFieldToObjects(posts);
        if (req.user) {
          _.each(posts, function(post, idx, list){
            if (String(req.user._id) == String(post.creator)) {
              post.ownPost = true;
            } else {
              post.ownPost = false;
            }
            post.liked = false;
            _.each(post.likes, function(like, index, listb){
              if (String(like._id) == String(req.user._id)){
                post.liked = true
              };
            });
          });
        } 

        headerImages =_profile.shufflePostImagesForProfileHeader(posts);
        if (user.type == 'institution_verified' ) {
          Organization.findOne({owner: id}, function(err, organization){
            if (err) {
              organization = false;
            }
            showMembers = true;
            getTrustedLuminariesForUserId(id, function(err, luminaries) {
              if (err) {
                luminaries = [];
              }
              else {
                res.render('profile/profile', {
                  bodyId: 'profile',
                  auth: true,
                  currentUser: req.user,
                  user: user,
                  headerImages: headerImages,
                  showMembers: showMembers,
                  posts: posts,
                  organization: organization,
                  luminaries: luminaries,
                  edit: edit
                });
              }
            })
          });
        } else {
          res.render('profile/profile', {
            bodyId: 'profile',
            auth: true,
            currentUser: req.user,
            user: user,
            headerImages: headerImages,
            showMembers: showMembers,
            posts: posts,
            organization: false,
            luminaries: false,
            edit: edit
          });
        }
      });
    }
    else {
      res.status(400).send({error: "User can not be found"})
    }
  });
};

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
        if (req.user) {
          _.each(posts, function(post, idx, list){
            if (String(post.creator) == String(req.user._id)){
              post.ownPost = true;
            } else {
              post.ownPost = false;
            }
            post.liked = false;
            _.each(post.likes, function(like, index, listb){
              if (String(like._id) == String(req.user._id)){
                post.liked = true
              };
            });
          });
        } 

        headerImages =_profile.shufflePostImagesForProfileHeader(posts);
        var showMembers = false;
        if (String(currentUser._id) == String(user._id) && 
          currentUser.type == 'institution_verified'){
          showMembers = true;
          Organization.findOne({owner: currentUser._id}, function(err, organization){
            if (err){
              showMembers = false;
            }
            getTrustedLuminariesForUserId(user._id, function(err, luminaries) {
              if (err) {
                luminaries= [];
              }
              res.render('profile/profile', {
                bodyId: 'profile',
                auth: auth,
                currentUser: currentUser,
                user: user,
                showMembers: showMembers,
                headerImages: headerImages,
                posts: posts,
                organization: organization,
                luminaries: luminaries
              });
            });
          });
        } else {
          res.render('profile/profile', {
            bodyId: 'profile',
            auth: auth,
            currentUser: currentUser,
            user: user,
            headerImages: headerImages,
            showMembers: showMembers,
            posts: posts,
            organization: false,
            luminaries: false
          });
        }
      });
    }
    else {
      res.status(400).send({error: "User can not be found"})
    }
  });
}

// User Display Following/Follower

 var determineIsFollowing = function (req, res, users) {
  var authUser = req.user;
  var authUserFollowing = _.pluck(authUser.following, '_id');
  _.each(users, function(user) {
    if (_.contains(authUserFollowing, String(user._id))) {
      user.isFollowed = true;
    }
    else {
      user.isFollowed = false;
    }
  });
  return users;
}

exports.displayFollowers = function(req, res) {
  var userId      = req.params.id;
  var followers   = [];
  var authUser    = false;
  var html;

  function renderFollowersJade() {
    User.findOne({_id: userId}, function(err, user) {
      if (err) {
        res.status(500).send({error: err});
      }
      if (!user) {
        res.status(400).send({error: 'UserId not found'});
      }
      else {
        followers = _.pluck(user.followers, '_id');
        User.find({_id: {$in: followers}}, function(err, users) {
          if (err) {
            res.status(500).send({error: err});
          }
          else {
            if (req.isAuthenticated()) {
              users = determineIsFollowing(req, res, users);
              authUser = req.user;
            }
            html = jade.renderFile(profileFollow, {
              users: users,
              type: 'follower',
              authUser: authUser
            });
            res.send(html);
          }
        });
      }
    });
  }

  if (req.accepts('application/jade')) {
    renderFollowersJade();
  }
  else {
    res.status(406).send({error: 'Unacceptable request'});
  }
}

exports.displayFollowing = function(req, res) {
  var userId    = req.params.id;
  var following = [];
  var authUser  = false;
  var html;

  function renderFollowingJade() {
    User.findOne({_id: userId}, function(err, user) {
      if (err) {
        res.status(500).send({error: err});
      }
      if (!user) {
        res.status(400).send({error: 'UserId not found'});
      }
      else {
        following = _.pluck(user.following, '_id');
        // console.log(following);
        User.find({_id: {$in: following}}, function(err, users) {
          if (err) {
            res.status(500).send({error: err});
          }
          else {
            if (req.isAuthenticated()) {
              users = determineIsFollowing(req, res, users);
              authUser = req.user;
            }
            // _.each(users, function(user) {
            //   console.log(user._id + " : " + user.name);
            // })
            html = jade.renderFile(profileFollow, {
              users: users,
              type: 'following',
              authUser: authUser
            });
            res.send(html);
          }
        });
      }
    });
  }

  if (req.accepts('application/jade')) {
    renderFollowingJade();
  }
  else {
    res.status(406).send({error: 'Unacceptable request'});
  }
}

// User Members Methods

exports.displayMembers = function(req, res) {
  if (req.accepts('application/jade')) {
    membersJADERequest(req, res);
  }
  else if (req.accepts('application/json')) {
    membersJSONRequest(req, res);
  }
};

exports.membersHTMLRequest = function(req, res) {
  // We may want to display differet pages if they pending verification
  var sort = req.get('sort')||false;
  var currentUser = req.user;
  if (req.user.type == 'user') {
    res.redirect('/profile');
  }
  if (req.user.type == 'institution_pending') {
    res.status(400).send({error: 'Status is still pending'});
  }
  if (req.user.type == 'institution_verified') {
    mixpanel.track('Org Members Viewed', {organization: req.user.name});
    Organization
      .getOrganizationByOwnerId(req.user.id, function(err, organization) {
        if (err) {
          res.status(500).send({error: err});
        }
        if (!organization) {
          res.redirect('/profile');
        }
        else {
          User.findOrganizationMembers({organization: organization.id, status: 'active'}, organization.owner, sort, false, function(err, members) {
            if (err) {
                res.status(500).send({error: err});
            }
            else {
              res.render('profile/profile_members', {
                bodyId: 'members',
                auth: true,
                currentUser: currentUser,
                organization: organization,
                members: members,
                title: 'Members'
              });
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
  console.log('requesting users');
  var status = req.get('memberStatus');
  var org = req.params.id;
  var sort = req.get('sort');
  var text = req.get('text');
  var currentUser = req.user;
  Organization.findOne({_id: ObjectId(org)}, function(err, organization) {
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
        }, organization.owner, sort, text, function(err, members) {
          if (err) {
              console.log(err);
              res.status(500).send({error: err});
          }
          else {
            console.log(status);
            var path = status=='active'?'profile/profile_members_active':'profile/profile_members_pending';
            res.render(path, {currentUser: currentUser,
                organization: organization,
                members: members});
          }
        });
      }
    });    
};

var membersJSONRequest = function(req, res) {
  var org = req.get('org');
  var status = req.get('memberStatus');
  var sort = false;
  var criteria = {};
  if (status) {
    criteria.status = status;
  }
  Organization.findOne({_id: ObjectId(org)}, function(err, organization) {
      if (err) {
        console.log('error');
        res.status(500).send({error: err});
      }
      if (!organization) {
        res.status(404).send({error: 'Invalid Organization ID'});
      }
      else {
        criteria.organization = organization.id;
        User.findOrganizationMembers(criteria, organization.owner, sort, false, function(err, members) {
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

/* Registration */
exports.displayRegistration = function(req, res) {
  Interest
    .find({is_subinterest: false})
    .populate('subinterests')
    .exec(function(err, interests) {
      if (err) {
        var interests = [];
      }
      User
        .find({subtype: 'luminary', posts_count: {$gt: 4}})
        .exec(function(err, usersToFollow) {
          if (err) {
            var users = [];
          }
          res.render('registration/registration', {
            bodyId: 'registration',
            interests: interests,
            usersToFollow: usersToFollow
          });
        });
    });
};

exports.registerNewUser = function(req, res) {
  var dataType = req.get('dataType');
  if (dataType == 'user') {
    var userType = req.body.userType;
    if (!userType) {
      res.status(400).send('User type undefined');
    }
    else if (userType == 'individual') {
      registerIndividual(req, res);
    }
    else if (userType == 'partner') {
      registerPartner(req, res);
    }
  }
  else if (dataType == 'interests') {
    console.log('in interests block');
    updateInterests(req, res);
  }
  // else if (dataType == 'following') {
  //   updateFollowing(req, res);
  // }
  else if (req.query.dataType == 'photo'){
    // updatePhoto(req, res);
    uploadProfilePhoto(req, res);
  }
};

// Registration Methods

var validateRegistrationRequest = function(req, res,  next) {
  console.log(JSON.stringify(req.body));
  var userEmail = req.body.email;
  var userCode = req.body.programCode;
  var birthday = req.body.birthday;
  var phoneNumber = req.body.phone_number;
  if (validateEmail(userEmail)) {
    User.findOne({email: userEmail}, function(err, user) {
      if (err) {
        res.status(500).send({error: err});
      }
      if (user) {
        res.status(400).send({
          error: 'This email address has already been registered'
        });
      }
      else {
        if (req.body.password != req.body.confirmPassword) {
          res.status(400).send({error: 'Passwords do not match'});
        }
        else if (birthday){
          if (birthday.indexOf('/') != -1) {
            birthday = birthday.split('/');
            birthday = [birthday[2], birthday[0] - 1, birthday[1]];
          } else if (birthday.indexOf('-') != -1) {
            birthday = birthday.split('-');
            birthday = [birthday[0], birthday[1] - 1, birthday[2]] 
          }
          birthday = moment(birthday);
          diff = moment().diff(birthday, 'years');
          if (diff < 13) {
            res.status(400).send({
              error: 'You must be 13 years of age to create an account.'
            });
            return;
          }
          if (!phoneNumber){
            res.status(400).send({
              error: 'You must enter a valid phone number.'
            });
          }
         else {
          next();
        }
        }
       
      }
    });
  }
  else {
    res.status(400).send({error: 'Invalid Email Address'});
  } 
};

var saveUser = function(user, organization, res){
  user.save(function(err, user) {
    if (err) {
      res.status(500).send({error: err});
      console.log('saving user error');
    }
    var welcomePhoto = organization?organization.welcome_image_url:false;
    var response = {
      user: user,
      welcomePhoto: welcomePhoto
    };
    if (user) {
      console.log('user saved');
      res.status(200).send(response);
      _mail.sendWelcomeMail(response);
    }
  });

};

var registerIndividual = function(req, res) {
  var defaultProfileUrl = 'https://s3.amazonaws.com/higheraltitude.prism/' +
                          'default/profile_default_avatar.png';
  var phoneNumber = req.body.phone_number;
  var birthday = new Date(req.body.birthday);
  if (birthday){
    birthday = String(birthday.getMonth() + 1) + '-' + String(birthday.getDate())
      + '-' + String(birthday.getFullYear());
  }
  validateRegistrationRequest(req, res, function(organization) {
    var newUser = new User({
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      gender: req.body.gender,
      birthday: birthday,
      profile_photo_url: defaultProfileUrl,
      phone_number: phoneNumber,
      ethnicity: req.body.ethnicity || null,
      religion: req.body.religion || null
    });
    if (req.body.programCode) {
      newUser.program_code = req.body.programCode;
    }
    if (organization) {
      newUser.org_status = [{
        organization: organization._id,
        status: 'pending'
      }];
      if (newUser.hashPassword()){
        saveUser(newUser, organization, res);
        
      }

    } else {
      Invite.findOne({code: newUser.program_code, status: 'sent'})
      .exec(function(err, invite){
        if (err) console.log(err);
        console.log(invite);
        if (invite) {
          Organization.findOne({_id: invite.organization})
          .populate({path: 'owner'})
          .exec(function(err, org){
          invite.status = 'accepted';
          invite.user = newUser._id;
          invite.save(function(err, user){
            if (err) console.log(err);
          });
          newUser.org_status = [{
            organization: org._id,
            status: 'active'
          }];
          console.log('saving user');
          if (newUser.hashPassword()) {
            saveUser(newUser, org, res);          
            var params = {
                    body: [
                      util.format(ownerGreeting, org.owner.name),
                      util.format(ownerBody1Alt, newUser.first_name + ' ' + newUser.last_name, org.owner.name)
                    ],
                    closing: ownerClosing
                  };
                  var mail = jade.renderFile(baseMail, params);
                  mandrill(mandrillEndpointSend, {
                    message: {
                      to: [{email: org.owner.email}],
                      from_email: 'info@prizmapp.com',
                      from_name: 'Prizm',
                      subject: 'New Member Pending',
                      html: mail
                    }
                  }, function (err, response){
                    if (err) console.log(err); 
                  }); 
                  var messageString = util.format(ownerPushAlt, org.owner.name);
                  iPush.sendNotification({
                    device: org.owner.device_token,
                    alert: messageString,
                    payload: {_id: invite._id},
                    badge: 1 
                  }, function(err, result){
                    if (err) console.log(err);
                    else console.log('Sent push'); 
                  });
          }
          });
        } else {
          if (newUser.program_code){
            Organization.findOne({code: newUser.program_code})
            .populate({path: 'owner'})
            .exec(function(err, org){
              if (org) {
                newUser.org_status = [{
                  organization: org._id,
                  status: 'pending'
                }];
                if (newUser.hashPassword()){
                  saveUser(newUser, org, res);
                  var params = {
                    body: [
                      util.format(ownerGreeting, org.owner.name),
                      util.format(ownerBody1, newUser.first_name + ' ' + newUser.last_name, org.owner.name)
                    ],
                    closing: ownerClosing
                  };
                  var mail = jade.renderFile(baseMail, params);
                  mandrill(mandrillEndpointSend, {
                    message: {
                      to: [{email: org.owner.email}],
                      from_email: 'info@prizmapp.com',
                      from_name: 'Prizm',
                      subject: 'New Member Pending',
                      html: mail
                    }
                  }, function (err, response){
                    if (err) console.log(err); 
                  }); 
                  var messageString = util.format(ownerPush, org.owner.name);
                  iPush.sendNotification({
                    device: org.owner.device_token,
                    alert: messageString,
                    payload: {_id: org._id},
                    badge: 1 
                  }, function(err, result){
                    if (err) console.log(err);
                    else console.log('Sent push'); 
                  });   
                }
              }
            });
          } else {
            if (newUser.hashPassword()){
              saveUser(newUser, false, res);
            }
          }
        }
       
      });
    }
  });
};

var registerPartner = function(req, res) {
  var defaultProfileUrl = 'https://s3.amazonaws.com/higheraltitude.prism/' +
                          'default/profile_default_avatar.png';
  validateRegistrationRequest(req, res, function() {
    var newUser = new User({
      first_name: req.body.name,
      type: 'institution',
      email: req.body.email,
      password: req.body.password,
      zipcode: req.body.zipCode,
      phone_number: req.body.phone,
      website: req.body.webSite,
      review_key: _utils.uuid.v1(),
      profile_photo_url: defaultProfileUrl
    });
    if (newUser.hashPassword()) {
      newUser.save(function(err, user) {
        if (err) {
          res.status(500).send({error: err});
        }
        if (user) {
          res.status(200).send(user);
          _mail.sendWelcomeMail(user);
          _mail.sendNewPartnerMail(user);
        }
      });
    }
    else {
      res.status(500).send({error: 'There was an error trying to create account'});
    }
  });
};

var updateInterests = function(req, res) {
  var interestsArray = req.body.interests;
  var userId = req.body.userId;
  Interest.find({_id: {$in: interestsArray}}, function(err, interests) {

    if (err) {
      res.status(500).send({error: err});
    }
    if (interests) {
     var intArray = _.pluck(interests, '_id');
      var update = {
        $push: {
          interests: {
            $each: intArray
          }
        }
      };
      User.findOneAndUpdate({_id: userId}, update, function(err, user) {
        if (err) {
          res.status(500).send({error: err});
        }
        if (user) {
          res.status(200).send(user);
        }
        else {
          res.status(400).send({error: 'Invalide user id'});
        }
      })
    }
    else {
      res.send(400).send({error: 'Selected interests could not be found'});
    }
  });
};

// var updateFollowing = function(req, res) {
//   // Need to decide is we want to make API to API call or move following
//   // logic over to web app
//   res.status(200).end();
// };

var uploadProfilePhoto = function(req, res) {
  var userId    = req.query.userId;
  var imageType = req.query.imageType;
  var settings  = {}; 

  settings.userId = userId;
  settings.imageType = imageType;

  _image.uploadImage(req, res, settings, function(err, url) {
    if (err) {
      res.status(500).send({error: err});
    }
    if (url) {
      User.findOneAndUpdate({
        _id: userId
      }, {
        profile_photo_url: url
      }, function(err, user) {
        if (err) {
          res.status(500).send({error: err});
        }
        if (user) {
          res.status(200).send({
            success: 'Uploaded successfully',
            url: url
          });        
        }
        else {
          res.status(500).send({error: 'Error saving profile url to user id'});
        }
      });
    }
  });
};

// Activity Feed
exports.displayActivityFeed = function(req, res) {
  var userId = req.user._id;
  var action = req.get('action');
  if (action){
    if (action == 'newer') {
      var create_date = req.get('create_date');
      var criteria = {to: userId, create_date: {'$gt': create_date}};
      Activity.findOne(criteria, {action: 1, from:1, post_id:1, comment_id: 1})
      .populate('from', 'name')
      .exec(function(err, a){
        if (err) {
          console.log(err);
          res.status(500).send();
        } else {
          var string = false;
          if (a) {
            if (a.from && a.from.name){
              string = a.from.name;
            } else {
              string = '';
            }
            switch(a.action){
              case 'comment':
                string += ' commented on your post.';
                break;
              case 'tag':
                string += ' tagged you in a ';
                break;
              case 'like':
                string += ' liked your';
                break;
              case 'trust_accepted':
                string += ' accepted your trust request.';
                break;
              case 'trust_request':
                string += ' has sent you a trust invite.';
                break;
              case 'group_approved':
                string += ' has approved your membership.';
                break;
              case 'leader':
                string += ' made you a leader.';
                break;
              case 'group_added':
                string += ' added you to a group.';
                break;
              case 'post':
                string += ' created a post.';
                break;
              default: 
                break;
            }
            if (a.action=='like' && a.post_id){
              string += ' post.';
            }
            if (a.action=='like' && a.comment_id){
              string += ' comment.';
            }
            if (a.insight_id) {
              string += ' sent you an insight.';
            }
          }
          res.status(200).send({alert: string});
        }
      });
    } else {
      var total = 0;
      Activity.find({to: userId, has_been_viewed: false})
      .count(function(err, c){
        if (err) console.log(err);
        if (c) total += c;
        Trust.find({to: userId, status: 'pending'})
        .count(function(err, c){
          if (err) console.log(err);
          if (c) total += c;
          res.status(200).send({count: total});
        });
      });
    }

  } else{
    function getNotifications(next) {
      Activity
        .find({to: userId})
        .populate('from', 'name _id profile_photo_url')
        .where({action: {$ne: 'trust_accepted'}})
        .sort({create_date: -1})
        .exec(function(err, notifications) {
          if (err) next(err);
          if (notifications) {
            var postArray = [];
            var postMap = [];
            var insightArray = [];
            var insightMap = [];
            var unread = _.filter(notifications, function(note){ return note.has_been_viewed == false});
            var ids = _.pluck(unread, '_id');
            Activity.update({_id: {$in: ids}}, {$set: {has_been_viewed: true}}, {multi: true}, function(err, result){
              if (err) console.log(err);
            });
            _.each(notifications, function(note, idx, list){
              if (note.post_id) {
                postArray.push(note.post_id);
                postMap.push({id: String(note.post_id), index: idx});
              }
              if (note.insight_id) {
                insightArray.push(note.insight_id);
                insightMap.push({id: String(note.insight_id), index: idx});
              }
            });
            if (postArray.length > 0 || insightArray.length > 0) {
              Post.find({_id: {$in: postArray}}, function(err, posts){
                if (posts) {
                  _.each(postMap, function(p, idx, list){
                    var post = _.find(posts, function(t){
                      return String(t._id) == p.id;
                    });
                    notifications[p.index].photo_url = post.file_path;
                  });
                }
                Insight.find({_id: {$in: insightArray}}, function (err, insights){
                  if (insights) {
                    _.each(insightMap, function(i, idx, list){
                      var insight = _.find(insights, function(t){
                        return String(t._id) == i.id;
                      });
                      if (insight){
                        notifications[i.index].photo_url = insight.file_path;
                      }
                    });
                  }
                  next(null, notifications);
                });
                });
            } else {
              next(null, notifications);
            }
          }
        });
    }

    function getRequests(next) {
      var criteria = {
          $or: [{
              from: userId
          }, {
              to: userId
          }],
          $and: [{
              status: {
                  $ne: 'cancelled'
              }
          }, {
              status: {
                  $ne: 'inactive'
              }
          }]
      };

      Trust
        .find(criteria)
        .populate('to from', 'name _id profile_photo_url')
        .sort('-status -create_date')
        .exec(function(err, requests) {
          if (err) next(err)
          if (requests) {
            next(null, requests);
          }
        });
    }

    function resolveObjectIds(activities) {

      _.each(activities, function(activity) {
        activity = activity.toObject();
        switch(activity.action) {
          case 'insight':
            Insight.findOne({_id: activity.insight_id}, function(err, insight) {
              if (insight) {
                activity.photo_url = insight.file_path;
              }
            });
            break;
          case 'like':
          case 'comment':
            Post.findOne({_id: activity.post_id}, function(err, post) {
              if (post) {
                activity.photo_url = post.file_path;
              }
            });
            break;
          default:
            activity.photo_url = null;
        }
      });
     
      return activities;
    }

    function updateHasBeenViewed(activities) {
      var update = {
        $set: {has_been_viewed: true}
      };

      _.each(activities, function(activity) {
        if (activity.has_been_viewed == false) {
          Activity.findOneAndUpdate({
            _id: activity._id
          }, update, function(err, activity) {
            if (activity) {
              return;
            }
            else {
              return;
            }
          });
        }
      });
      return true;
    }

    if (req.accepts('html')) {
      var notifications = {};
      var requests      = {}

      getNotifications(function(err, notifications) {
        if (err) {
          res.status(500).send({error: err});
        }
        else {
          resolveObjectIds
          notifications = resolveObjectIds(notifications);
          notifications = _time.addTimeSinceFieldToObjects(notifications);
          res.render('profile/profile_activity', {
            auth: true,
            currentUser: req.user,
            bodyId: 'activity',
            title: 'Activity',
            notifications: notifications,
            requests: requests
          });
        }
      });
    }
    else if (req.accepts('application/jade')) {
      var activity = req.get('activity');
      var content;

      if (String(activity) == 'trusts') {
        getRequests(function(err, requests) {
          if (err) {
            res.status(500).send({error: err});
          }
          else {
            requests = _time.addTimeSinceFieldToObjects(requests);
            content = jade.renderFile(profileRequests, {
              currentUser: req.user,
              requests: requests
            });
            res.send(content);
          }
        });
      }
      else if (String(activity) == 'notifications') {
        getNotifications(function(err, notifications) {
          if (err) {
            res.status(500).send({error: err});
          }
          else {
            notifications = _time.addTimeSinceFieldToObjects(notifications);
            content = jade.renderFile(profileNotifications, {
              currentUser: req.user,
              notifications: notifications
            });
            res.send(content);
          }
        });
      }
      else {
        res.status(400).send({error: 'Invalid type'});
      }
    }
  }
}

/* Explore Feed */
exports.displayExploreFeed = function(req, res) {
  Post
  .find({
    scope: 'public',
    is_flagged: false,
    status: 'active'
  })
  .sort({create_date: -1, _id: -1})
  .limit(21)
  .exec(function(err, posts) {
    if (err) {
      res.status(500).send({error: err});
    }
    if (posts) {
      res.render('profile/profile_explore', {
        title: 'Explore',
        auth: true,
        currentUser: req.user,
        bodyId: 'explore',
        posts: posts
      });
    }
  });
}

exports.restrictUser = function(req, res) {
  var user = req.user;
  var uid = req.get('id');
  Organization.findOne({owner: user._id}, function(err, org){
    if (org) {
      User.findOne({_id: uid, org_status: {$elemMatch: {organization: org._id}}}, function(err, user){
        if (user) {
          user.visibility = 'restricted';
          user.save(function(err, result){
            if (err) {
              res.status(500).send(err);
            } else {
              Post.update({creator: uid}, {$set: {is_flagged: true}}, {multi: true}, function(err, result){
                res.status(201).send();
              });
            }
          });
        } else {
          res.status(500).send(err);
        }
      });
    } else {
      res.status(500).send(err);
    }
  });
}

exports.unrestrictUser = function(req, res){
  var user = req.user;
  var uid = req.get('id');
  Organization.findOne({owner: user._id}, function(err, org){
    if (org) {
      User.findOne({_id: uid, org_status: {$elemMatch: {organization: org._id}}}, function(err, user){
        if (user) {
          user.visibility = null;
          user.save(function(err, result){
            if (err) {
              res.status(500).send(err);
            } else {
              res.status(201).send();
            }
          });
        } else {
          res.status(500).send(err);
        }
      });
    } else {
      res.status(500).send(err);
    }
  });

};

exports.getTrustedLuminariesForUserId = getTrustedLuminariesForUserId

// Insights

exports.displayInsightsForUser = function(req, res){
  var user = req.user;
  var options = {
    title: 'Insight',
    bodyId: 'memberInsights',
    insights: [],
    auth: true,
    currentUser: user
  };
  InsightTarget.find(
      {target: user._id, liked: false, disliked: false}, 
      function(err, targets){
        if (targets) {
          var list = _.pluck(targets, 'insight');
          Insight.find({_id: {$in: list}})
          .sort({create_date: -1})
          .populate({
            path: 'creator',
            select: '_id name profile_photo_url subtype'
          })
          .exec(function(err, insights){
            options.insights = insights;
            res.render('profile/insights', options);

          });
        } else {
          res.render('profile/insights', options);
        }
  }); 
}

exports.fetchInsightsFeed = function(req, res){
  var user = req.user;
  var type = req.get('type');
  var options = {insights: []};
  var criteria = {
    target: user._id,
    liked: type == 'archive',
    disliked: false
  };
  InsightTarget.find(
      criteria, 
      function(err, targets){
        if (targets) {
          var list = _.pluck(targets, 'insight');
          Insight.find({_id: {$in: list}})
          .sort({create_date: -1})
          .populate({
            path: 'creator',
            select: '_id name profile_photo_url subtype'
          })
          .exec(function(err, insights){
            options.insights = insights;
            if (type == 'archive') {
              res.render('profile/insight_archive_feed', options);
            } else {
              res.render('profile/insight_feed', options);
            }
          });
        } else {
          if (type == 'archive') {
            res.render('profile/insight_archive_feed', options);
          } else {
            res.render('profile/insight_feed', options);
          }
        }
  }); 

}

exports.archiveInsight = function(req, res){
  var insightId = req.params.id;
  var uid = req.user._id;
  mixpanel.track('Insight liked');
  InsightTarget.findOneAndUpdate(
    {insight: insightId, target: uid},
    {liked: true, disliked: false},
    function(err, it){
      if (!err) {
        Insight.findOne(
          {insight: insightId},
          function(err, insight){
            if(insight) {
              insight.likes_count += 1;
              insight.save();
            }
          }
        );
        res.status(201).send();
      } else {
        res.status(400).send();
      }
    }
  );
};

exports.rejectInsight = function(req, res){
  var insightId = req.params.id;
  var uid = req.user._id;
  mixpanel.track('Insight disliked');
  InsightTarget.findOneAndUpdate(
    {insight: insightId, target: uid},
    {$set: {liked: false, disliked: true}},
    function(err, it){
      if (!err) {
        Insight.findOne(
          {insight: insightId},
          function(err, insight){
            if(insight) {
              insight.dislikes_count += 1;
              insight.save();
            }
          }
        );
        res.status(201).send();
      } else {
        res.status(400).send();
      }
    }
  );
};

exports.getSingleInsight = function(req, res){
  var insight = req.params.id;
  var user = req.user;
  var criteria = {
    insight: insight,
    target: user._id
  };
  InsightTarget.findOne(criteria)
  .populate({path: 'insight'})
  .populate({
    path: 'creator',
    select: '_id name profile_photo_url subtype'
  })
  .exec(function(err, it){
    if (it && it.insight) {
      var insight = it.insight.toObject();
      insight.creator = it.creator;
      insight.liked = it.liked;
      res.render('profile/insight_overlay', {insight: insight});
    } else {
      res.status(400).send();
    }
  });
}

exports.showSettings = function(req, res){
  var user = req.user;
  User.fetchSuggestions(user, function(err, users) {
    res.render('profile/settings', {auth: true, bodyID: 'Settings', currentUser: user, users: users});
  });
};

exports.fetchLikesFeed = function(req, res){
  var user = req.user;
  Post.find({likes: {$elemMatch: {_id: String(user._id)}}})
  .populate({path: 'creator'})
  .sort({create_date: -1})
  .exec(function(err, posts){
    if (err) console.log(err);
      posts = _time.addTimeSinceFieldToObjects(posts); 
      _.each(posts, function(post, idx, list){
        if (String(post.creator._id) == String(user._id)){
          post.ownPost = true;
        } else {
          post.ownPost = false;
        }
        post.liked = false;
        _.each(post.likes, function(like, index, listb){
          if (String(like._id) == String(user._id)){
            post.liked = true;
          };
        });
      });
    console.log(posts);
    res.render('profile/likes_feed', {posts: posts}); 
  })
}

exports.fetchSupport = function(req, res){
  var user = req.user;
  res.render('profile/support_feed');
}

exports.fetchFollowFeed = function(req, res){
  var user = req.user;
  User.fetchSuggestions(user, function(err, users){
    res.render('profile/follow_feed', {users: users});
  });
};

exports.showPasswordModal = function(req, res){
  var user = req.user;
  res.render('overlays/password_reset');
}
