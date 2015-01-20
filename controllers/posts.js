// Posts Controller
var express   = require('express');
var router    = express.Router();
var mongoose  = require('mongoose');
var ObjectId  = require('mongoose').Types.ObjectId;
var Post      = mongoose.model('Post');
var _         = require('underscore');
var _time     = require('../lib/helpers/date_time');
var fs        = require('fs');
var path      = require('path');
var jade      = require('jade');
var postFeed  = fs.readFileSync(path.join(__dirname +
                '/../views/post_feed.jade'), 'utf8');


// Posts Methods
exports.fetchPosts = function(req, res) {
  if (req.accepts('html')) {
    res.status(406).send({ error: "Not acceptable"});
  }
  if (req.accepts('application/json')) {
    var creator = req.get('creator');
    var lastPost = req.get('lastPost');
    var limit = req.get('limit');
    if (limit == undefined) {
      limit = 20;
    }
    Post.findOne({_id: ObjectId(lastPost)}, function(err, post) {
      if (err) {
        console.log(err);
        res.status(400).send({ error: err });
      }
      if (post) {
        Post
        .find({creator: ObjectId(creator)})
        .where('create_date').lt(post.create_date)
        .where('status').equals('active')
        .sort({create_date: -1, _id: -1})
        .limit(limit)
        .exec(function(err, posts) {
          if (err) {
            console.log(err);
            res.status(500).send({ error: err});
          }
          else {
            posts = _time.addTimeSinceFieldToPosts(posts);
            var content = jade.render(postFeed, {posts: posts});
            res.status(200).send(content);
          }
        });
      }
    });
  }
  else {
    res.status(406).send({ error: "Not acceptable"});
  }
};

exports.singlePost = function(req, res) {
  var id = req.params.id;
  Post.findOne({_id: new ObjectId(id)})
  .populate('creator')
  .exec(function(err, post){
    if (err) {
      res.send(err);
    } else {
    var tags = '';
    for (var i = 0; i != post.hash_tags.length; ++i ) {
      if (i < 3) {
        tags = tags + '#' + post.hash_tags[i] + ' ';
      } else if (i == 3) {
        tags = tags + '...';
      }
    }
    var ago = _time.postTimeSinceFormatter(post.create_date);
    res.render('post', {bodyId: 'post-card', post: post, tags: tags, ago: ago, category: post.category
    
    });}
  });
}
// This kind of thing should probably go into the model - JB
exports.getPostsForProfileByUserId = function(user_id, is_current, is_trust, next) {
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
  Post
    .find(criteria)
    .sort({ create_date: -1, _id: -1 })
    .limit(20)
    .exec(function(err, posts) {
      if (err) {
        next(err);
      }
      else {
        next(null, posts);
      }
    });
  }
