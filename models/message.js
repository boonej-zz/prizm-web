var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var time       = require('../lib/helpers/date_time');
var User = mongoose.model('User');
var _ = require('underscore');
var util = require('util');


var messageSchema = new mongoose.Schema({
  creator: {type: ObjectId, ref: 'User', required: true},
  create_date: {type: Date, default: null, required: false, index: true},
  modify_date: {type: Date, default: null, required: false, index: true},
  text: {type: String, default: ''},
  group: {type: ObjectId, index: true},
  organization: {type: ObjectId, ref: 'Organization', required: true, index: true},
  likes: {type: Array},
  likes_count: {type: Number, default: 0},
  pretty_text: {type: String},
  web_text: {type: String},
  image_url: {type: String},
  meta: {
    message_id: {type: ObjectId, ref:'Message'},
    description: {type: String},
    title: {type: String},
    url: {type: String},
    video_url: {type: String},
    image: {
      message_id: {type: ObjectId, ref: 'Message'},
      url:  {type: String},
      width:  {type: Number},
      height: {type: Number}
    }
  },
  read: [ObjectId],
  status: {type: String, default: 'active'}
});

messageSchema.pre('save', function(next){
  if (!this.create_date){
    this.create_date = Date.now();
  }
  this.modify_date = Date.now();
  next();
});

messageSchema.post('init', function(){
  this.timeSince = time.timeSinceFormatter(this.create_date);
  this.web_text = this.text;
  if (this.meta) {
    this.meta.message_id = this._id;
    this.meta.image.message_id = this._id;
  }
  if (!this.read){
    this.read = [];
  }
});

var replaceTagsFromUserList = function(string, userList){
  var ps = '<a class="tag-link" href="/profiles/';
  var pm = '">@';
  var pe = '</a>';
  var newString = string;
  var match = string.match(/@\S{24}/g); 
  if (match && match.length > 0){
    console.log('matching');
    _.each(match, function(tag, idx, list){
      console.log(tag);
      if (tag && tag.length > 0){
        var uid = tag.substr(1);
        var mu = _.find(userList, function(user){
          return String(user._id) == uid;
        });
        if (mu) {
          var replace = ps + String(mu._id) + pm + mu.name + pe;
          newString = newString.replace(tag, replace);
        }
      }
    });
  }
  return newString;
};

messageSchema.statics.fetchMessages = function(criteria, next){
  criteria.status = {$ne: 'inactive'};
  this.model('Message').find(criteria)
  .sort({create_date: -1})
  .populate({
    path: 'creator',
    select: {
      _id: 1,
      name: 1,
      profile_photo_url: 1,
      subtype: 1,
      org_status: {$elemMatch: {
        organization: criteria.organization || null,
        status: 'active'
      }} 
    }
  })
  .limit(15)
  .exec(function(err, messages){
    _.each(messages, function(message, index, list){
        User.resolvePostTags(message, function(err, users){
          if (users && users.length > 0){
            if (message.text) {
              message.web_text = replaceTagsFromUserList(message.text, users);
            }
          }
          if (index == (list.length -1)){
            next(err, messages);
          }
        });
    });
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

messageSchema.statics.deleteMessage = function(id, next){
  this.findOneAndUpdate({_id: id}, {status: 'inactive'}, function(err, result){
    next(err, result);
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

messageSchema.methods.prettyText = function(next) {
  var User = mongoose.model('User');
  var $this = this;
  User.resolvePostTags(this, function(err, users){
    var prettyText = $this.text;
    var match = $this.text.match(/@\S{24}/g);
    if (match && match.length > 0) {
      _.each(match, function(tag, idx, list){
        var uid = tag.substr(1);
        var mu = _.find(users, function(user){
          return String(user._id) == String(uid);
        });
        if (mu){
          prettyText = prettyText.replace(tag, '@' + mu.name);
        }
      });
    } 
    next(prettyText);
  });
};


mongoose.model('Message', messageSchema);
