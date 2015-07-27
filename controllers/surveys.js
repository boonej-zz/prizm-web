var express = require('express');
var mongoose = require('mongoose');
var _ = require('underscore');

var Organization = mongoose.model('Organization');
var Survey = mongoose.model('Survey');
var Question = mongoose.model('Question');
var Answer = mongoose.model('Answer');
var Group = mongoose.model('Group');
var Activity = mongoose.model('Activity');
var User = mongoose.model('User');
var moment = require('moment');

var validateAdmin = function(user, next){
  Organization.findOne({owner: user._id}, function(err, organization){
    if (err) console.log(err);
    next(organization);
  });
};

function renderNewSurveyForm(org, survey, res){
  var options = {
    organization: org,
    original: survey
  };
  if (org){
    res.render('create/survey', options);
  } else {
    res.status(403).send('Forbidden');
  }
}

exports.newSurvey = function(req, res){
  var user = req.user;
  var surveyID = req.get('survey');
  Organization.findOne({owner: user._id})
  .exec(function(err, org){
    if (err) console.log(err);
    if (surveyID) {
      var oid = org._id || false;
      Survey.findOne({_id: surveyID, organization: oid})
      .populate({path: 'questions', model: 'Question'})
      .exec(function(err, survey){
        renderNewSurveyForm(org, survey, res);
      });
    } else {
      renderNewSurveyForm(org, false, res);
    }
   
  });
};

exports.createSurvey = function(req, res){
  var user = req.user;
  var oid = req.get('original');
  console.log(oid);
  Organization.findOne({owner: user._id})
  .populate({path: 'groups', model: 'Group'})
  .exec(function(err, org){
    if (err) console.log(err);
    if (org){
      var questionObj = {
        text: req.body.questions,
        order: 1,
        type: req.body.type,
        scale: req.body.scale
      }; 
      var question = new Question({
        text: req.body.questions,
        order: 1,
        type: req.body.type
      });
      if (question.type == 'scale') {
        question.scale = req.body.scale;
      } else if (question.type == 'multiple') {
        var options = req.body.values;
        var values = [];
        for (var i = 0; i != options.length; ++i){
          var num = i + 1;
          var text = options[i];
          values.push({question: text, order: num});
        }
        question.values = values;
      }
      question.save(function(err, q){
        if (err) console.log(err);
        if (q){
          console.log(q);
          var surveyObj = {
            creator: user._id,
            name: req.body.name,
            number_of_questions: req.body.number_of_questions,
            organization: org._id,
            questions: [q._id]
          };
          var survey = new Survey(surveyObj);
          survey.save(function(err, s){
            if (err) {
              console.log(err);
            }
            if (s) {
              if (oid) {
                Survey.findOne({_id: oid})
                .populate({path: 'questions', model: 'Question'})
                .exec(function(err, original){
                  if (err) console.log(err);
                  console.log(original);
                  res.render('create/survey', {organization: org, survey: s, original: original}); 
                });
              } else {
                res.render('create/survey', {organization: org, survey: s}); 
              }
            } else {
              res.status(500).send('Server error');
            }
          });
        } else {
          res.status(500).send('Server error');
        }

      });
    } else {
      res.status(403).send('Forbidden');
    }

  });
}

exports.createQuestion = function(req, res){
  var user = req.user;
  var oid = req.get('original');
  Organization.findOne({owner: user._id})
  .populate({path: 'groups', model: 'Group'})
  .select({_id: 1, owner: 1, groups: 1})
  .exec(function(err, org){
    if (err) console.log(err);
    if (org){
      Survey.findOne({_id: req.params.survey_id}, function(err, survey){
        if (err) console.log(err);
        if (survey) {
          var question = new Question({
            text: req.body.questions,
            order: req.body.order,
            type: req.body.type
          });
          if (question.type == 'scale') {
            question.scale = req.body.scale;
          } else if (question.type == 'multiple') {
            var options = req.body.values;
            var values = [];
            for (var i = 0; i != options.length; ++i){
              var num = i + 1;
              var text = options[i];
              values.push({question: text, order: num});
            }
            question.values = values;
          }

          question.save(function(err, q){
            if (err) console.log(err);
            if (q){
              survey.questions.push(q._id);
              survey.save(function(err, s){
                if (err) console.log(err);
                if (s) {
                  if (oid) {
                    Survey.findOne({_id: oid}, function(err, original){
                      res.render('create/survey', {organization: org, survey: s, original: original});  
                    });
                  } else {
                    res.render('create/survey', {organization: org, survey: s});
                  }
                } else {
                  res.status(500).send(err);
                }
              });
            } else {
              res.status(500).send('Server error');
            }
          });
        } else {
          res.status(400).send('Invalid data');
        }
      });
    } else {
      res.status(403).send('Forbidden');
    }
  });
};

exports.publishSurvey = function(req, res){
 var user = req.user;
  Organization.findOne({owner: user._id})
  .exec(function(err, org){
    if (err) console.log(err);
    if (org){
      Survey.findOne({_id: req.params.survey_id}, function(err, survey){
        if (survey) {
          var groups = req.body.groups;
          if (!_.isArray(groups)) {
            groups = [groups];
          }
          Group.find({_id: {$in: groups}}, function(err, groups) {
            var groupIDs = false;
            if (groups) {
              groupIDs = _.pluck(groups, '_id');
            }
            var criteria = {
              status: 'active',
              organization: org._id
            }
            if (!groupIDs) {
              survey.target_all = true;
            } else {
              criteria.groups = {$in: groupIDs};
              survey.groups = groupIDs;
            }
            console.log(criteria);
            User.find({active: true, org_status: {$elemMatch: criteria}})
            .exec(function(err, users){
              var sent = Date.now();
              _.each(users, function(u){
                var obj = {user: u._id, create_date: sent};
                if (!survey.targeted_users) {
                  survey.targeted_users = [];
                }
                survey.targeted_users.push(obj);
              });
              survey.save(function(err, s){
                if (err) console.log(err);
                res.status(200).send();
              });

            });
          });
        } else {
          if (err) console.log(err);
          res.status(500).send('Server Error');
        }
      });
    } else {
      res.status(403).send('Forbidden');
    }
  });
};

exports.deleteSurvey = function(req, res){
  var user = req.user;
  var sid = req.params.sid;
  validateAdmin(user, function(org){
    console.log('Admin validated');
    if (org){
      Survey.findOne({_id: sid, organization: org._id}, function(err, survey){
        if (survey) {
          survey.status = 'inactive';
          survey.save(function(err, s){
            res.status(200).send();
          });
        } else {
          if (err) console.log(err);
          res.status(400).send();
        }
      });
    } else {
      res.status(403).send('Forbidden');
    }
  });
}

var finishSurvey = function(req, res) {
  var user = req.user;
  console.log('finishing survey');
  Survey.findOne({_id: req.params.survey_id}, function (err, s){
    if (s) {
      s.completed.push(user._id);
      s.save(function(err, r){
        if (r) {
          res.status(200).json({action: 'finish'});
        } else {
          res.status(500).send('Server Error');
        }
      });
    } else {
      if (err) console.log(err);
      res.status(500).send('Could not complete survey');
    }
  });
}

exports.answerQuestion = function(req, res){
  var user = req.user;
  var survey_id = req.params.survey_id;
  console.log('answering question');
  var final = req.get('final');
  Question.findOne({_id: req.body.question})
  .populate({path: 'answers', model: 'Answer'})
  .exec(function(err, question){
    if (question) {
      var userAnswers = _.filter(question.answers, function(o){
        return String(o.user) == String(user._id);
      });
      if (userAnswers.length == 0) {
        var answer = new Answer({
          user: user._id,
          value: req.body.value
        });
        answer.save(function(err, a){
          if (a) {
            Question.findOne({_id: question._id}, function(err, q){
              q.answers.push(a._id);
              q.save(function(err, q){
                if (q){
                  if (final) {
                    finishSurvey(req, res);
                  } else {
                    res.status(200).json({action: 'continue'});
                  }
                } else {
                  res.status(500).send('Server error');
                }
              });
            });
          } else {
            if (err) { 
              console.log(err);
              if (final) {
                finishSurvey(req, res);
              } else {
                res.status(200).send({action: 'continue'});
              }
            } else {
              res.status(500).send('Server error');
            }
          }
        });
      } else {
        if (final) {
          finishSurvey(req, res);
        } else {
          res.status(200).json({action: 'continue'});
        }
      }
    } else {
      if (err) conosle.log (err);
      res.status(400).send('Invalid request');
    }
  });
};

exports.adminPage = function(req, res){
  var user = req.user;
  Organization.findOne({owner: user._id}, function(err, org){
    if (org){
      Survey.find({creator: user._id, status: {$ne: 'inactive'}})
      .populate({path: 'questions', model: 'Question'})
      .populate({path: 'organization', select: {name: 1}})
      .populate({path: 'questions.answers', model: 'Answer'})
      .populate({path: 'groups', model: 'Group', select: {name: 1}})
      .sort({create_date: -1, name: 1})
      .exec(function(err, surveys){
          if (err) console.log(err);
          if (surveys) {
            _.each(surveys, function(s){
              s.formattedDate = moment(s.create_date).format('M/D/YYYY'); 
            });
          }
          res.render('surveys/admin', {
            currentUser: user,
            auth: true,
            surveys: surveys,
            title: 'Survey',
            bodyId: 'survey' 
          });
      });
    } else {
      if (err) console.log(err);
      res.status(403).send('Forbidden');
    }
  });

};

exports.results = function(req, res) {
  var user = req.user;
  var sid = req.params.id;
  Organization.findOne({owner: user._id}, function(err, org){
    if (org) {
      Survey.findOne({_id: sid})
      .populate({path: 'questions', model: 'Question'})
      .populate({path: 'organization', select: {name: 1}})
      .populate({path: 'groups', model: 'Group', select: {name: 1}})
      .exec(function(err, survey){
        Survey.populate(survey, {
          path: 'questions.answers',
          model: 'Answer'
        }, function(err, survey){
          var dataObject = {};
          var values = {};
          _.each(survey.questions, function(q, i){
            dataObject[i] = {};
            if (q.type == 'scale') {
              for (var c = 1; c != q.scale + 1; ++c) {
                dataObject[i][String(c)] = 0;
              }
            } else if (q.type == 'multiple') {
              _.each(q.values, function(v){
                dataObject[i][v.question] = 0;
                values[String(v.order)] = v.question;
              });
            }
            _.each(q.answers, function(a) {
              if (q.type == 'scale') {
                dataObject[String(i)][String(a.value)] += 1;
              } else if (q.type == 'multiple') {
                var key = values[String(a.value)];
                dataObject[i][key] += 1;
              }
            });
          });
          var data = {};
          var keys = _.keys(dataObject);
          _.each(keys, function(k){
            var item = dataObject[k];
            data[k] = [];

            data[k].push(['Option', 'Count']);
            var iKeys = _.keys(item);
            var numbers = [];
            _.each(iKeys, function(ik){
              data[k].push([ik, item[ik]]);
            });
          });
          var util = require('util');
          console.log(util.inspect(data));
          res.render('surveys/results', {
            currentUser: user,
            auth: true,
            survey: survey,
            title: 'Survey',
            bodyId: 'survey',
            data: data 
          });
        });
      });
    } else {
      res.status(403, 'Forbidden');
    }
  });
}

exports.summary = function(req, res){
  var user = req.user;
  var sid = req.params.id;
  Organization.findOne({owner: user._id}, function(err, org){
    if (org) {
      Survey.findOne({_id: sid})
      .populate({path: 'questions', model: 'Question'})
      .populate({path: 'organization', select: {name: 1}})
      .populate({path: 'groups', model: 'Group', select: {_id: 1, name: 1}})
      .populate({path: 'completed', model: 'User', select: {_id: 1, name: 1, profile_photo_url: 1}})
      .populate({path: 'targeted_users.user', model: 'User', select: {_id: 1, name:1, profile_photo_url: 1}})
      .exec(function(err, survey){
        Survey.populate(survey, {
          path: 'questions.answers',
          model: 'Answer'
        }, function(err, survey){
          console.log(survey.targeted_users[0]);
          var data = [['Date', 'Responses']];
          var groupedAnswers = _.groupBy(survey.questions[0].answers, function(a){
            var key = moment(a.create_date).format('M/D/YYYY');
            return key;
          });
          var dates = _.keys(groupedAnswers);
          console.log(dates);
          var lastDate = new Date(dates[dates.length - 1]);
          var keys = [];
          for (var t = 7; t >=0; t--) {
            var currentDate = new Date();
            currentDate.setDate(lastDate.getDate() - t);
            var key = moment(currentDate).format('M/D/YYYY');
            keys.push(key);
          }
          _.each(keys, function(key){
            var pair = [];
            pair.push(moment(key).format('M/D'));
            pair.push(groupedAnswers[key]?groupedAnswers[key].length:0);
            data.push(pair);
          });
          var completed = [];
              _.each(survey.completed, function(u){
                var obj = {};
                obj.user = u;
                var userAnswers = [];
                _.each(survey.questions, function(q){
                  var ans = _.filter(q.answers, function(a){
                    if (String(a.user) == String (u._id)) {
                      return true;
                    }
                    return false;
                  });
                  _.each(ans, function(a){
                    userAnswers.push(a);
                  });
                });
                var lastDate = false;
                var firstDate = false;
                console.log(userAnswers);
                _.each(userAnswers, function(ua){
                  console.log(ua);
                  if (!lastDate) lastDate = ua.create_date;
                  if (!firstDate) firstDate = ua.create_date;
                  if (ua.create_date < firstDate) {
                    firstDate = ua.create_date
                  }
                  if (ua.create_date > lastDate) {
                    lastDate = ua.create_date;
                  }
                });
                obj.start = moment(firstDate).format('h:mmA');
                obj.finish = moment(lastDate).format('h:mmA');
                obj.date = moment(lastDate).format('M/D/YYYY');
                obj.duration = moment.utc(moment.duration(moment(lastDate).subtract(firstDate)).asMilliseconds()).format('HH:mm:ss');
                completed.push(obj);
              });
              var tUsers = survey.targeted_users;
              var nonresponders = _.filter(tUsers, function(userObj){
                var valid = true;
                _.each(survey.completed, function(comp){
                  if (String(userObj.user._id) == String(comp._id)) {
                    valid = false;
                  }
                });
                return valid;
              });
              var nr = [];
              _.each(nonresponders, function(non){
                non = non.toObject();
                non.sentDate = moment(non.create_date).format('M/D/YYYY');
                non.sentTime = moment(non.create_date).format('h:mmA');
                nr.push(non);
              });
              console.log(nonresponders);
              res.render('surveys/summary', {
                currentUser: user,
                auth: true,
                survey: survey,
                title: 'Survey',
                bodyId: 'survey',
                data: data,
                completed: completed,
                nonresponders: nr
              });
        });
      });
    } else {
      res.status(403).send('Forbidden');
    }
  });

};

exports.exportCSV = function(req, res) {
  var user = req.user;
  var sid = req.params.sid;
  Organization.findOne({owner: user._id}, function(err, org){
    if (org) {
      Survey.findOne({_id: sid})
      .populate({path: 'questions', model: 'Question'})
      .exec(function(err, survey){
        Survey.populate(survey, {path: 'questions.answers', model: 'Answer'}, function(err, survey){
          Survey.populate(survey, {path: 'questions.answers.user', model: 'User'}, function(err, survey){
            var headers = [];
            var body = [];
            var answers = {};
            headers.push('User');
            headers.push('Time');
            _.each(survey.questions, function(q){
              headers.push(q.text);
              _.each(q.answers, function(a){
                var aw = a.value;
                if (q.type == 'multiple') {
                  _.each(q.values, function(qv){
                    if (qv.order == aw) {
                      aw = qv.question;
                    }
                  });
                }
                if (!answers[a.user._id]) {
                  answers[a.user._id] = [a.user.name, a.create_date];
                }
                answers[a.user._id].push(aw);
              });
            });
            var csv = [];
            csv.push(headers.join(','));
            for (var key in answers) {
              csv.push(answers[key].join(','));
            }
            csv = csv.join('\n');
            res.status(200);
            res.contentType('application/octet-stream');
            res.send(csv);

          });
        });
      });
    } else {
      res.status(403).send('Forbidden');
    }
  });
};

exports.getUserResponses = function(req, res){
  var user = req.user;
  var uid = req.params.uid;
  var sid = req.params.sid;
  validateAdmin(user, function(org){
    if (org){
      Survey.findOne({_id: sid})
      .populate({path: 'questions', model: 'Question'})
      .exec(function(err, survey){
        if (survey) {
          Survey.populate(survey, 
            {path: 'questions.answers', 
            model: 'Answer'} ,
            function(err, survey){
              Survey.populate(survey, {
                path: 'questions.answers.user', 
                model: 'User', 
                select: {_id: 1, name: 1, profile_photo_url: 1, first_name: 1}},
              function(err, survey){
                if (survey) {
                  var questions = [];
                  var surveyUser = false;
                  _.each(survey.questions, function(q){
                    var obj = {};
                    obj.question = q.text;
                    _.each(q.answers, function(a){
                      if (String(a.user._id) == String(uid)) {
                        surveyUser = a.user;
                        var val = a.value;
                        if (q.type == 'multiple'){
                          _.each(q.values, function(v){
                            if (v.order == a.value) {
                              val = v.question;
                            }
                          });
                        }
                        obj.response = val;
                        questions.push(obj);
                      }
                    });
                  });

                  res.render('surveys/details', {questions: questions, user: surveyUser});
                } else {
                  if (err) console.log(err);
                  res.status(400).send();
                }
              });
          }); 
        } else {
          if (err) console.log(err);
          res.status(400).send();
        }
      });
    } else {
      res.status(403).send('Forbidden');
    }
  });
};
