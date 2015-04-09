var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var time       = require('../lib/helpers/date_time');

var messageSchema = new mongoose.Schema({
  creator: {type: ObjectId, ref: 'User', required: true},
  create_date: {type: Date, default: null, required: false, index: true},
  text: {type: String, default: ''},
  group: {type: String, required: true, index: true},
  organization: {type: ObjectId, ref: 'Organization', required: true, index: true}
});

messageSchema.pre('save', function(next){
  if (!this.create_date){
    this.create_date = Date.now();
  }
  next();
});

messageSchema.post('init', function(){
  this.timeSince = time.timeSinceFormatter(this.create_date);
});

messageSchema.statics.fetchMessages = function(criteria, next){
  this.model('Message').find(criteria)
  .sort({create_date: -1})
  .populate({path: 'creator'})
  .limit(15)
  .exec(function(err, messages){
    next(err, messages);
  });
};

mongoose.model('Message', messageSchema);
