// Posts Controller
var express     = require('express');
var router      = express.Router();
var mongoose    = require('mongoose');
var ObjectId    = require('mongoose').Types.ObjectId;
var Post        = mongoose.model('Post');
var User        = mongoose.model('User');
var Activity    = mongoose.model('Activity');
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

exports.likePost = function(req, res) {
  var post = req.params.id;
  var id = req.user.id;
  Post.findOne({_id: post}, function(err, post){
    if (err){
      res.status(500).send('error');
    }
    if (post) {
      var liked = false;
      _.each(post.likes, function(like, idx, err){
        if (String(like._id) == String(id)) {
          liked = true;
        }
      });
      if (!liked) {
        post.likes.push({_id: id});
        post.likes_count += 1;
        post.save(function(err, result){
          if (err) {
            res.status(500).send('error');
          } else {
            var activity = new Activity({
              from: ObjectId(id),
              to:   post.creator,
              action: 'like',
              post_id: post._id  
            });
            activity.save();
            res.status(201).send('added');
          } 
        });
      } else {
        res.status(200).send('ok');
      }
    }
  });
}

exports.unlikePost = function(req, res){
  var post = req.params.id;
  var id = req.user.id;
  Post.findOne({_id: post}, function(err, post){
    if (err){
      res.status(500).send('error');
    }
    if (post) {
      var liked = false;
      var index = false;
      _.each(post.likes, function(like, idx, err){
        if (String(like._id) == String(id)) {
          liked = true;
          index = idx;
        }
      });
      if (liked) {
        post.likes.splice(index, 1);
        post.likes_count -= 1;
        post.save(function(err, result){
          if (err) {
            res.status(500).send('error');
          } else {
            Activity.remove({from: ObjectId(id), 
              to: post.creator, 
              post_id: post.id,
              action: 'like'}, function(err, result){
                if (err) console.log(err);
                else console.log('removed activity');
              }); 
            res.status(200).send('removed');
          } 
        });
      } else {
        res.status(200).send('ok');
      }
    }
  });

}


exports.fetchPosts = function(req, res) {
  var feedType = req.get('feedType');

  if (req.accepts('html')) {
    res.status(406).send({ error: "html request unacceptable"});
  }
  if (req.accepts('application/jade')) {
    if (feedType == 'profile') {
      profilePostFeed(req, res);
    }
    else if (feedType == 'members') {
      organizationMembersFeed(req, res);
    }
    else {
      res.status(406).send({ error: "feedType unacceptable"});
    }
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
      res.render('posts/post_twitter_card', {
        bodyId: 'post-card', post: post, tags: tags, ago: ago, category: post.category
      });
    }
  });
}

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

var singlePostJadeRequest = function(req, res) {
  var id =  req.params.id;
  var user = req.user;
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
        var ps = '<a class="tag-link" href="/profiles/';
        var pm = '">@';
        var pe = '</a>';
        post.time_since = _time.timeSinceFormatter(post.create_date);
        post.comments = _time.addTimeSinceFieldToObjects(post.comments);
        User.resolvePostTags(post, function(err, users){
          console.log('resolved post tags');
          if (users && users.length > 0) {
            if (post.text){
              post.formattedText = replaceTagsFromUserList(post.text, users);
            }

            _.each(post.comments, function(comment, idx, list){
              var commentText = replaceTagsFromUserList(comment.text, users);
              comment.formattedText = commentText;
            });
            post.liked = false;
            _.each(post.likes, function(like, index, listb){
              if (String(like._id) == String(user._id)){
                post.liked = true
              };
            });

          } 
          var content = jade.render(singlePost, {post: post});
          res.status(200).send(content);
        });
        
      }
    }); 
};

/* Fetch Post Request Types */

var profilePostFeed = function(req, res) {
  var creator = req.get('creator');
  var lastPost = req.get('lastPost');
  var isCurrent = false;
  var isTrust = false;
  var user = req.user;
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
          if (user) {
            _.each(posts, function(post, idx, list){
              post.liked = false;
              _.each(post.likes, function(like, index, listb){
                if (String(like._id) == String(user._id)){
                  post.liked = true
                };
              });
            });
          }
          
          var content = jade.render(postFeed, {posts: posts});
          res.status(200).send(content);
        }
      });
    }
  });
}

var organizationMembersFeed = function(req, res) {
  var orgID = req.get('orgID');
  var lastPost = req.get('lastPost');
  var members = [];
  var criteria = {
    creator: {$in: members},
    status: 'active',
    category: {$ne: 'personal'},
    scope: {$ne: 'private'}
  }
  if (lastPost) {
    var query = Post.findOne({_id: ObjectId(lastPost)});
    query.select('create_date');
    query.exec(function(err, post) {
      if (err) { 
        res.status(500).send({error: err}); 
      }
      else {
        criteria.create_date = {$lt: post.create_date}
      }
    });
  }
  User.findOrganizationMembers({
    organization: orgID,
    status: 'active'
  }, function(err, users) {
    if (err) { 
      res.status(500).send({error: err}); 
    }
    else {
      _.each(users, function(user) {
        members.push(user.id);
      });
      Post.find(criteria)
        .sort({create_date: -1})
        .exec(function(err, posts) {
          if (err) {
            res.status(500).send({error: err});
          }
          else {
            posts = _time.addTimeSinceFieldToObjects(posts);
            if (req.user) {
              _.each(posts, function(post, idx, list){
                post.liked = false;
                _.each(post.likes, function(like, index, listb){
                  if (String(like._id) == String(req.user._id)){
                    post.liked = true
                  };
                });
              });
            }

            var content = jade.render(postFeed, {posts: posts});
            res.status(200).send(content);
          }
        });
    }
  });
}

