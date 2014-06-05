var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Record = mongoose.model('Record');
var config = require('../config');
var mandrill = require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';
var ejs = require('ejs');
var fs = require('fs');
var path = require('path');
var mail = fs.readFileSync(path.join(__dirname + '/../lib/mail.ejs'), 'utf8');

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
        }
      }
    ); 
  }
  res.send('success'); 
});

module.exports = router;
