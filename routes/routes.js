var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Record = mongoose.model('Record');
var Post = mongoose.model('Post');
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
  res.render('index', { title: 'Prizm', selected:'home' });
});

router.get('/about', function(req, res) {
  res.render('about', { title: 'About', selected:'about' });
});

router.get('/terms', function(req, res) {
  res.render('terms', { title: 'Legal', selected:'none'});
});

router.get('/privacy', function(req, res){
  res.render('privacy', { title: 'Privacy', selected:'none'});
});

router.get('/partner', function(req, res){
  res.render('partner', { title: 'Partners', selected: 'none'});
});

router.get('/luminary', function(req, res){
  res.render('luminary', { title: 'Luminaries', selected: 'none'});
});

router.get('/download', function(req, res){
  res.render('download', { title: 'Download', selected: 'none'});
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
    }
    console.log(post.creator);
    var tags = '';
    for (var i = 0; i != post.hash_tags.length; ++i ) {
      if (i < 3) {
        tags = tags + '#' + post.hash_tags[i] + ' ';
      } else if (i == 3) {
        tags = tags + '...';
      }
    }
    moment.relativeTimeThreshold('d', 6);
    console.log(moment.relativeTimeThreshold('d'));
    var create = moment(post.create_date);
    var diff = create.fromNow(true);
    res.render('post', {post: post, tags: tags, ago: diff});
  });
});

module.exports = router;
