var express   = require('express');
var router    = express.Router();
var mongoose  = require('mongoose');
var utils     = require('../utils');
var _         = require('underscore');
var _posts    = require('../controllers/posts');
var _users    = require('../controllers/users');
var _follow   = require('../controllers/follow');
var _orgs     = require('../controllers/organizations');
var _trusts   = require('../controllers/trusts');
var _messages = require('../controllers/messages');
var Insights = require('../controllers/insights');
var config    = require('../config');
var passport  = require('passport');

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
router.get('/posts', function(req, res){
  if (req.get('feedType') == 'home'){
    _users.displayHomeFeed(req, res);
  } else {
    _posts.fetchPosts(req, res);
  }
});

router.get('/posts/new', _posts.displayCreatePost);
router.get('/posts/:id', _posts.singlePost);
router.post('/posts', _users.authRequired, _posts.createPost);
router.post('/posts/:id/like', _posts.likePost);
router.post('/posts/:id/unlike', _posts.unlikePost);
router.post('/posts/:id/comment', _posts.addComment);


/* Messages */
router.get('/profile/messages/:organization', _users.authRequired, function(req, res){
  console.log('Forwarding request to controller');
  _messages.displayUserMessagesFeed(req, res);
});
router.get('/organization/:organization/groups/:group/members', _users.authRequired, _messages.fetchViewed);
router.get('/messages', _users.authRequired, _messages.displayOwnerMessagesFeed);
router.get('/messages/:group', _users.authRequired, _messages.fetchMessages);
router.get('/profile/groups', _users.authRequired, _messages.newGroup);
router.post('/profile/groups', _users.authRequired, _messages.addNewGroup); 
router.post('/messages', _users.authRequired, _messages.createMessage);
router.post('/messages/actions/:mid', _users.authRequired, _messages.manipulateMessage);
router.delete('/messages/:message_id', _users.authRequired, _messages.deleteMessage);
router.put('/messages/:message_id', _users.authRequired, _messages.updateMessage);

/* Users */
router.post('/users/unrestrict', _users.authRequired, _users.unrestrictUser);
router.post('/users/restrict', _users.authRequired, _users.restrictUser);
router.get('/users/props', _users.authRequired, _users.getUserProps);
router.get('/users/:id/password', _users.passwordReset);
router.get('/users', utils.auth, _users.fetchUsers);
router.get('/users/:id/institutions', _users.institutionApproval);
router.post('/users/:id', _users.authRequired, _users.updateUser);
router.put('/users/:id', _users.authRequired, _users.updateUser);
/* Authorization */
router.get('/login', _users.displayLogin);
router.post('/login', _users.handlePrizmLogin);
router.get('/login/facebook', _users.handleFacebookLogin);
router.get('/login/twitter', _users.handleTwitterLogin);
router.get('/logout', _users.handleLogout);

/* Profiles */
router.get('/profile', _users.authRequired, _users.displayProfile);
router.get('/profile/members', _users.authRequired, _users.membersHTMLRequest);
router.get('/profile/settings', _users.authRequired, _users.showSettings);
router.get('/profile/settings/follow', _users.authRequired, _users.fetchFollowFeed);
router.get('/profile/settings/likes', _users.authRequired, _users.fetchLikesFeed);
router.get('/profile/settings/support', _users.authRequired, _users.fetchSupport);
router.get('/organizations/:id/members', _users.authRequired, _users.displayMembers);
router.get('/organizations/:id/members/new', _users.authRequired, _orgs.addMembers);
router.post('/organizations/:id/members/new', _users.authRequired, _orgs.createInvites);
router.post('/organizations/:id/members/invite', _users.authRequired, _orgs.sendInvites);
router.delete('/organizations/:org_id/invites/:invite_id', _users.authRequired, _orgs.deleteInvite);
router.put('/organizations/:org_id/invites/:invite_id', _users.authRequired, _orgs.resendInvite);
router.put('/organizations/:organization/groups/:group_id', _users.authRequired, _messages.updateGroup);
router.get('/profile/members/csv', _users.authRequired, _orgs.renderCSVModal);
router.get('/profile/members/memberexport.csv', _users.authRequired, _orgs.exportCSV);
router.get('/profile/activity', _users.authRequired, _users.displayActivityFeed);
router.get('/profile/explore', _users.authRequired, _users.displayExploreFeed);
router.get('/profile/insights', _users.authRequired, _users.displayInsightsForUser);
router.get('/profiles/:id', _users.displayProfileById);

/* Follow */
router.get('/profiles/:id/following', _users.displayFollowing);
router.get('/profiles/:id/followers', _users.displayFollowers);
router.post('/profiles/:id/followers', _follow.followUserId);

/* Insights */
router.get('/profiles/:uid/insights', _users.authRequired, _users.fetchInsightsFeed);
router.get('/insights/new', function(req, res){
  res.render('create/insight');
});
router.post('/insights', _users.authRequired, Insights.createInsight);
router.get('/insights/:id', _users.authRequired, _users.getSingleInsight);
router.post('/insights/:id', _users.authRequired, Insights.sendInsight);


router.post('/profiles/:uid/insights/:id', _users.authRequired, function(req, res){
  var action = req.get('action');
  if (action == 'archive') {
    _users.archiveInsight(req, res);
  } else {
    _users.rejectInsight(req, res);
  }
});
/* Trusts */
router.post('/trusts/:id', _users.authRequired, _trusts.updateTrusts);

/* Registration */
router.get('/register', _users.displayRegistration);
router.post('/register', _users.registerNewUser);
router.get('/register/:id', _users.authRequired, _orgs.displayOrgRegistration);
router.post('/register/:id', _orgs.updateOrg);


/** Redirect **/
router.get('/redirect', function(req, res){
  res.render('redirect', {});
}); 
/** Organization Pages **/
router.get('/:name', _orgs.displayOrganization);




module.exports = router;
