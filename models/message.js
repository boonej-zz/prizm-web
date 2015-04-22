var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var time       = require('../lib/helpers/date_time');
var _ = require('underscore');


var messageSchema = new mongoose.Schema({
  creator: {type: ObjectId, ref: 'User', required: true},
  create_date: {type: Date, default: null, required: false, index: true},
  text: {type: String, default: ''},
  group: {type: ObjectId, index: true},
  organization: {type: ObjectId, ref: 'Organization', required: true, index: true},
  likes: {type: Array},
  likes_count: {type: Number, default: 0},
  meta: {
    description: {type: String},
    title: {type: String},
    image: {
      url:  {type: String},
      width:  {type: Number},
      height: {type: Number}
    }
  }
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
  .populate({
    path: 'creator',
    select: '_id name profile_photo_url'
  })
  .limit(15)
  .exec(function(err, messages){
    next(err, messages);
  });
};

messageSchema.statics.likeMessage = function(id, user, next){
  this.model('Message').findOne({_id: id}, function(err, message){
    if (err) next(err, false);
    if (message) {
      console.log(message);
      if (!message.likes) message.likes = [];
      message.likes.push(user._id);
      message.likes_count += 1;
      message.save(function(e, r){
        next(e,r);    
      });
    } else {
      next(true, false);
    }
  });
};

messageSchema.statics.unlikeMessage = function(id, user, next){
  this.model('Message').findOne({_id: id}, function(err, message){
    if (err) next(err, false);
    if (message) {
      if (message.likes) {
        var idx = false;
        _.each(message.likes, function(p, i, l){
          if (String(p) == String(user._id)){
            idx = i;
          }
        });
        message.likes.splice(idx, 1);
        message.likes_count -= 1;
        message.save(function(e, r){
          next(e,r);    
        });
      } else {
        next(true, false);
      } 
     
    } 
  });
};

mongoose.model('Message', messageSchema);
