var mongoose 	= require('mongoose');
var config 		= require('../config');
var jade 			= require('jade');
var path 			= require('path');
var fs 				= require('fs');
var User = mongoose.model('User');
var Insight = mongoose.model('Insight');
var ObjectId 	= require('mongoose').Types.ObjectId;
var mandrill 	= require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';
var insightMail = fs.readFileSync(path.join(__dirname +
      						'/../views/insight_email.jade'), 'utf8');

var insightTargetSchema = new mongoose.Schema({
  create_date     : {type: Date, default: null, required: false, index: true},
  insight         : {type: mongoose.Schema.Types.ObjectId, ref: 'Insight', required: true},
  creator         : {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  target          : {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  liked           : {type: Boolean, default: false},
  disliked        : {type: Boolean, default: false},
  file_path       : {type: String, default: null}
});

insightTargetSchema.pre('save', function(next){
  this.create_date = Date.now();
  next();
});

insightTargetSchema.methods.sendInsightEmail = function() {
	console.log('send insight triggered');
	var insightCreator = this.creator;
	var insightTarget = this.target;
	var html = '';
	var subject = '';
	Insight.findOne({_id: ObjectId(this.insight)}, function (err, insight) {
		if (err) {
			console.log(err);
		};
		if (insight) {
			console.log('insight found');
			console.log('finding creator:' + insight.creator);
			User.findOne({_id: ObjectId(insight.creator)}, function (err, creator) {
				if (err) {
					console.log(err);
				};
				if (creator) {
					console.log('creator found: ' + creator.name);
					console.log('finding target: ' + insightTarget);
					User.findOne({_id: ObjectId(insightTarget)}, function (err, target) {
						if (err) {
							console.log(err);
						}
						if (target) {
							console.log('target found');
							subject = 'New Insight from Prizm';
							html = jade.render(insightMail, {creator: creator,
																							 insight: insight});
							mandrill(mandrillEndpointSend, {
								message: {to: [{email: target.email}],
													from_email: creator.email,
													subject: subject,
													html: html}
							}, function (err, response) {
								if (err) {
									console.log('MANDRILL ERROR RETURNED: ' + JSON.stringify(err));
								};
								if (response) {
									console.log(JSON.stringify(response));
								}
							});
						};
					});
				};
			});
		};
	});
};

mongoose.model('InsightTarget', insightTargetSchema);