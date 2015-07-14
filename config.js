/* Passport Configuration */
var passport          = require('passport');
var LocalStrategy     = require('passport-local').Strategy;
var FacebookStrategy  = require('passport-facebook').Strategy;
var TwitterStrategy   = require('passport-twitter').Strategy;
var mongoose          = require('mongoose');
var User              = mongoose.model('User');
var _                 = require('underscore');
var util = require('util');

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  function(email, password, done) {
    User.findOne({ email: email }, function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (!user.validatePassword(password)) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: '1408826952716972',
    clientSecret: '772f449b10c95a10a2a9a866339e5f90',
    callbackURL: "https://www.prizmapp.com/login/facebook"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile);
    var t = accessToken;
    User.findOne({provider: 'facebook', provider_id: profile.id}, function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, profile, t );
      }
      done(null, user);
    });
  }
));

passport.use(new TwitterStrategy({
    consumerKey: 'MzIoqUFCk7BYUNpCNxtGuhuLu',
    consumerSecret: 'yGhuwPvSljoVJoD4il2qtHZG0q4hWlXC87Mcdly0pxaFrMHEaf',
    callbackURL: "https://www.prizmapp.com/login/twitter"
  },
  function(token, tokenSecret, profile, done) {
    console.log('Profile ID: ' + profile.id);
    var data = {};
    data.twitter_token = token;
    data.profile = profile;
    console.log(data);
    User.findOne({provider: 'twitter', provider_id: profile.id}, function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, data);
      }
      done(null, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.email);
});

passport.deserializeUser(function(email, done) {
  User.findOne( { email: email })
  .populate({
    path: 'org_status.organization'
  })
  .populate({
    path: 'org_status.groups',
    model: 'Group'
  })
  .populate({
    path: 'interests',
    model: 'Interest'
  })
  .exec(function (err, user) {
    if (user) {
    user.isLeader = false;
    _.each(user.org_status, function(s, i, l){
      if (s.status == 'active' && s.role && s.role == 'leader'){
        user.isLeader = true;
      }
    });
    user.mixpanel = user.mixpanelProperties();
    user.heap = user.heapProperties();
    }
    User.findOneAndUpdate({_id: user._id}, {$set: {last_login_date: Date.now()}}, 
      function(err, res){
        if (err) console.log(err); 
      }); 
    done(err, user);
  });
});

/* Tokens */
exports.mailchimp = {
  client_id:     process.env.MAILCHIMP_ID,
  client_secret: process.env.MAILCHIMP_SECRET
}

exports.mandrill = {
  client_secret:  process.env.MANDRILL_SECRET
}
