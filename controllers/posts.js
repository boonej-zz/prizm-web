// Posts Controller
var express   = require('express');
var router    = express.Router();
var mongoose  = require('mongoose');
var moment    = require('moment');
var ObjectId  = require('mongoose').Types.ObjectId;
var Post      = mongoose.model('Post');
var fs        = require('fs');
var path      = require('path');
var jade      = require('jade');
var postFeed  = fs.readFileSync(path.join(__dirname +
                '/../views/post_feed.jade'), 'utf8');

// Posts Configuration
moment.relativeTimeThreshold('d', 6);
moment.relativeTimeThreshold('M', 52);

moment.locale('en', {
  relativeTime: {
    past: "%s",
    s:  "%ds",
    m:  "%dm",
    mm: "%dm",
    h:  "%dh",
    hh: "%dh",
    d:  "%dd",
    dd: "%dd",
    M:  "4w",
    MM: function(number, withoutSuffix, key, isFuture){
      return number*4 + 'w';
    },
    y:  "%dy",
    yy: "%dy"
  } 
});


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
    var now = moment();
    var create = moment(post.create_date);
    var diff = now.diff(create);
    diff = diff/1000;
    console.log(post.external_provider);
    var string = '';
    if (diff < 60) {
      string = 'now';
    } if (diff < 3600) {
      var mins = Math.floor(diff / 60);
      string = mins + 'm';
    } else if (diff < 60 * 60 * 24) {
      var hours = Math.floor(diff/(60*60));
      string = hours + 'h';
    } else {
      var days = Math.floor(diff/(60*60*24));
      if (days < 7) {
        string = days + 'd';
      } else {
        var weeks = Math.floor(days/7);
        string = weeks + 'w';
      }
    }
    res.render('post', {bodyId: 'post-card', post: post, tags: tags, ago: string, category: post.category
    
    });}
  });
}

exports.getPostsForProfileByUserId = function(user_id, next) {
  Post
    .find({creator: ObjectId(user_id)})
    .where('status').equals('active')
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