var mongoURI = process.env.MONGOHQ_URL || 'mongodb://localhost/prizm';
var mongoose = require('mongoose');

/** Register Models with Mongo DB **/
exports.user          = require('./user');
exports.activity      = require('./activity');
exports.insight       = require('./insight');
exports.post          = require('./post');
exports.record        = require('./record');
exports.interest      = require('./interest');
exports.insightTarget = require('./insight_target');
exports.organization  = require('./organization');
exports.trust         = require('./trust');
exports.message       = require('./message');
exports.group         = require('./group');
exports.invite        = require('./invite');
exports.SMS           = require('./sms');
exports.notification  = require('./notification');
exports.survey        = require('./survey');

mongoose.connect(mongoURI);
