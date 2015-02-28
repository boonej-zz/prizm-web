require('./user.js');
var mongoose      = require('mongoose');
var ObjectId      = require('mongoose').Types.ObjectId;
var ObjectIdType  = mongoose.Schema.Types.ObjectId;
var _ = require('underscore');
var User = mongoose.model('User');
var _utils = require('../utils');

var commentSchema = new mongoose.Schema({
  text                : { type: String, default: null, required: true },
  creator             : { type: ObjectIdType, ref: 'User'},
  create_date         : { type: Date, default: Date.now() },
  likes               : [],
  likes_count         : {type: Number, default: 0},
  tags                : {type: Array, default: []},
  hash_tags           : {type: Array, default: []},
  tags_count          : {type: Number, default: 0},
  hash_tags_count     : {type: Number, default: 0},
  status              : {type: String, default: 'active'}
});


var postSchema = new mongoose.Schema({
  _id                 : {type: ObjectIdType, required:true},
  text                : {type: String, default: null},
  category            : {type: String, required:true},
  create_date         : {type: Date, default:null, index: true},
  modify_date         : {type: Date, default: Date.now()},
  delete_date         : {type: Date, default: null},
  scope               : {type: String, default: 'public'},
  location_name       : {type: String, default: null},
  location_longitude  : {type: Number, default: 0},
  location_latitude   : {type: Number, default: 0},
  creator             : {type: ObjectIdType, ref: 'User'},
  status              : {type: String, default: 'active'},
  file_path           : {type: String, default: ''},
  likes_count         : {type: Number, default: 0},
  comments_count      : {type: Number, default: 0},
  tags_count          : {type: Number, default: 0},
  tags                : {type: Array, default: []},
  comments            : [commentSchema],
  likes               : {type: Array, default: []},
  hash_tags           : [String],
  hash_tags_count     : {type: Number, default: 0},
  is_flagged          : {type: Boolean, default: false},
  flagged_count       : {type: Number, default: 0},
  flagged_reporters   : [{reporter_id: String, create_date: Date}],
  is_repost           : {type: Boolean, default: false},
  origin_post_id      : {type: String, default: null},
  external_provider   : {type: String, default: null},
  external_link       : {type: String, default: null},
  type                : {type: String, default: 'user'},
  subtype             : {type: String, default: null},
  scope_modify_date   : {type: Date, default: null},
  accolade_target     : {type: String, default: null}
}, { versionKey: false});



postSchema.statics.findPostsForProfileByUserId = function(user_id, is_current, is_trust, next) {
  criteria = {
    creator: ObjectId(user_id),
    status: 'active'
  };
  if (!is_current) {
    console.log('not current');
    criteria.category = {$ne: 'personal'};
    if (!is_trust){
      criteria.$and = [{scope: {$ne: 'private'}}, {scope: {$ne: 'trust'}}];
    } else {
      criteria.scope = {$ne: 'private'};
    }
  }
  this.model('Post')
    .find(criteria)
    .sort({ create_date: -1, _id: -1 })
    .limit(21)
    .exec(function(err, posts) {
      if (err) {
        next(err);
      }
      else {
        next(null, posts);
      }
    });
};


/**
 * Takes userId and callback and will add userId to likes of post
 * and update the likes_count
 */
postSchema.methods.likePost = function(userId, next) {
  var postId = this._id;
  var Post = this.model('Post');

  function updateLikes(userId, next) {

    var update = {
      $addToSet: {
        likes: {
          _id: userId
        }
      }
    };
    
    // Create criteria to see if userId already liked this post
    var criteria = {
      _id: postId,
      likes: {
        $elemMatch: {
          _id: userId
        }
      }
    };

    // Check if userId already liked post
    Post.findOne(criteria, function(err, post) {
      if (err) next(err);
      if (post) {
        next('Already liked post');
      }
      else {
        Post.findOneAndUpdate({_id: postId}, update, function(err, post) {
          if (err) next(err);
          if (post) {
            next(null, post);
          }
          else {
            next('Post Id is not longer valid');
          }
        });
      }
    });
  }

  function updateLikesCount(next) {
    var likesCount;

    Post.findOne({_id: userId}, function(err, post) {
      if (err) next(err);
      if (post) {
        likesCount = post.likes.length;
        Post.update({_id: postId}, {likes_count: likesCount}, function(err, post) {
          if (err) next(err);
          if (post) {
            next(null, post)
          }
          else {
            next('likes_count update unsuccessful');
          }
        });
      }
    });
  }

  updateLikes(userId, function(err, post) {
    if (err) next(err);
    if (post) {
      updateLikesCount(function(err, post) {
        if (err) next(err);
        else {
          next(null, post);
        }
      });
    }
  });
};

/**
 * Takes userId and callback and will remove userId from post likes array
 * and update likes_count
 */
postSchema.methods.unlikePost = function(userId, next) {
  var postId = this._id;
  var Post = this.model('Post');

  function updateLikes(userId, next) {

    var update = {
      $pull: {
        likes: userId
      }
    };
    
    // Create criteria to see if userId likes post
    var criteria = {
      _id: postId,
      likes: {
        $elemMatch: {
          _id: userId
        }
      }
    };

    // Check if userId likes post
    Post.findOne(criteria, function(err, post) {
      if (err) next(err);
      if (!post) {
        next('Post not liked');
      }
      else {
        Post.findOneAndUpdate({_id: postId}, update, function(err, post) {
          if (err) next(err);
          if (post) {
            next(null, post);
          }
          else {
            next('Post Id is not longer valid');
          }
        });
      }
    });
  }

  function updateLikesCount(next) {
    var likesCount;

    Post.findOne({_id: userId}, function(err, post) {
      if (err) next(err);
      if (post) {
        likesCount = post.likes.length;
        Post.update({_id: postId}, {likes_count: likesCount}, function(err, post) {
          if (err) next(err);
          if (post) {
            next(null, post)
          }
          else {
            next('likes_count update unsuccessful');
          }
        });
      }
    });
  }

  updateLikes(userId, function(err, post) {
    if (err) next(err);
    if (post) {
      updateLikesCount(function(err, post) {
        if (err) next(err);
        else {
          next(null, post);
        }
      });
    }
  });
};

postSchema.post('init', function(post){
  post.formattedText = post.text;
  _.each(post.comments, function(comment, idx, list){
    comment.formattedText = comment.text;
  });
});


mongoose.model('Post', postSchema);
