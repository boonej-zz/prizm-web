var express   = require('express');
var router    = express.Router();
var mongoose  = require('mongoose');
var utils     = require('../utils');
var _         = require('underscore');
var _posts    = require('../controllers/posts');
var _users    = require('../controllers/users');
var _follow   = require('../controllers/follow');
var _organizations = require('../controllers/organizations');

var config      = require('../config');
var passport    = require('passport');


/* Website */
router.get('/', _users.displayHomeFeed);

router.get('/terms', function(req, res) {
  res.render('site/terms', { title: 'Prizm App | Legal', selected:'none'});
});

router.get('/privacy', function(req, res){
  res.render('site/privacy', { title: 'Prizm App | Privacy', selected:'none'});
});

router.get('/partner', function(req, res){
  res.render('site/partner', { title: 'Prizm App | Partners', selected: 'none'});
});

router.get('/luminary', function(req, res){
  res.render('site/luminary', { title: 'Prizm App | Luminary', selected: 'none'});
});

router.get('/download', function(req, res){
  res.render('site/download', { title: 'Prizm App | Download', selected: 'none'});
});

/* Posts */
router.get('/posts/', _posts.fetchPosts);
router.get('/posts/:id', _posts.singlePost)

/* Users */
router.get('/users/:id/password', _users.passwordReset);
router.get('/users', utils.auth, _users.fetchUsers);
router.get('/users/:id/institutions', _users.institutionApproval);
router.post('/users/:id', _users.authRequired, _users.updateOrgStatus);

/* Authorization */
router.get('/login', _users.displayLogin);
router.post('/login', _users.handlePrizmLogin);
router.get('/login/facebook', _users.handleFacebookLogin);
router.get('/login/twitter', _users.handleTwitterLogin);
router.get('/logout', _users.handleLogout);

/* Profiles */
router.get('/profile', _users.authRequired, _users.displayProfile);
router.get('/profile/members', _users.authRequired, _users.displayMembers);
router.get('/profiles/:id', _users.displayProfileById);

/* Follow */
// router.get('/profiles/:id/following', _users.displayFollowing);
// router.get('/profiles/:id/followers', _users.displayFollowers);
router.post('/profiles/:id/following', _follow.followUserId);

/* Registration */
router.get('/register', _users.displayRegistration);
router.post('/register', _users.registerNewUser);

/** Organization Pages **/
router.get('/:name', _organizations.displayOrganization);


module.exports = router;