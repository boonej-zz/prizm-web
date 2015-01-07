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

/* PASSPORT */
// var LocalStrategy = require('passport-local').Strategy;
// var mongoose    = require('mongoose');
// var User        = mongoose.model('User');

// passport.use(new LocalStrategy({
//     usernameField: 'email',
//     passwordField: 'password'
//   },
//   function(email, password, done) {
//     User.findOne({ email: email }, function(err, user) {
//       if (err) { return done(err); }
//       if (!user) {
//         return done(null, false, { message: 'Incorrect username.' });
//       }
//       if (!user.validatePassword(password)) {
//         return done(null, false, { message: 'Incorrect password.' });
//       }
//       return done(null, user);
//     });
//   }
// ));

// passport.serializeUser(function(user, done) {
//   done(null, user.email);
// });

// passport.deserializeUser(function(email, done) {
//   User.findOne( { email: email } , function (err, user) {
//     done(err, user);
//   });
// });

router.get('/login', _users.displayLogin);
router.post('/login', _users.handleLogin);
router.get('/logout', _users.handleLogout);


// router.get('/login', function(req, res) {
//   res.render('login');
// });
// router.post('/login', function(req, res, next) {
//   passport.authenticate('local', function(err, user, info) {
//     if (err) { return next(err) }
//     if (!user) {
//       req.session.messages =  [info.message];
//       return res.redirect('/login')
//     }
//     req.logIn(user, function(err) {
//       if (err) { return next(err); }

//       return res.redirect('/testLogin');
//     });
//   })(req, res, next);
// });

router.get('/testLogin', function(req, res) {
  if (req.isAuthenticated()) {
    res.send(req.user);
  }
  else {
    res.send("NOPE!" + req.user);
  }
});

// router.get('/logout', function(req, res) {
//   req.logout();
//   res.redirect('/login');
// })


/** Organization Pages **/
router.get('/:name', _organizations.displayOrganization);


module.exports = router;