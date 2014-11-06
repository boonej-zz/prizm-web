// var serial = require('serializer');
// var utils = require('../utils');
// var mongoURI = process.env.MONGOHQ_URL || 'mongodb://localhost/prizm';

var mongoose = require('mongoose');

var recordSchema = new mongoose.Schema({
  name:       String,
  age:        Number,
  gender:     String,
  cityState:  String,
  email:      String,
  mobile:     String
});

mongoose.model('Record', recordSchema);