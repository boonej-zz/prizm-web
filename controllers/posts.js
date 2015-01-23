// Posts Controller
var express     = require('express');
var router      = express.Router();
var mongoose    = require('mongoose');
var ObjectId    = require('mongoose').Types.ObjectId;
var Post        = mongoose.model('Post');
var _           = require('underscore');
var _time       = require('../lib/helpers/date_time');
var fs          = require('fs');
var path        = require('path');
var jade        = require('jade');
var postFeed    = fs.readFileSync(path.join(__dirname +
                  '/../views/posts/post_feed.jade'), 'utf8');
var singlePost  = fs.readFileSync(path.join(__dirname +
                  '/../views/posts/single_post.jade'), 'utf8');

// Posts Methods
exports.fetchPosts = function(req, res) {
  if (req.accepts('html')) {
    res.status(406).send({ error: "Not acceptable"});
  }
  if (req.accepts('application/json')) {
    var creator = req.get('creator');
    var lastPost = req.get('lastPost');
    var isCurrent = false;
    var isTrust = false;
    if (req.isAuthenticated()) {
      if (req.user.id == creator) {
        isCurrent = true;
      }
    }
    Post.findOne({_id: ObjectId(lastPost)}, function(err, post) {
      if (err) {
        console.log(err);
        res.status(400).send({ error: err });
      }
      if (post) {
        criteria = {
          creator: ObjectId(creator),
          status: 'active',
          create_date: {$lt: post.create_date}
        }
        if (!isCurrent) {
          criteria.category = {$ne: 'personal'};
          if (!isTrust){
            criteria.$and = [{scope: {$ne: 'private'}}, {scope: {$ne: 'trust'}}];
          } else {
            criteria.scope = {$ne: 'private'};
          }
        } 
        Post
        .find(criteria)
        .sort({create_date: -1, _id: -1})
        .limit(21)
        .exec(function(err, posts) {
          if (err) {
            console.log(err);
            res.status(500).send({ error: err});
          }
          else {
            posts = _time.addTimeSinceFieldToObjects(posts);
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
  if (req.accepts('html')) {
    singlePostHTMLRequest(req, res);
  }
  else if (req.accepts('application/json')) {
    res.status(406).send({ error: "Not acceptable"});
  }
  else if (req.accepts('application/jade')) {
    singlePostJadeRequest(req, res);
  }
  else {
    res.status(406).send({ error: "Not acceptable"});
  }
}

/* Single Post Request Types */

var singlePostHTMLRequest = function(req, res) {
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
      var ago = _time.timeSinceFormatter(post.create_date);
      res.render('posts/post', {
        bodyId: 'post-card', post: post, tags: tags, ago: ago, category: post.category
      });
    }
  });
}

var singlePostJadeRequest = function(req, res) {
  var id =  req.params.id;
  var options = [
    { path: 'creator', select: 'name profile_photo_url' },
    { path: 'comments', match: { status: 'active'} },
    { path: 'comments.creator', model: 'User', select: 'name profile_photo_url'}
  ]
  Post
    .findOne({_id: ObjectId(id)})
    .populate(options)
    .exec(function(err, post) {
      if (err) { res.status(500).send({error: err}); }
      if (post) {
        var content = jade.render(singlePost, {post: post});
        res.status(200).send(content);
      }
    }); 
}

