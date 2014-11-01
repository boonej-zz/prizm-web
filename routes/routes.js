var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Activity = mongoose.model('Activity');
var Record = mongoose.model('Record');
var Post = mongoose.model('Post');
var User = mongoose.model('User');
var Insight = mongoose.model('Insight');
var InsightTarget = mongoose.model('InsightTarget');
var config = require('../config');
var mandrill = require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';
var ejs = require('ejs');
var fs = require('fs');
var path = require('path');
var mail = fs.readFileSync(path.join(__dirname + '/../lib/mail.ejs'), 'utf8');
var adminBody = fs.readFileSync(path.join(__dirname + 
      '/../views/adminMail.ejs'), 'utf8'); 
var adminEmail = 'info@prizmapp.com';
var ObjectId = require('mongoose').Types.ObjectId;
var moment = require('moment');
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

function validateEmail(email) {
  if (email.length == 0) return false;
  var reg = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}\b/i;
  return reg.test(email);
}

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Prizm App', selected:'home' });
});

router.get('/about', function(req, res) {
  res.render('about', { title: 'Prizm App | About', selected:'about' });
});

router.get('/terms', function(req, res) {
  res.render('terms', { title: 'Prizm App | Legal', selected:'none'});
});

router.get('/privacy', function(req, res){
  res.render('privacy', { title: 'Prizm App | Privacy', selected:'none'});
});

router.get('/partner', function(req, res){
  res.render('partner', { title: 'Prizm App | Partners', selected: 'none'});
});

router.get('/luminary', function(req, res){
  res.render('luminary', { title: 'Prizm App | Luminary', selected: 'none'});
});

router.get('/download', function(req, res){
  res.render('download', { title: 'Prizm App | Download', selected: 'none'});
});

router.post('/', function(req, res) {
  var data = req.body;
  var record = new Record(data);
  if (validateEmail(record.email)){
    record.save();
    var name = record.name.split(' ');
    var first = name.length > 0?name[0]:'Friend';
    var messageBody = ejs.render(mail, {first: first});
    mandrill(mandrillEndpointSend, {
      message: {
                  to: [{email: record.email}],
                  from_email: 'info@prizmapp.com',
                  subject: 'Thank you for your interest!',
                  html: messageBody 
               }   
      }, function(err, response) {
        if (err) {
          console.log('MANDRILL ERROR RETURNED: ' + JSON.stringify(err));

        }else {
         var adminText = ejs.render(adminBody, {user: record});
         mandrill(mandrillEndpointSend, {
         message: {
                  to: [{email: adminEmail}],
                  from_email: 'info@prizmapp.com',
                  subject: 'Prizm Private Beta Request',
                  html: adminText
               }
         }, function(err, response) {
            if (err) {
              console.log('MANDRILL ERROR RETURNED: ' + JSON.stringify(err));
          }
    });

        }
      }
    );
     }
  res.send('success'); 
});

router.get('/posts/:id', function(req, res){
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
    res.render('post', {post: post, tags: tags, ago: string, category: post.category
    
    });}
  });
});

router.get('/users/:id/password', function(req, res){
  var id = req.params.id;
  var resetKey = req.query.reset_key;
  User.findOne({_id: new ObjectId(id)}, function(err, user){
    if (err) {
      console.log(err);
      res.render('reset', {success: false});
    }
    if (user) {
      if (user.reset_key && user.reset_key == resetKey && user.password_reset) {
        user.password = user.password_reset;
        if (user.hashPassword()){
          user.password_reset = null;
          user.reset_key = null;
          user.reset_date = null;
          user.save(function(err,result){
            if (err) {
              res.render('reset', {success: false});
            } else {
              res.render('reset', {success: true});
            }
          });
        } else {
          res.render('reset', {success: false});
        }
      } else {
        res.render('reset', {success: false});
      } 
    } else {
      res.render('reset', {success: false});
    }
  }); 
});

/* Insights */
router.get('/insights', function (req, res) {
  User.find({type: {$in: ["institution","luminary"]}}, function (err, docs) {
    if (err) {
      console.log(err)
    };
    if (docs) {
      users = docs
    };
    res.render('insightsform', {title: 'Prizm App | Insights', selected: 'none',
                                                                  users: users });
  });
});

router.post('/insights', function (req, res) {
  var insight = new Insight({
    creator: ObjectId(req.param('creator')),
    title: req.param('title'),
    text: req.param('text'),
    file_path: req.param('filePath'),
    link: req.param('link'),
    link_title: req.param('linkTitle'),
    tags: req.param('tags"'),
    hash_tags: req.param('hashTags')
  });
  insight.save( function (err, insight) {
    if (err) {
      console.log(err);
    }
    if (insight) {
      console.log(insight);
      res.redirect('/insights/' + insight.id);
    }
  });
});

router.get('/insights/:id', function (req, res) {
  User.find({type: 'user'}, function (err, docs) {
    if (err) {
      console.log(err);
    };
    if (docs) {
      users = docs;
    };
  });
  Insight.findOne({_id: ObjectId(req.params.id)}, function (err, insight) {
    if (err) {
      console.log(err);
    }
    if (insight) {
      User.findOne({_id: ObjectId(insight.creator)} , function (err, creator) {
        console.log("Creator : " + creator.first_name);
        res.render('insights', { title: 'Prizm App | Insights',
                                selected: 'none',
                                insight: insight,
                                creator: creator,
                                users: users });
      });
    };
  });
});

router.post('/insights/:id', function (req, res) {
  var targetUserId = req.param('user');
  var insightId = req.params.id;
  console.log()
  Insight.findOne({_id: ObjectId(insightId)}, function (err, insight) {
    if (err) {
      console.log(err);
    };
    if (insight) {
      var insightTarget = new InsightTarget({
        insight: ObjectId(insight.id),
        creator: ObjectId(insight.creator),
        target: ObjectId(targetUserId),
        file_path: insight.file_path
      });
    };
    insightTarget.save(function (err, insightTarget) {
      if (err) {
        console.log(err);
      };
      if (insightTarget) {
        console.log(insightTarget);
        console.log("InsightTarget Saved");
        var activity = new Activity({
          from: ObjectId(insightTarget.creator),
          to: ObjectId(insightTarget.target),
          // action: 
          insight_id: insightTarget.insight,
          insight_target_id: insightTarget.id
        });
        activity.save(function (err, activity) {
          if (err) {
            console.log(err);
          }
          if (activity) {
            console.log(activity);
            res.redirect('/insights/' + insight.id);
          };
        });
      };
    });
  });
});

module.exports = router;
