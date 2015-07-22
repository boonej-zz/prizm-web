var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var _ = require('underscore');

var answerSchema = new mongoose.Schema({
  user: {type: ObjectId, ref: 'User', required: true},
  value: {type: Number, required: true},
  create_date: {type: Date}
});

answerSchema.pre('save', function(next){
  if (!this.create_date) {
    this.create_date = Date.now();
  }
  next();
});

var questionSchema = new mongoose.Schema({
  text: {type: String, required: true},
  type: {type: String, required: true},
  values: [{question: {type: String}, order: {type: Number}}],
  scale: {type: Number},
  create_date: {type: Date},
  modify_date: {type: Date},
  order: {type: Number},
  answers: [ObjectId]
});

questionSchema.pre('save', function(next){
  if (!this.create_date) {
    this.create_date = Date.now();
  }
  this.modify_date = Date.now();
  next();
});

var surveySchema = new mongoose.Schema({
  name: {type: String, required: true},
  creator: {type: ObjectId, ref: 'User', required: true},
  create_date: {type: Date},
  modify_date: {type: Date},
  organization: {type: ObjectId, ref: 'Organization', required: true},
  groups: [ObjectId],
  number_of_questions: {type: Number},
  questions: [ObjectId],
  completed: [ObjectId],
  targeted_users: [{user: {type: ObjectId, ref: 'User'}, create_date: {type: Date}}],
  target_all: {type: Boolean, default: false}
});

surveySchema.pre('save', function(next){
  if (!this.create_date){
    this.create_date = Date.now();
  }
  this.modify_date = Date.now();
  next();
});

mongoose.model('Answer', answerSchema);
mongoose.model('Question', questionSchema);
mongoose.model('Survey', surveySchema);
