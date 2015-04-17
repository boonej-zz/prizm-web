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
var ObjectId = require('mongoose').Types.ObjectId;
var moment = require('moment');
var utils = require('../utils');
var validateEmail = require('../utils').validateEmail;
var uuid = require('../utils').generateUUID;
var aws = require('aws-sdk');
var _ = require('underscore');
var helpers = require('../lib/helpers');
var emailSubjects = require('../lib/helpers/mail').emailSubjects;
var _users = require('../controllers/users');

var AWS_ACCESS_KEY = 'AKIAJ656TNM2SYQUMHCA';
var AWS_SECRET_KEY = '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'; 
var S3_BUCKET = 'higheraltitude.prizm.insights'; 
var AWS = require('aws-sdk');
var gm = require('gm');
var mime = require('mime');
var multiparty = require('multiparty');

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY
});

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
    var users = [];
    if (docs) {
      users = _.sortBy(docs, function(item){
        return item.name;
      });
    };
    var fileName = uuid('insight') + '.jpg';
    res.render('insightsform', {title: 'Prizm App | Insights', selected: 'none',
                                                                  users: users, 
                                                                   uuid: fileName});
  });
});

router.post('/insights', utils.auth, function (req, res) {
  var s3 = new AWS.S3();
  var form = new multiparty.Form();
  form.parse(req, function(err, fields, files){
    var width = Number(fields.width);
    var height = Number(fields.height);
       console.log(width);
    console.log(height);
    var x1 = Number(fields.x1);
    var y1 = Number(fields.y1);
    var hashTags = String(fields.hashTags).replace(/(^\s+|\s+$)/g, '');
    hashTags = hashTags.replace(/#/g, '');
    hashTags = hashTags.split(',');
    var insight = new Insight({
      creator: ObjectId(String(fields.creator)),
      title: String(fields.title),
      text: String(fields.text),
      link: String(fields.link),
      link_title: String(fields.linkTitle),
      hash_tags: hashTags
    });
    var fileName = String(insight._id) + '.jpg';


    if (files){
      var fa = files.image;
      if (fa){
        var file;
        for (var i=0; file = fa[i]; ++i) {
          var $f = file;
          gm(file.path).size(function (err, d){
            height = d.height;
            width = d.width;
            width = width <= height?width:height;
            height = height <=width?height:width;
            console.log(width);
            console.log(height);
            gm($f.path)
              .gravity('Center')
              .crop(width, height)
              .resize(600, 600)
              .stream(function(err, stdout, stderr){
                var buf = new Buffer('');
                stdout.on('data', function(data){
                  buf = Buffer.concat([buf, data]);
                });
                stdout.on('end', function(data){
                  var data = {
                    Bucket: 'higheraltitude.prizm.insights',
                    Key: fileName,
                    Body: buf,
                    ContentType: mime.lookup(fileName),
                    ACL: 'public-read'
                  };
                  s3.putObject(data, function(err, result){
                    if (err) console.log(err);
                    insight.file_path = 
                      'https://s3.amazonaws.com/higheraltitude.prizm.insights/' + 
                        fileName;
                    insight.save(function (err, insight){
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
                });
              });
          }); 
        }
      }
    }  
  });
  
  });

router.get('/passwordreset', utils.auth, function(req, res){
  res.render('passwordreset');
});

router.post('/passwordreset', utils.auth, function(req, res){
  _users.shortPasswordReset(req, res);
});

router.get('/insights/:id', utils.auth, function (req, res) {
  var success = req.query.success;
  var subjects = emailSubjects;
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
                                success: success,
                                subjects: subjects
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
    data.push(['Provider', 'Count']);
    _.each(results, function(result, index, list){
      if (!result._id) result._id = 'standard';
      data.push([result._id, result.count]);
    });
    res.render('posts/post_chart', {results: data, title: 'Posts'});
  });
});

router.get('/interests/graph', utils.auth, function(req, res) {
  User
  .aggregate()
  .unwind('interests')
  .group({_id: {interest: '$interests._id', interest_raw: '$interests', gender: '$gender'}
    , gender: {'$sum': 1}, count: {'$sum': 1}})
  .exec(function(err, results){
    Interest.find({}, function(err, interests){
      var dataObject = {};
      _.each(results, function(result, index, list){
        var id = result._id.interest || result._id.interest_raw;
        dataObject[id] = dataObject[id]?dataObject[id]:{male: 0, female: 0, unknown: 0, total: 0};
        if (result._id.gender == 'male') {
          dataObject[id].male += result.count;
        } else if (result._id.gender =='female'){
          dataObject[id].female += result.count;
        } else {
          dataObject[id].unknown += result.count;
        }
        dataObject[id].total = dataObject[id].male + dataObject[id].female + dataObject[id].unknown;

        if (!dataObject[id].name){
          var interest = _.find(interests, function(it){
            return String(it._id) == String(id);
          });
          if (interest) {
            dataObject[id].name = interest.text;
          } else {
            dataObject[id].name = 'none';
          }
        }
      });
      var dataArray = [];
     /** 
      dataObject = _.sortBy(dataObject, function(result){
        return -(result.male + result.female + result.unknown);
      });
      */
     /** 
      _.each(dataObject, function(item, idx, list){
        dataArray.push(item);  
      });
      **/
      
      
      dataArray = _.sortBy(dataObject, function(result){
        return -(result.total);
      });
      
      var data = [];
      data.push( [
          'Gender', 
          'Male', 
          'Female',  
          'Unknown',
          {type: 'string', role: 'annotation'}
          ]
          );
      _.each(dataArray, function(item, idx, list){
        data.push([
          item.name, 
          item.male,
          item.female,
          item.unknown,
          String(item.total)
          ]);
      });
      var total_count, male_count, female_count;
      User.count({active: true}, function(err, c){
        total_count = c;
        User.count({gender: 'male', active: true}, function(err, m) {
          male_count = m;
          User.count({gender: 'female', active: true}, function(err, f){
            female_count = f;
            res.render('interest_graph', {results: results, title: 'Interests',
            count: c, data: data, males: male_count, females: female_count});
          });
        });
      });
    });  
  });
    
});

var sendInsightToUser = function(insight, user, subjectIndex, optionalSubject, next){
  console.log('sending insight to user');
  if (!user) { next({number: 500, message: 'no user'}, false); };
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
            helpers.mail.sendInsightEmail(it, subjectIndex, optionalSubject);
            next();
          }
        });
      });
    } else {
      helpers.mail.sendInsightEmail(it, subjectIndex);
      next();
    }
  });
};

var processSingleUserByEmail = function(email, next) {
  User.findOne({email: email}, function(err, user){
    next(err, user);
  });
};

var processUsersByProgramCode = function(programCode, next){
  User.find({program_code: programCode}, function(err, users){
    next(err, users);
  });
};

var processUsersWithInterestsAndOptions = function(interests, options, next){
  var params = [];
  _.each(interests, function(interest, index, list){
    params.push(ObjectId(interest));
  });
  if (interests) {
    options.interests = {$elemMatch: {_id: {$in: params}}};
  }
  User.find(options, function(err, users){
    if (err) console.log(err);
    next(err, users);
  }); 
};

var processAllUsers = function(next) {
  User.find(function(err, users) {
    next(err, users);
  });
};

var fixUser2 = function(user, next){
  var following = user.following;
  var followers = user.followers;
  _.each(following, function(item, idx, list){
    if (typeof(item._id == 'Object')){
      item._id = item._id.toString();
      item.date = item.date.toString();
      user.following.set(idx,item);
    }
  });
  _.each(followers, function(item, idx, list){
    if (typeof(item._id == 'Object')){
      item._id = item._id.toString();
      item.date = item.date.toString();
      user.followers.set(idx, item);
    }
  });
  user.followers_count = user.followers.length;
  user.following_count = user.following.length;
  user.save(function(err, result){
    console.log(err);
  });
  next();
}

var fixUser = function (user, next){
  Activity.find({$or: [{from: user._id}, 
  {to: user._id}], action: 'follow'}, function(err, activities){
    _.each(activities, function(activity, idx, list){
      var verb = 'unknown'; 
      if (activity.from.equals(user._id)){
        verb = 'following';
      } else if (activity.to.equals(user._id)){
        verb = 'followers';
      }
      var actObj = activity.toObject();
      if (verb === 'following') {
        var location = _.find(user.following, function(item){
          return activity.to.equals(ObjectId(item._id));
        });
        if (location === undefined) {
          location = {
            _id: actObj.to,
            date: actObj.create_date
          };
          user.following.push(location);
          user.following_count = user.following.length;
        } else {
          console.log('did not edit');
        } 
      } else if (verb === 'followers') {
        var location = _.find(user.followers, function(item){
          return activity.from.equals(ObjectId(item._id));
        });
        if (location === undefined){
          location = {
            _id: actObj.from,
            date: actObj.create_date
          };
          user.followers.push(location);
          user.followers_count = user.followers.length;
          user.save();
        } else {
          console.log('did not edit');
        }
      }
      
      //console.log(user.name + ': ' + verb);
    });
    next();
  });

};
/*
router.get('/users/fix', function(req, res){
  console.log('finding users');
  User.find(function(err, users){
    _.each(users, function(user, index, list){
      fixUser2(user, function(err){
        if (err) console.log(err);
      });
    }); 
  }); 
  res.send(200);
});
*/

router.post('/insights/:id', utils.auth, function (req, res) {
  var insightId = req.params.id;
  var interestsCount = req.param('numberOfInterests');
  var individualUser = req.param('individualUser');
  var programCode = req.param('programCode');
  var allUsers = req.param('allUsers');
  var subjectIndex = req.param('subject');
  var subject = req.param('subject-other');
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
          sendInsightToUser(insight, user, subjectIndex, subject, function(err){
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
          sendInsightToUser(insight, user, subjectIndex, subject, function(err){
            if (err) res.send(500);
          });
            res.status(200).send('Targeted ' + users.length + ' users.');

        });
      });
    } else if (allUsers) {
      processAllUsers(function(err, users) {
        _.each(users, function(user, index, list) {
          sendInsightToUser(insight, user, subjectIndex, subject, function(err) {
            if (!(index == (list.length - 1))) {
              if (err) console.log(err);
            }
            else {
              if (err) {
              console.log(err);
                res.send(500);
              } else {
                res.status(200).send('Targeted ' + users.length + ' users.');
              };
            };
          });
        });
      });
    } else {
      var interests = _.isArray(req.param('interest'))?req.param('interest'):[req.param('interest')];
      var gender = req.param('gender').toLowerCase();
      var startAge = Number(req.param('startingAge'));
      var endAge = Number(req.param('endingAge'));
      var options = {};
      if (gender != 'all') {
        options.gender = gender
      }
      options.age = {$gte: startAge, $lte: endAge};
      
      options.active = true;
      var userArray = [];
      var i = 0;
      processUsersWithInterestsAndOptions(interests, options,
          function(err, users){
        console.log('processed ' + users.length + ' users');
        _.each(users, function(user, index, list){
          sendInsightToUser(insight, user, subjectIndex, subject, function(err){
            if (err) console.log(err);
          });
        });
        res.status(200).send('Targeted ' + users.length + ' users.');
      });           
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
