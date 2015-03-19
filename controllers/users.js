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
var activeMembers   = fs.readFileSync(path.join(__dirname +
                      '/../views/profile/profile_members_active.jade'), 'utf8');
var pendingMembers  = fs.readFileSync(path.join(__dirname +
                      '/../views/profile/profile_members_pending.jade'), 'utf8');
var profileFollow   = path.join(__dirname, '/../views/profile/profile_follow.jade')
var memberCardPath  = path.join(__dirname, '/../views/profile/profile_members_card.jade')
var memberCard      = fs.readFileSync(memberCardPath, 'utf8');
var rejectMail      = fs.readFileSync(path.join(__dirname +
                      '/../views/mail/reject_mail.jade'), 'utf8');
var acceptMail      = fs.readFileSync(path.join(__dirname +
                      '/../views/mail/accept_mail.jade'), 'utf8');
var mandrill        = require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';
var Mixpanel        = require('mixpanel');
var mixpanel        = Mixpanel.init(process.env.MIXPANEL_TOKEN);

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
              console.log(JSON.stringify(result));
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
          var update = {'org_status.$.status': status};
          var theme;
          _.each(user.org_status, function(item, idx, list){
            if (String(item.organization._id) == String(orgId)) {
              console.log(item.organization);
              update.theme = item.organization.theme;
            }
          });
          console.log(update);
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

  function updateSubType() {
    // Need to change string of null from request to null value
    if (userType == 'null') {
      userType = null;
    }

    User.findOne({_id: userId}, function(err, user) {
      if (err) {
        res.status(500).send({error: err});
      }
      if (user) {
        User.findOneAndUpdate({
          _id: userId
        }, {
          subtype: userType
        }, function(err, user) {
          if (err) {
            res.status(500).send({error: err});
          }
          else {
            res.status(200).send({message: 'User type updated'});
          }
        });
      }
      else {
        res.status(500).send({error: 'User Id invalid'});
      }
    });

    // User.findOneAndUpdate({
    //   _id: userId
    // }, {
    //   subtype: userType
    // }, function(err, user) {
    //   if (err) {
    //     res.status(500).send({error: err});
    //   }
    //   if (user) {
    //     res.status(200).send({message: 'User type updated'});
    //   }
    //   else {
    //     res.status(500).send({error: 'User Id invalid'});
    //   }
    // });
  }

  if (req.isAuthenticated()) {
    if (action == 'updateOrgStatus') {
      updateOrgStatus();
    }
    else if (action == 'updateSubtype') {
      updateSubType();
    }
    else {
      res.status(400).send({error: 'Invalid action'});
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
  var failure = req.query.failure;
  res.render('login/login', {bodyId: 'login', failure: failure});
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
    res.render('site/index', {
      title: 'Prizm App',
      selected:'home',
      bodyId: 'body-home'
    });
  }
  else {
    var id = req.user.id;
    var lastPost = req.get('lastPost');
    User.findOne({_id: ObjectId(id)}, function(err, user) {
      if (err) {
        res.send(400);
      }
      if (user) {
        var done = 0;
        mixpanel.track('Home Feed Viewed', user.mixpanelProperties());
        var fetch = function(req, res, latest){
          fetchHomeFeed(user, {latest: latest}, function(err, posts) {
          posts = _time.addTimeSinceFieldToObjects(posts);
          console.log(posts[1]);
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
      else {
        res.status(400).send({error: "User can not be found"});
      }
    });
  }
}


exports.displayProfile = function(req, res) {
  var id = req.user.id
  var showMembers = false;
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
                  luminaries: luminaries
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
            luminaries: false
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
          User.findOrganizationMembers({organization: organization.id, status: 'active'}, function(err, members) {
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
  var status = req.get('memberStatus');
  var org = req.get('org');
  if (status == 'active') {
    memberList = activeMembers;
  }
  else if (status == 'pending') {
    memberList = pendingMembers;
  }
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
  var org = req.get('org');
  var status = req.get('memberStatus');
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
  console.log("dataType: " + dataType);
  if (dataType == 'user') {
    var userType = req.body.userType;
    console.log(JSON.stringify(req.body));
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
  console.log("Validating request...")
  console.log(JSON.stringify(req.body));
  var userEmail = req.body.email;
  var userCode = req.body.programCode;
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
        if (userCode) {
          Organization.findOne({code: userCode}, function(err, organization) {
            if (err) {
              res.status(500).send({error: err});
            }
            if (organization) {
              next(organization);
            }
            else {
              res.status(400).send({error: 'Program code is a valid code'});
            }        
          });
        }
        else {
          next();
        }
      }
    });
  }
  else {
    res.status(400).send({error: 'Invalid Email Address'});
  }
};

var registerIndividual = function(req, res) {
  var defaultProfileUrl = 'https://s3.amazonaws.com/higheraltitude.prism/' +
                          'default/profile_default_avatar.png';
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
      profile_photo_url: defaultProfileUrl
    });
    if (req.body.programCode) {
      newUser.programe_code = req.body.programCode;
      newUser.org_status = {
        organization: ObjectId(organization._id),
        status: 'pending'
      }
    }
    if (newUser.hashPassword()) {
      console.log('saving user');
      newUser.save(function(err, user) {
        if (err) {
          res.status(500).send({error: err});
          console.log('saving user error');
        }
        if (user) {
          console.log('user saved');
          res.status(200).send(user);
          _mail.sendWelcomeMail(user);
        }
      });
    }
    else {
      res.status(500).send({error: 'There was an error trying to create account'});
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
  console.log('iterating in interests');
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

  function getNotifications(next) {
    Activity
      .find({to: userId})
      .populate('from', 'name _id profile_photo_url')
      .where({action: {$ne: 'trust_accepted'}})
      .sort({create_date: -1})
      .exec(function(err, notifications) {
        if (err) next(err)
        if (notifications) {
          next(null, notifications);
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
      // .where({action: 'trust_accepted'})
      .sort('-create_date status')
      .exec(function(err, requests) {
        if (err) next(err)
        if (requests) {
          next(null, requests);
        }
      });
  }

  function resolveObjectIds(activities) {

    _.each(activities, function(activity) {

      switch(activity.action) {
        case 'insight':
          Insight.findOne({_id: activity.insight_id}, function(err, insight) {
            activity.photo_url = insight.file_path;
          });
          break;
        case 'like':
        case 'comment':
          Post.findOne({_id: activity.post_id}, function(err, post) {
            activity.photo_url = post.file_path;
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
    var requests      = {};

    getNotifications(function(err, notifications) {
      if (err) {
        res.status(500).send({error: err});
      }
      else {
        notifications = resolveObjectIds(notifications);
        notifications = _time.addTimeSinceFieldToObjects(notifications);
        getRequests(function(err, requests) {
          if (err) {
            res.status(500).send({error: err});
          }
          else {
            // requests = resolveObjectIds(requests);
            requests = _time.addTimeSinceFieldToObjects(requests);
            console.log(requests);
            res.render('profile/profile_activity', {
              auth: true,
              currentUser: req.user,
              bodyId: 'activity',
              notifications: notifications,
              requests: requests
            });
          }
        });
      }
    });
  }
}

exports.getTrustedLuminariesForUserId = getTrustedLuminariesForUserId
