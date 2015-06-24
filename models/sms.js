var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var smsSchema = new mongoose.Schema({
  sid: {type: String},
  date_created: {type: Date},
  date_updated: {type: Date},
  date_sent: {type: Date},
  account_sid: {type: String},
  to: {type: String},
  from: {type: String},
  body: {type: String},
  status: {type: String},
  direction: {type: String},
  api_version: {type: String},
  price: {type: String},
  price_unit: {type: String},
  uri: {type: String},
  num_segments: {type: String}
});

mongoose.model('SMS', smsSchema);

