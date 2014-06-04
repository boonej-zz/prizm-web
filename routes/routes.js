var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Record = mongoose.model('Record');
var config = require('../config');
var mandrill = require('node-mandrill')(config.mandrill.client_secret);
var mandrillEndpointSend = '/messages/send';

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
  record.save();
  mandrill(mandrillEndpointSend, {
      message: {
                  to: [{email: record.email}],
                  from_email: 'admin@prizmapp.com',
                  subect: 'Test email from prizmapp.com',
                  html: '<h1>This is a test to make sure mail works</h2>'
               }   
    }, function(err, response) {
      if (err) {
        console.log('MANDRILL ERROR RETURNED: ' + JSON.stringify(err));
      }
    }
  ); 
  res.send('success'); 
});

module.exports = router;
