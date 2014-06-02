var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Prizm', selected:'home' });
});

router.get('/about', function(req, res) {
  res.render('about', { title: 'About', selected:'about' });
});

router.post('/', function(req, res) {
  
});

module.exports = router;
