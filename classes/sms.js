var twilio = require('twilio');
var client = new twilio.RestClient(
    process.env.TWILIO_SID, 
    process.env.TWILIO_TOKEN
);
var TWILIO_NUMBER = process.env.TWILIO_NUMBER;
var mongoose = require('mongoose');
var User = mongoose.model('User');
var SMS = mongoose.model('SMS');
var _ = require('underscore');

var formatNumber = function(n){
  var number = n;
  number = number.replace('-', '');
  number = number.replace('(', '');
  number = number.replace(')', '');
  number = number.replace(' ', '');
  number = number.replace('.', '');
  number = number.substr(0, 1) == '1'?'+' + number:'+1' + number;
  return number;
}

exports.sendMessage = function(notification, next){
  console.log('sending');
  console.log(notification);
  User.findOne({_id: notification.to})
  .exec(function(err, user){
  if (err) console.log(err);
  var number = user.phone_number;
  number = number.replace('-', '');
  number = number.replace('(', '');
  number = number.replace(')', '');
  number = number.replace(' ', '');
  number = number.replace('.', '');
  number = number.substr(0, 1) == '1'?'+' + number:'+1' + number;
  console.log(number);
  client.sms.messages.create({
    to: number,
    from: TWILIO_NUMBER,
    body: notification.text
  }, next);
  });
};

exports.getMessages = function(next){
  client.messages.get(function(err, response){
    _.each(response.messages, function(m){
      if (m && m.subresource_uris) {
      console.log(m.subresource_uris);
      }
    }) 
    next(err, response);
  });
};

exports.getMessage = function(id, next){
  client.messages(id).get(function(err, response){
    console.log(response);
    next(err, response);
  });
};

exports.receiveMessage = function(req, res){
  var body = req.body;
  var token = process.env.TWILIO_TOKEN;
  var header = req.get('x-twilio-signature');
  if (twilio.validateRequest(token, header, 'https://www.prizmapp.com/sms',
        body)) {
    var resp = new twilio.TwimlResponse();
    resp.message('');
    console.log(resp.toString());
    res.set('Content-type', 'text/xml');
    res.send(resp.toString());
  } else {
    res.status(403).send();
  }
};

exports.client = client;
