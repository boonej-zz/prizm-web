/* Passport Configuration */
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose    = require('mongoose');
var User        = mongoose.model('User');

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

passport.serializeUser(function(user, done) {
  done(null, user.email);
});

passport.deserializeUser(function(email, done) {
  User.findOne( { email: email } , function (err, user) {
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
