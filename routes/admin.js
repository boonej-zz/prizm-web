var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Activity = mongoose.model('Activity');
var Record = mongoose.model('Record');
var Post = mongoose.model('Post');
var User = mongoose.model('User');
var Insight = mongoose.model('Insight');
var InsightTarget = mongoose.model('InsightTarget');
var Interest = mongoose.model('Interest');
var Push = require('../classes/push_notification');
var config = require('../config');
var mandrill = require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';
var ejs = require('ejs');
var jade = require('jade');
var fs = require('fs');
var path = require('path');
var mail = fs.readFileSync(path.join(__dirname + '/../lib/mail.ejs'), 'utf8');
var rejectMail = fs.readFileSync(path.join(__dirname +
      '/../views/reject_mail.jade'), 'utf8');
var acceptMail = fs.readFileSync(path.join(__dirname +
      '/../views/accept_mail.jade'), 'utf8');
var adminBody = fs.readFileSync(path.join(__dirname + 
      '/../views/adminMail.ejs'), 'utf8'); 
var adminEmail = 'info@prizmapp.com';
var ObjectId = require('mongoose').Types.ObjectId;
var moment = require('moment');
var utils = require('../utils');
var validateEmail = require('../utils').validateEmail;
var uuid = require('../utils').generateUUID;
var aws = require('aws-sdk');
var _ = require('underscore');
var helpers = require('../lib/helpers');

var AWS_ACCESS_KEY = 'AKIAJ656TNM2SYQUMHCA';
var AWS_SECRET_KEY = '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'; 
var S3_BUCKET = 'higheraltitude.prizm.insights'; 

router.get('/', function(req, res){
  res.send(200);
});

/* Insights */

router.get('/insights', utils.auth, function (req, res) {
  User.find({$or: [{subtype: 'luminary'}, {type: 'institution_verified'}]}, 
    function (err, docs) {
    if (err) {
      console.log(err)
      res.status(500).send({ error: err });
    };
    if (docs) {
      users = docs
    };
    var fileName = uuid('insight') + '.jpg';
    res.render('insightsform', {title: 'Prizm App | Insights', selected: 'none',
                                                                  users: users, 
                                                                   uuid: fileName});
  });
});

router.post('/insights', utils.auth, function (req, res) {
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
      res.status(500).send({ error: err });
    }
    if (insight) {
      console.log(insight);
      res.redirect('/insights/' + insight.id);
    }
  });
});

router.get('/insights/:id', utils.auth, function (req, res) {
  var success = req.query.success;
  Insight.findOne({_id: ObjectId(req.params.id)}, function (err, insight) {
    if (err) {
      console.log(err);
    }
    if (insight) {
      User.findOne({_id: ObjectId(insight.creator)} , function (err, creator) {
        Interest.find(function(err, interests){
          if (err) res.send(500);
          interests = _.sortBy(interests, function(item){
            return item.text;
          });
          res.render('insights', { title: 'Prizm App | Insights',
                                selected: 'none',
                                insight: insight,
                                creator: creator,
                                interests: interests,
                                success: success
          });
        });
      });
    };
  });
});

router.get('/posts', utils.auth, function(req,res){
  Post
  .aggregate()
  .group({_id: '$external_provider', count: {'$sum' :1}})
  .exec(function(err, results){
    if (err) console.log(err);
    var data = [];
    _.each(results, function(result, index, list){
      if (!result._id) result._id = 'standard';
      data.push([result._id, result.count]);
    });
    console.log(data);
    res.render('post_chart', {results: data, title: 'Posts'});
  });
});

router.get('/interests/graph', utils.auth, function(req, res) {
  User
  .aggregate()
  .unwind('interests')
  .group({_id: '$interests._id', count: {'$sum': 1}})
  .exec(function(err, results){
    Interest.find({}, function(err, interests){
      _.each(results, function(result, index, list){
        var interest = _.find(interests, function(it){
          return String(it._id).indexOf(String(result._id)) != -1;
        });
        if (interest) {
          result.text = interest.text;
        }
      });
      results = _.sortBy(results, function(result){
        return -result.count
      });
      User.count({active: true}, function(err, c){
        res.render('interest_graph', {results: results, title: 'Interests',
        count: c});
      });
    });  
  });
    
});

var sendInsightToUser = function(insight, user, next){
  console.log('sending insight to user');
  InsightTarget.findOne({creator: insight.creator, target: user._id, insight: insight._id}, function(err, it){
    if (err) {
      console.log(err);
      next(err);
    }
    if (!it) {
      it = new InsightTarget({
        target: user._id,
        insight: insight._id,
        creator: insight.creator,
        file_path: insight.file_path
      });
      it.save(function(err, result){
        if (err) {
          console.log(err);
          next(err);
        }
        var activity = new Activity({
          from: it.creator,
          to: it.target,
          action: 'insight',
          insight_id: it.insight,
          insight_target_id: it._id
        });
        activity.save(function(err, result){
          if (err) {
            console.log(err);
            next(err);
          } else {
            new Push('activity', activity, function(result){
              //console.log("logging result of push"+JSON.stringify(result));
            });
            helpers.mail.sendInsightEmail(it);
            next();
          }
        });
      });
    } else {
      helpers.mail.sendInsightEmail(it);
      next();
    }
  });
};

var processSingleUserByEmail = function(email, next) {
  User.findOne({email: email}, function(err, user){
    next(err, user);
  });
};

var processUserByProgramCode = function(programCode, next){
  user.find({program_code: programCode}, function(err, users){
    next(err, users);
  });
};

var processUsersByInterests = function(interests, next){
  var params = [];
  _.each(interests, function(interest, index, list){
    params.push(ObjectId(interest));
  });
  console.log(params);
  User.find({interests: {$elemMatch: {_id: {$in: params}}}}, function(err, users){
    next(err, users);
  }); 
};


router.post('/insights/:id', utils.auth, function (req, res) {
  var insightId = req.params.id;
  var interestsCount = req.param('numberOfInterests');
  var individualUser = req.param('individualUser');
  var programCode = req.param('programCode');
  Insight.findOne({_id: insightId}, function(err, insight){
    if(individualUser){
      processSingleUserByEmail(individualUser, function(err, user)  {
        if(err){
          res.send(500);
        }
        Insight.findOne({_id: insightId}, function(err, insight){
          if (err) {
            res.send(500);
          }
          sendInsightToUser(insight, user, function(err){
            if (err) {
              console.log(err);
              res.send(500);
            } else {
              res.send(200);
            }
          });
        });
      }); 
    } else if (programCode) {
      processUsersByProgramCode(programCode, function(err, users){
        _.each(users, function(user, index, list){
          sendInsightToUser(insight, user, function(err){
            if (err) console.log(err);
          });
        });
      });
    }else {
      var interests = _.isArray(req.param('interest'))?req.param('interest'):[req.param('interest')];
      var userArray = [];
      var i = 0;
      processUsersByInterests(interests, function(err, users){
        console.log('processed ' + users.length + ' users');
        _.each(users, function(user, index, list){
          sendInsightToUser(insight, user, function(err){
            if (err) console.log(err);
          });
        });
      });           
      res.redirect('/insights/' + insight._id + '?success=true'); 
  }
  });
 });

/** Email Subscription **/
router.get('/unsubscribe/:id', function(req, res) {
  var email = req.params.id;
  helpers.mail.unsubscribeUserByEmail(email, function(err, user) {
    if (err) {
      console.log(err);
      res.status(500).send({error: 'There was an error trying to unsubscribe ' + 
                            'the following email address: ' + user.email});
    }
    if (user) {
      res.status(200).send({success: user.email + ' has been unsubscribed from' +
                            ' future Prizm emails'});
    }
  })
})

router.get('/subscribe/:id', function(req, res) {
  var email = req.params.id;
  helpers.mail.subscribeUserByEmail(email, function(err, user) {
    if (err) {
      console.log(err);
      res.status(500).send({error: 'There was an error trying to resubscribe ' + 
                            'the following email address: ' + user.email});
    }
    if (user) {
      res.status(200).send({success: user.email + ' has been resubscribed to' +
                            ' future Prizm emails'});
    }
  })
})

/** S3 Upload **/

router.get('/sign_s3', function(req, res){
    aws.config.update({accessKeyId: AWS_ACCESS_KEY , secretAccessKey: AWS_SECRET_KEY });
    var s3 = new aws.S3(); 
    var s3_params = { 
        Bucket: S3_BUCKET, 
        Key: req.query.s3_object_name, 
        Expires: 60, 
        ContentType: req.query.s3_object_type, 
        ACL: 'public-read'
    }; 
    s3.getSignedUrl('putObject', s3_params, function(err, data){ 
        if(err){ 
            console.log(err); 
        }
        else{ 
            console.log(data);
            var return_data = {
                signed_request: data,
                url: 'https://s3.amazonaws.com/' + S3_BUCKET + '/' +req.query.s3_object_name 
            };
            res.write(JSON.stringify(return_data));
            res.end();
        } 
    });
});

module.exports = router;
