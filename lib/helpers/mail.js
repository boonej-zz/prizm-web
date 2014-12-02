var mongoose 	= require('mongoose');
var Insight 	= mongoose.model('Insight');
var User 			= mongoose.model('User');

var mandrill = require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';


exports.sendInsightEmail = function(insightTarget) {
	console.log('send insight triggered');
	console.log('this is this: ' + this);
	var insightCreator = this.creator;
	var insightTarget = this.target;
	var html = '';
	var subject = '';
	Insight.findOne({_id: ObjectId(insightTarget.insight)}, function (err, insight) {
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
																							 target: target,
																							 insight: insight});
							console.log('Insight title: ' + insight.title);
							console.log('Insight link: ' + insight.link);
							console.log('Insight file_path: ' + insight.file_path);
							console.log('Insight hash tags: ' + insight.hash_tags);
							console.log('Creator name: ' + creator.name);
							console.log('Creator Profile Photo: ' + creator.profile_photo_url);
							console.log('HTML: ' + html);
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