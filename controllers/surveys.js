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

exports.newSurvey = function(req, res){
  var user = req.user;
  Organization.findOne({owner: user._id})
  .exec(function(err, org){
    if (err) console.log(err);
    if (org){
      res.render('create/survey', {organization: org});
    } else {
      res.status(403).send('Forbidden');
    }
  });
};

exports.createSurvey = function(req, res){
  var user = req.user;
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
              res.render('create/survey', {organization: org, survey: s}); 
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
                  res.render('create/survey', {organization: org, survey: s});
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
            User.find(criteria)
            .exec(function(err, users){
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
      Survey.find({creator: user._id})
      .populate({path: 'questions', model: 'Question'})
      .populate({path: 'organization', select: {name: 1}})
      .populate({path: 'questions.answers', model: 'Answer'})
      .populate({path: 'groups', model: 'Group', select: {name: 1}})
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
          res.send('<pre>' + JSON.stringify(surveys, null, 2) + '</pre>');
      });
    } else {
      if (err) console.log(err);
      res.status(403).send('Forbidden');
    }
  });

};
