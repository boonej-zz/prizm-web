var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Record = mongoose.model('Record');

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
  res.send('success');
});

module.exports = router;
