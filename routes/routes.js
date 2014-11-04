var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Record = mongoose.model('Record');
var Post = mongoose.model('Post');
var User = mongoose.model('User');
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
  res.redirect('/#about');
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

router.get('/newindex', function (req, res) {
  res.render('newindex', { title: 'Prizm App', selected: 'none'});
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

module.exports = router;
