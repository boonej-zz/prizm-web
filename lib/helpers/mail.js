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


exports.sendInsightEmail = function(insightTarget) {
	console.log('send insight triggered');
	var creatorId = insightTarget.creator;
	var targetId 	= insightTarget.target;
	var insightId = insightTarget.insight;
	var html = '';
	var subject = '';
	Insight.findOne({_id: ObjectId(insightId)}, function (err, insight) {
		if (err) {
			console.log(err);
		};
		if (insight) {
			console.log('insight found');
			console.log('finding creator:' + creatorId);
			User.findOne({_id: ObjectId(creatorId)}, function (err, creator) {
				if (err) {
					console.log(err);
				};
				if (creator) {
					console.log('creator found: ' + creator.name);
					console.log('finding target: ' + targetId);
					User.findOne({_id: ObjectId(targetId)}, function (err, target) {
						if (err) {
							console.log(err);
						}
						if (target) {
							console.log('target found: ' + target.name);
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