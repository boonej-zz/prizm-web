var mongoose = require('mongoose');
var User = mongoose.model('User');
var Post = mongoose.model('Post');
var Organization = mongoose.model('Organization');
var Activity = mongoose.model('Activity');
var Notification = mongoose.model('Notification');
var Message = mongoose.model('Message');
var _ = require('underscore');
var util = require('util');

exports.getWeeklyStats = function(o, next){
  var s = {};
  User.find({
    active: true,
    org_status: {
      $elemMatch: {
        organization: o._id,
        status: 'active'
      }
    }
  }) 
  .exec(function(err, users){
    var start = new Date();
    start.setDate(start.getDate() - 7);
    s.activeMembers = getActiveCount(users, start);
    fetchTrendingTags(users, start, function(err, tags){
      s.trendingHashtags = tags;
      calculateActivity(users, start, function(err, active){
        s.mostActive = active;
        fetchMostPopularPost(users, start, function(err, post){
          s.popularPost = post;
          fetchNotificationCount(o.owner, start, function(err, c){
            s.notificationCount = c;
            mostPopularMessage(o._id, start, function(err, m){
              s.popularMessage = m;
              console.log(util.inspect(s));
            });
          });
        });
      });
    }); 
  });
};

var getActiveCount = function(u, date){
  var filtered = _.filter(u, function(obj){
    return u.last_login_date > date;
  });
  return(filtered.length);
}

var calculateActivity = function(u, start, next){
  var users = _.pluck(u, '_id');
  Activity.aggregate([
    {$match: {from: {$in: users}, create_date: {$gt: start}}},
    {$group: {_id: '$from', count: {$sum: 1}}},
    {$sort: {count: -1}},
    {$limit: 5}
  ])
  .exec(function(err, a){
    _.each(a, function(user){
      var m = _.find(u, function(obj){
        return String(obj._id) == String(user._id);
      });
      if (m) {
        user.name = m.name;
      }
    });
    next(err, a);
  });
};

var fetchTrendingTags= function(u, date, next){
  var users = _.pluck(u, '_id');
  Post.aggregate([
    {$match: {creator: {$in: users}, create_date: {$gt: date}}},
    {$unwind: '$hash_tags'},
    {$group: {_id: '$hash_tags', count: {$sum: 1}}},
    {$sort: {count: -1}},
    {$limit: 5}
  ])
  .exec(function(err, tags){
    next(err, tags); 
  });
}

var fetchMostPopularPost = function(u, start, next){
  var users = _.pluck(u, '_id');
  Activity.aggregate(
    {$match: {from: {$in: users}, action: 'like', post_id: {$ne: null}, create_date: {$gt: start}}},
    {$group: {_id: '$post_id', count: {$sum: 1}}},
    {$sort: {count: -1}},
    {$limit: 1}
  )
  .exec(function(err, posts){
    if (_.isArray(posts) && posts.length == 1){
      Post.findOne({_id: posts[0]._id}, function(err, post){
        next(err, post);
      });
    } else {
      next(err, false);
    }
  });
};

var fetchNotificationCount = function(o, start, next){
  Notification.aggregate([
    {$match: {from: o, date_created: {$gt: start}}},
    {$group: {_id: '$title', count: {$sum: 1}}}
  ])
  .exec(function(err, n){
    var length = n?n.length:0;
    next(err, length);
  });
};

var mostPopularMessage = function(o, start, next){
  var now = new Date();
  Message.find({organization: o, create_date: {$gt: start}})
  .sort({likes_count: -1})
  .limit(1)
  .exec(function(err, m){
    next(err, m);
  });
};
