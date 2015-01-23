var mongoose 		= require('mongoose');
var config 			= require('../../config');
var fs 					= require('fs');
var path 				= require('path');
var jade 				= require('jade');
var insightMail = fs.readFileSync(path.join(__dirname +
      						'/../../views/insight_email.jade'), 'utf8');
var Insight 		= mongoose.model('Insight');
var User 				= mongoose.model('User');
var ObjectId 		= require('mongoose').Types.ObjectId;
var mandrill 		= require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';

var Mixpanel = require('mixpanel');
var mixpanel = Mixpanel.init('831cd11c7aedb1175765d2a9583c5cff');

var emailSubjects = ['New Insight from Prizm',
                    'Oh, this? It’s for you.',
                    'Awesome stuff for you!',
                    'Cool stuff alert!',
                    'Did you see this?',
                    'Special delivery!',
                    'You gotta see this!',
                    'Happy Holidays from Prizm!',
                    'Happy New Year from Prizm!']

exports.unsubscribeUserByEmail = function(email, callback) {
	var distinctId = '';
  User.findOneAndUpdate({email: email}, {unsubscribed: true}, function(err, user) {
  	if (err) {
  		console.log(err);
  		callback(err, null);
  	}
  	if (user) {
      // distinctId = user._id;
      // mixpanel.people.set(distinctId, {
      //   '$unsubscribed': true
      // })
		  console.log("user was unsubscribed");
      callback(null, user);
  	}
  });
}

exports.subscribeUserByEmail = function(email, callback) {
	User.findOneAndUpdate({email: email}, {unsubscribed: false}, function(err, user){
		if (err) {
  		console.log(err);
  		callback(err, null);
  	}
  	if (user) {
  		console.log('user was subscribed');
      callback(null, user);
  	}
	})
}

exports.sendInsightEmail = function(insightTarget, index) {
  var creatorId = insightTarget.creator;
  var targetId 	= insightTarget.target;
  var insightId = insightTarget.insight;
  var html = '';
  var subject = emailSubjects[index];
  console.log(subject);
  Insight.findOne({_id: ObjectId(insightId)}, function (err, insight) {
    if (err) {
      console.log(err);
    };
    if (insight) {
      User.findOne({_id: ObjectId(creatorId)}, function (err, creator) {
        if (err) console.log(err);
        if (creator) {
          User.findOne({_id: ObjectId(targetId)}, function (err, target) {
            if (err) console.log(err);
            if (target) {
              if (target.unsubscribed == false) {
                html = jade.render(insightMail, {
                  creator: creator,
                  target: target,
                  insight: insight
                });
                mandrill(mandrillEndpointSend, {
                  message: {to: [{email: target.email}],
                  from_name: 'Prizm',
                  from_email: 'insight@prizmapp.com',
                  subject: subject,
                  html: html}
                }, function (err, response) {
                  if (err) {
                    console.log('MANDRILL ERROR RETURNED: ' + 
                      JSON.stringify(err));
                  };
                  if (response) {
                    console.log(JSON.stringify(response));
                  }
                });
              } else {
                console.log("User has unsubscribed");
              }
            }
          });
        };
      });
    };
  });
};

module.exports.emailSubjects = emailSubjects;
