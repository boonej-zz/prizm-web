var mongoose = require('mongoose');
var User = mongoose.model('User');
var Post = mongoose.model('Post');
var Organization = mongoose.model('Organization');
var Activity = mongoose.model('Activity');
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
        console.log(util.inspect(s));
        fetchMostPopularPost(users, start, function(err, post){

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

fetchMostPopularPost = function(u, start, next){
  var users = _.pluck(u, '_id');
  Post.find({likes: {_id: {$in: users}}})

  .exec(function(err, posts){
    console.log(posts.length);
  });
};
