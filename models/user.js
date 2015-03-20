var serial = require('serializer');
var utils = require('../utils');
var _ = require('underscore');
var moment = require('moment');
var mongoose = require('mongoose');
var ObjectId          = require('mongoose').Types.ObjectId;
var ObjectIdType      = mongoose.Schema.Types.ObjectId;

var orgStatusSchema = new mongoose.Schema({
  organization          : {type: ObjectIdType, ref: 'Organization', required: true},
  status                : {type: String, default: 'pending', required: true},
  create_date           : {type: Date, default: Date.now()}
})

var userSchema = new mongoose.Schema({
  age                   : {type: Number, default: 0},
  name                  : {type: String, default: ''},
  first_name            : {type: String, required: true},
  last_name             : {type: String, default: ''},
  email                 : {type: String, required: true,
                          index: {unique: true}, lowercase: true},
  info                  : {type: String, default: null},
  website               : {type: String, default: null},
  ethnicity             : {type: String, default: null},
  religion              : {type: String, default: null},
  phone_number          : {type: String, default: null},
  affiliations          : {type: Array, default:[]},
  password              : {type: String, default: null},
  provider              : {type: String, default: null},
  provider_id           : {type: String, default: null},
  provider_token        : {type: String, default: null},
  provider_token_secret : {type: String, default: null},
  last_provider_auth    : {type: Date, default: null},
  gender                : {type: String, default: null},
  birthday              : {type: String, default: null},
  address               : {type: String, default: null},
  city                  : {type: String, default: null},
  country               : {type: String, default: null},
  state                 : {type: String, default: null},
  zip_postal            : {type: String, default: null},
  cover_photo_url       : {type: String, default: null},
  profile_photo_url     : {type: String, default: null},
  create_date           : {type: Date, default: null},
  modify_date           : {type: Date, default: null},
  delete_date           : {type: Date, default: null},
  last_login_date       : {type: Date, default: null},
  posts_count           : {type: Number, default: 0},
  following             : {type: Array, default: []},
  followers             : {type: Array, default: []},
  following_count       : {type: Number, default: 0},
  followers_count       : {type: Number, default: 0},
  trust_count           : {type: Number, default: 0},
  type                  : {type: String, default: 'user'},
  date_founded          : {type: Date, default: null},
  mascot                : {type: String, default: null},
  enrollment            : {type: Number, default: null},
  instagram_token       : {type: String, default: null},
  instagram_min_id      : {type: String, default: null},
  twitter_token         : {type: String, default: null},
  twitter_min_id        : {type: String, default: null},
  tumblr_token          : {type: String, default: null},
  tumblr_min_id         : {type: String, default: null},
  tumblr_token_secret   : {type: String, default: null},
  review_key            : {type: String, default: null},
  reset_key             : {type: String, default: null},
  reset_date            : {type: String, default: null},
  password_reset        : {type: String, default: null},
  device_token          : {type: String, default: null},
  subtype               : {type: String, default: null},
  badge_count           : {type: Number, default: 0},
  active                : {type: Boolean, default: true},
  program_code          : {type: String, default: null},
  interests             : {type: Array, default: []},
  insight_count         : {type: Number, default: 0},
  unsubscribed          : {type: Boolean, default: false},
  pwd_updated           : {type: Boolean, default: false},
  org_status            : [orgStatusSchema],
  theme                 : {type: ObjectIdType, ref: 'Theme', required: false}
},{ versionKey          : false });

userSchema.statics.basicFields = function(){
  return '_id name first_name last_name profile_photo_url type active subtype';
}


userSchema.methods.createUserSalt = function(){
  return serial.stringify(this._id+this.create_date.valueOf()+this.email);
};

userSchema.methods.hashPassword = function(){
  if(this.password) {
    var salt = process.env.PRIZM_SALT;
    var pass = this.password;
    this.password = utils.prismEncrypt(this.password, salt);
    this.pwd_updated = true;
    if (this.password != pass){
      return true;
    }
  }
  return false;
};

userSchema.methods.validatePassword = function(password) {
  var salt = process.env.PRIZM_SALT;
  var hashed_password = utils.prismEncrypt(password, salt);
  if (_.isEqual(this.password, hashed_password)) {
    return true;
  }
  else {
    var old_salt = this.createUserSalt();
    hashed_password = utils.prismEncrypt(password, old_salt);
    if (_.isEqual(this.password, hashed_password)) {
      this.password = password;
      this.pwd_updated = true;
      if (this.hashPassword()){
        this.save();
        return true;
      }
    }
  }
  return false;
};

userSchema.methods.mixpanelProperties = function(){
  return {
    $name: this.name,
    $first_name: this.first_name,
    $last_name: this.last_name,
    $create: this.date_created,
    $email: this.email,
    Birthday: this.birthday,
    Age: this.age,
    Gender: this.gender,
    Origin: this.city || 'unknown',
    State: this.state || 'unknown',
    Zip: this.zip || 'unknown',
    'Total Posts': this.posts_count || 0,
    Interests: this.interests,
    Source: 'website'
  };
};

userSchema.methods.userBelongsToOrganization = function(org_id) {
  var match = false;
  _.each(this.org_status, function(org_status) {
    if (org_id == org_status.organization || 
      String(org_id) == String(org_status.organization._id)) {
      match = true
    }
  })
  return match;
};
userSchema.methods.fetchHomeFeedCriteria = function(next){
  var following = _.pluck(this.following, '_id');
  var Trust = mongoose.model('Trust');
  var user = this;
  Trust.find({
    status: 'accepted',
    $or: [
      {to: user._id},
      {from: user._id}
    ]
  }, function(err, trusts){
    var trustArray = [];
    if (err) {
      console.log(err);
      next(err);
    }
    else {
      if (_.has(trusts, 'length')){
        _.each(trusts, function(trust, idx, list){
          if (String(trust.to) == String(user._id)){
            trustArray.push(trust.from);
          } else {
            trustArray.push(trust.to);
          }
        });
      }
      var criteria = {
        $or: [
          {scope: 'public', status: 'active', creator: {$in: following}},
          {scope: {$in: ['trust', 'public']}, status: 'active', creator: {$in: trustArray}},
          {creator: this._id, status: 'active'}
        ],
        is_flagged: false
      };
      next(null, criteria);
    }
  });
}

userSchema.statics.findOrganizationMembers = function(filters, next) {
  var $this = this;
  var Trust = mongoose.model('Trust');
  Trust.find({
    status: 'accepted',
    from: this._id
  }, function(err, trusts){
      var trustArray = [];
      if (_.has(trusts, 'length')){
        trustArray = _.pluck(trusts, 'to');
      } 
      $this.model('User').find({$or: [
        {'org_status': {$elemMatch: filters}},
        {_id: {$in: trustArray}}
      ]}, function(err, users){
        next(err, users);
      });
  });
};


userSchema.pre('save', function(next){
  var birthday = this.birthday?this.birthday.split('-'):false;
  var name;

  if (birthday && birthday.length == 3) {
    birthday = [birthday[2], birthday[0] - 1, birthday[1]];
    birthday = moment(birthday);
    diff = moment().diff(birthday, 'years');
    if (diff != this.age) {
      this.age = diff;
    }
  }
  if (!this.create_date) {
    this.create_date = Date.now();
  }
  if (this.last_name == '') {
    name = this.first_name;
  }
  else {
    name = this.first_name + ' ' + this.last_name;
  }
  this.name = name;
  this.modify_date = Date.now();
  next();
});

/**
 * Takes a comment and resolves all user IDs present in the list and 
 * returns the reformatted string. 
 */
userSchema.statics.resolvePostTags = function(post, next){
  console.log('resolving post tags');
  var postText = post.text || '';
  var commentText = _.pluck(post.comments, 'text');
  commentText.push(postText);
  var userArray = [];
  _.each(commentText, function(comment, idx, list){
    var match = comment.match(/@\S{24}/g);  
    if (match) {
      _.each(match, function(item, idx, list){
        userArray.push(item.substr(1));  
      });
    }
  });
  this.model('User').find({_id: {$in: userArray}}, '_id name', function(err, users){
    next(err, users);
  });
};

/**
 * Takes a user ID and creates a follower entry for current user
 **/
userSchema.methods.addFollower = function(follower_id, next) {
  var User = this.model('User');
  var userId = this._id;
  var followDate  = Date.now();
  var followerCount;
  var followerObject = {};

  function updateFollowers (next) {

    var update = {
      $addToSet: {
        followers: followerObject
      }
    };

    var criteria = {
      _id: userId,
      followers: {
        $elemMatch: {
          _id: follower_id
        }
      }
    };
    console.log('Checking if ' + follower_id + " is following " + userId);
    User.findOne(criteria, function(err, user) {
      if (user) {
        var index;
        _.each(user.followers, function(follower, idx, list){
          if (String(follower._id) == String(follower_id)) {
            index = idx;
          }
        });
        user.followers.splice(index, 1);
        user.followers_count -= 1;
        user.save();
        next(null, user);
      }
      else {
        console.log('Updating followers with: ' + update);
        User.findOneAndUpdate({_id: userId}, update, function(err, user) {
          if (err) {
            next(err);
          }
          if (user) {
            next(null, user);
          }
          else {
            next('User Id no longer valid');
          }
        });    
      }
    });
  };

  function updateFollowersCount(next) {
    
    console.log('Updating followers count..');
    User.findOne({_id: userId}, function(err, user) {
      if (err) next(err);
      if (user) {
        console.log(user.email);
        followersCount = user.followers.length;
        console.log('followers count is ' + followersCount);
        User.update({_id: userId}, {followers_count: followersCount}, function(err, user) {
          if (err) next(err);
          if (user) {
            next(null, user);
          }
        });
      }
    });
  };

  User.find({_id: ObjectId(follower_id)}, function(err, user) {
    console.log('Valid follower id');
    if (err) next(err);
    if (user) {
      followerObject._id = follower_id;
      followerObject.date = followDate;
      console.log(followerObject._id);
      console.log(followerObject.date);

      updateFollowers(function(err, user) {
        if (err) next(err);
        if (user) {
          updateFollowersCount(function(err, user) {
            if (err) next(err);
            else {
              next(null, user);
            }
          });
        }
        else {
          next(err);
        }
      }); 
    }
    else {
      next('Invalid follower_id');
    }
  });
};

/**
 * Takes a user ID and creates a following entry for current user
 **/

userSchema.methods.addFollowing = function(following_id, next) {
  var User = this.model('User');
  var userId = this._id;
  var followDate  = Date.now();
  var followingCount;
  var followingObject = {};

  function updatefollowing (next) {

    var update = {
      $addToSet: {
        following: followingObject
      }
    };

    var criteria = {
      _id: userId,
      following: {
        $elemMatch: {
          _id: following_id
        }
      }
    };
    console.log('Checking if ' + following_id + " is following " + userId);
    User.findOne(criteria, function(err, user) {
      if (user) {
        var index;
        _.each(user.following, function(follower, idx, list){
          if (String(follower._id) == String(following_id)) {
            index = idx;
          }
        });
        user.following_count -= 1;
        user.following.splice(index, 1);
        user.save();
        next(null, user);
      }
      else {
        console.log('Updating following with: ' + update);
        User.findOneAndUpdate({_id: userId}, update, function(err, user) {
          if (err) {
            next(err);
          }
          if (user) {
            next(null, user);
          }
          else {
            next('User Id no longer valid');
          }
        });    
      }
    });
  };

  function updatefollowingCount(next) {
    
    console.log('Updating following count..');
    User.findOne({_id: userId}, function(err, user) {
      if (err) next(err);
      if (user) {
        console.log(user.email);
        followingCount = user.following.length;
        console.log('following count is ' + followingCount);
        User.update({_id: userId}, {following_count: followingCount}, function(err, user) {
          if (err) next(err);
          if (user) {
            next(null, user);
          }
        });
      }
    });
  };

  User.find({_id: ObjectId(following_id)}, function(err, user) {
    console.log('Valid following id');
    if (err) next(err);
    if (user) {
      followingObject._id = following_id;
      followingObject.date = followDate;
      console.log(followingObject._id);
      console.log(followingObject.date);

      updatefollowing(function(err, user) {
        if (err) next(err);
        if (user) {
          updatefollowingCount(function(err, user) {
            if (err) next(err);
            else {
              next(null, user);
            }
          });
        }
        else {
          next(err);
        }
      }); 
    }
    else {
      next('Invalid following_id');
    }
  });
};

mongoose.model('User', userSchema);
