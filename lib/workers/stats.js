var mongoose = require('mongoose');
var User = mongoose.model('User');
var config          = require('../../config');
var Post = mongoose.model('Post');
var Organization = mongoose.model('Organization');
var Activity = mongoose.model('Activity');
var Notification = mongoose.model('Notification');
var Message = mongoose.model('Message');
var Insight = mongoose.model('Insight');
var InsightTarget = mongoose.model('InsightTarget');
var Jade = require('jade');
var _ = require('underscore');
var util = require('util');
var path = require('path');
var template = path.join(__dirname, '/../../views/mail/stats_mail.jade');
var mandrill        = require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';


exports.sendStatsMail = function(){
  Organization.find({})
  .populate({path: 'owner', model: 'User'})
  .exec(function(err, orgs){
    _.each(orgs, function(o){
      getWeeklyStats(o, function(stats, org){
        var options = {organization: org, owner: org.owner, stats: stats}; 
        var addresses = [{email: org.owner.email}];
        if (org.owner.contact_email) {
          addresses.push({email: org.owner.contact_email});
        }
        var mail = Jade.renderFile(template, options);
        mandrill(mandrillEndpointSend, {message:{
          to: addresses,
          from_email: 'info@prizmapp.com',
          from_name: 'Prizm',
          subject: 'Prizm Weekly Update',
          html: mail
        }
        }, function (err, response){
          if (err) console.log(err);
        });
      });
    });
  });
};

var getWeeklyStats = function(o, next){
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
    console.log('executing');
    var start = new Date();
    start.setDate(start.getDate() - 7);
    var lastStart = new Date();
    lastStart.setDate(start.getDate() - 7);
    s.activeMembers = getActiveCount(users, start);
    s.totalMembers = users.length;
    s.activePercent = parseInt((s.activeMembers/s.totalMembers) * 100);
    fetchTrendingTags(users, start, function(err, tags){
      s.trendingHashtags = tags?tags[0]:false;
      calculateActivity(users, start, function(err, active){
        console.log('activity fetched');
        s.mostActive = active;
        fetchMostPopularPost(users, start, function(err, post){
          console.log('popular fetched');
          s.popularPost = post;
          if (o.owner) {
          fetchNotificationCount(o.owner._id, start, function(err, c, t){
            console.log('notifications fetched');
            s.notificationCount = c;
            s.notificationTotal = t;
            fetchNotificationCount(o.owner._id, lastStart, function(err, c, t){
              console.log('old notifications fetched');
              var nc = c - s.notificationCount;
              var nt = t - s.notificationTotal;
              s.lastNotificationCount = nc;
              s.lastNotificationTotal = nt;
              mostPopularMessage(o._id, start, function(err, m){
                console.log('most popular fetched');
                s.popularMessage = m;
                fetchMessageCount(o.owner._id, o._id, users, start, function(err, c, t){
                  console.log('messages fetched');
                  s.messageCount = c;
                  s.messageTotal = t;
                  fetchMessageCount(o.owner._id, false, users, lastStart, function(err, c){
                    console.log('old messages fetched');
                    s.lastMessageCount = c - s.messageCount;
                    fetchInsightCount(o.owner._id, start, function(err, c, t){
                      s.insightCount = c;
                      s.insightTotal = t;
                      fetchInsightCount(o.owner._id, lastStart, function(err, c, t){
                        s.lastInsightCount = c - s.insightCount;
                        fetchTrendingTags(users, lastStart, function(err, tags){
                          s.lastTrendingHashtags = tags?tags[0]:false;
                          next(s, o);
                        }, start);
                      });
                    });
                  });
                });
              });

            });
          });
        }
        });
      });
    }); 
  });
};

exports.getWeeklyStats = getWeeklyStats;

var getActiveCount = function(u, date){
  var filtered = _.filter(u, function(obj){
    return obj.last_login_date > date;
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
        user.avatar = m.profile_photo_url;
      }
    });
    next(err, a);
  });
};

var fetchTrendingTags= function(u, date, next, end){
  var users = _.pluck(u, '_id');
  var match = {creator: {$in: users}};
  if (end) {
    match.$and = [{create_date: {$gt: date}}, {create_date: {$lt: end}}];
  } else {
    match.create_date = {$gt: date};
  }
  Post.aggregate([
    {$match: match},
    {$unwind: '$hash_tags'},
    {$group: {_id: '$hash_tags', count: {$sum: 1}}},
    {$sort: {count: -1}},
    {$limit: 1}
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
    {$match: {from: o, create_date: {$gt: start}}},
    {$group: {_id: '$title', count: {$sum: 1}}}
  ])
  .exec(function(err, n){
    var total = 0;
    var length = n?n.length:0;
    for (var i = 0; i != length; ++i) {
      total += n[i].count;
    }
    next(err, length, total);
  });
};

var fetchMessageCount = function(o, org, users, start, next){
  Message.find({creator: o, create_date: {$gt: start}, status: 'active'})
  .exec(function(err, m){
    if (err) console.log(err);
    m = m || [];
    var count = m.length;
    var total = 0;
    _.each(m, function(obj){
      if (!obj.group) {
        total += users.length;
      } else {
        if (org){
        var f = _.filter(users, function(u){
          var match = false;
          _.each(u.org_status, function(os){
            if (String(os.organization) == String(org)){
              _.each(os.groups, function(g){
                if (String(g) == String(obj.group)) {
                  match = true;
                }
              });
            }
          });
          return match;
        });

        total += f.length;
        }
      } 
    });
    next(err, count, total);
  });
}

var mostPopularMessage = function(o, start, next){
  Message.find({organization: o, create_date: {$gt: start}})
  .sort({likes_count: -1})
  .limit(1)
  .exec(function(err, m){
    next(err, m);
  });
};

var fetchInsightCount = function(o, start, next){
  InsightTarget.aggregate([
    {$match: {creator: o, create_date: {$gt: start}}},
    {$project: {insight: 1}},
    {$group: {_id: '$insight', count: {$sum: 1}}} 
  ])
  .exec(function(err, i){
    i = i || [];
    var c = i.length;
    var total = 0;
    for (var n = 0; n != c; ++n) {
      total += i[n].count;
    }
    next(err, c, total);
  });
}
