var express       = require('express');
var router        = express.Router();
var mongoose      = require('mongoose');
var AWS           = require('aws-sdk');
var AWS_ACCESS_KEY = 'AKIAJ656TNM2SYQUMHCA';
var AWS_SECRET_KEY = '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'; 
var S3_BUCKET = 'higheraltitude.prizm.insights'; 
var multiparty = require('multiparty');
var Image = require('../lib/helpers/image');
var Insight = mongoose.model('Insight');
var Organization = mongoose.model('Organization');
var User = mongoose.model('User');
var InsightTarget = mongoose.model('InsightTarget');
var Activity = mongoose.model('Activity');
var _ = require('underscore');
var Push = require('../classes/push_notification');
var helpers = require('../lib/helpers');

exports.createInsight = function(req, res){
  var user = req.user;
  console.log('creating insight');
  Image.uploadInsight(req, function(err, path, fields){
    if (err) {
      console.log(err);
      res.status(500).send(err);
      return;
    }
    console.log(path);
    console.log('uploaded image');
    if (path) {
      console.log('populating data');
      var data = {creator: user._id, file_path: path};
      var allowed = ['title', 'text', 'link', 'hash_tags'];
      for (var prop in fields) {
        if (_.indexOf(allowed, prop) != -1){
          var value = fields[prop][0];
          if (prop == 'hash_tags') {
            var tags = value.replace(/#/g, '');
            tags = tags.replace(/,/g, ';');
            tags = tags.replace(/\n/g, ';');
            tags = tags.replace(/\s+/g, ';');
            tags = tags.split(';');
            tags = _.uniq(tags);
            data.hash_tags = tags;
          } else if (prop == 'link') {
            var linkTitle = value.replace(/https?:\/\//g, '');
            linkTitle = linkTitle.replace(/www\./g, '');
            var index = linkTitle.indexOf('/');
            if (index != -1){
              linkTitle = linkTitle.substring(0, index);
            }
            data.link = value;
            data.link_title = linkTitle;
          } else {
            data[prop] = value;
          }
        } 
      } 
      var insight = new Insight(data);
      insight.save(function(err, insight){
        if (err) {
          console.log(err);
          res.status(400).send();
        } else {
          console.log('finding organization');
          Organization.findOne({owner: user._id})
          .populate({path: 'groups', model: 'Group'})
          .exec(function(err, org){
            console.log('found organization sending response');
            res.render('create/insight', {insight: insight, organization: org});
          });
          }
      });
    }
  }); 
};

exports.sendInsight = function(req, res){
  var user = req.user;
  console.log(req.body);
  var insight_id = req.body.insight_id;
  var subject = req.body.subject;
  var groups = req.body.groups;
  Organization.findOne({owner: user._id})
   .exec(function(err, org){
    if (err) console.log(err);
    if (org) {
      Insight.findOne({_id: insight_id}, function(err, insight){
        if (err) console.log(err);
        if (insight) {
          var criteria = {organization: org._id, status: 'active'};
          if (groups && groups.length > 0) {
            if (_.isArray(groups)) {
              console.log('Sending to multiple groups ' + groups);
              criteria.groups = {$in: groups};
            } else {
              if (groups != 'on') {
                console.log('Sending to one group ' + groups);
                criteria.groups = groups;
              } else {
                console.log('Sending to everybody!');
              }
            } 
          }
      
          User.findOrganizationMembers(criteria, 
            user._id, false, false, function(err, members){
            if (members) {
              _.each(members, function(m, i, l){
                InsightTarget.findOne({creator: user._id, 
                  insight: insight._id, 
                  target: m._id}, function(err, it){
                    if (err) console.log(err);
                    if (!it){
                      it = new InsightTarget({
                        target: m._id,
                        insight: insight._id,
                        creator: insight.creator,
                        file_path: insight.file_path
                      });
                      it.save(function(err, result){
                        if(err) {
                          console.log(err);
                          res.status(500).send();
                        }
                        var activity = new Activity({
                          from: it.creator,
                          to: it.target,
                          action: 'insight',
                          insight_id: it.insight,
                          insight_target_id: it._id
                        });
                        activity.save(function(err, result){
                          if (err){
                            console.log(err);
                          } else {
                            new Push('activity', activity, function(result){

                            });
                            helpers.mail.sendInsightEmail(it, false, subject);
                            res.status(200).send();
                          }
                        });
                      });
                    }
                  }); 
                }); 
            }
          });
        } else {
          res.status(400).send();
        }
      });
    } else {
      res.status(401).send();
    }
  }); 
};
