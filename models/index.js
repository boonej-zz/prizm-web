var mongoURI = process.env.MONGOHQ_URL || 'mongodb://localhost/prizm';
var mongoose = require('mongoose');

/** Register Models with Mongo DB **/
exports.activity = require('./activity');
exports.insight = require('./insight');
exports.insightTarget = require('./insightTarget');
exports.post = require('./post');
exports.record = require('./record');
exports.user = require('./user');

mongoose.connect(mongoURI);