/* Passport Configuration */
var passport          = require('passport');
var LocalStrategy     = require('passport-local').Strategy;
var FacebookStrategy  = require('passport-facebook').Strategy;
var TwitterStrategy   = require('passport-twitter').Strategy;
var mongoose          = require('mongoose');
var User              = mongoose.model('User');

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
    callbackURL: "https://prizmapp.com/login/facebook"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log('Profile ID: ' + profile.id);
    User.findOne({provider: 'facebook', provider_id: profile.id}, function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      done(null, user);
    });
  }
));

passport.use(new TwitterStrategy({
    consumerKey: 'MzIoqUFCk7BYUNpCNxtGuhuLu',
    consumerSecret: 'yGhuwPvSljoVJoD4il2qtHZG0q4hWlXC87Mcdly0pxaFrMHEaf',
    callbackURL: "https://prizmapp.com/login/twitter"
  },
  function(token, tokenSecret, profile, done) {
    console.log('Profile ID: ' + profile.id);
    User.findOne({provider: 'twitter', provider_id: profile.id}, function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      done(null, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  console.log("User being serialized: " + user.first_name);
  done(null, user.email);
});

passport.deserializeUser(function(email, done) {
  User.findOne( { email: email })
  .populate({
    path: 'org_status.organization'
  })
  .exec(function (err, user) {
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
