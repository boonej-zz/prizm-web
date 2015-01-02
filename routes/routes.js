var express   = require('express');
var router    = express.Router();
var mongoose  = require('mongoose');
var utils     = require('../utils');
var _         = require('underscore');
var _posts    = require('../controllers/posts');
var _users    = require('../controllers/users');
var _organizations = require('../controllers/organizations');


/* Website */
router.get('/', function(req, res) {
  res.render('index', { title: 'Prizm App', selected:'home', bodyId: 'body-home' });

});

router.get('/about', function(req, res) {
  res.redirect('/#about');
});

router.get('/insight', function(req, res) {
  res.redirect('/#insight');
});

router.get('/mission', function(req, res) {
  res.redirect('/#mission');
})

router.get('/terms', function(req, res) {
  res.render('terms', { title: 'Prizm App | Legal', selected:'none'});
});

router.get('/privacy', function(req, res){
  res.render('privacy', { title: 'Prizm App | Privacy', selected:'none'});
});

router.get('/partner', function(req, res){
  res.render('partner', { title: 'Prizm App | Partners', selected: 'none'});
});

router.get('/luminary', function(req, res){
  res.render('luminary', { title: 'Prizm App | Luminary', selected: 'none'});
});

router.get('/download', function(req, res){
  res.render('download', { title: 'Prizm App | Download', selected: 'none'});
});

/* Posts */
router.get('/posts/', _posts.fetchPosts);
router.get('/posts/:id', _posts.singlePost)

/* Users */
router.get('/users/:id/password', _users.passwordReset);
router.get('/users', utils.auth, _users.fetchUsers);
router.get('/users/:id/institutions', _users.institutionApproval);

/** Organization Pages **/
router.get('/:name', _organizations.displayOrganization);

module.exports = router;