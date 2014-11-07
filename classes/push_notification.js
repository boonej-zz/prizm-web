/**
 * PushNotification Class
 *
 * @author DJ Hayden <dj.hayden@stablekernel.com>
 */

/**
 * Module dependencies
 */

var _           = require('underscore'),
    _mongoose   = require('mongoose'),
    _request    = require('request');
    // _logger     = require(process.env.PRISM_HOME + 'logs.js');

var mongoose = require('mongoose');
var User = mongoose.model('User');

/**
 * Expose `PushNotification`
 */
module.exports = PushNotification;

/**
 * PushNotification Constructor
 *
 * @param {String} type The type of push notification
 * @param {Object} object The associated type object
 */
function PushNotification(type, object, block){
  var self = this;
  this.type = type;
  this.object = object;
  this.payload = null;
  this.message = null;
  this.device = null;
  this.badge = 1;
  this.callback = block || null;

  self.process();
}

var findUserById = function(user_id, block){
  User.findOne({_id: user_id}, function(err, found){
    if(err || !found){
      block(false);
    }else{
      block(found);
    }
  });
};

PushNotification.prototype.process = function process(){
  if(this.type && this.object){
    if(this.type === 'activity'){
      this.activity();
    }
  }
};

PushNotification.prototype.activity = function activity(){
  if( this.object.action === 'comment' ||
      this.object.action === 'like' ||
      this.object.action === 'tag' ||
      this.object.action === 'trust_accepted' ||
      this.object.action === 'accolade' ||
      this.object.action === 'trust_request'|| 
      this.object.action === 'insight'){

    var self = this;

    //fetch "to" user object
    findUserById(this.object.to, function(user){
      console.log('logging user returned from object'+JSON.stringify(user));
      if(user && user._id && user.device_token){
        user.badge_count = user.badge_count + 1;
        self.device = user.device_token;
        self.payload = {_id: self.object._id};
        self.badge = user.badge_count;
        user.save(function(error){
          if(error) console.log('error', 'unable to update new badge count', {error:error});
        });
        var action = "";
        if(self.object.action === 'comment') action = 'commented on your post';
        if(self.object.action === 'tag') {
          if (! self.object.comment_id) {
            action = 'tagged you in a post';
          } else {
            action = 'tagged you in a comment';
          }
        }         if(self.object.action === 'like' && !self.object.comment_id){
          action = 'liked your post';
        }else if(self.object.action === 'like' && self.object.comment_id){
          action = 'liked your comment';
        }
        if(self.object.action === 'trust_accepted') action = 'accepted your trust request';
        if(self.object.action === 'trust_request') action = 'has sent you a trust invite';
        if(self.object.insight_id) {
          action = 'sent you an insight';
        }
        if(self.object.action === 'accolade') action = 'has sent you an accolade';
        findUserById(self.object.from, function(from_user){
          console.log('logger user returned from from_user object:'+JSON.stringify(from_user));
          if(from_user && from_user._id){
            self.message = from_user.name + ' ' + action;
            self.send();
          }
        });
      }
    });
  }
};

PushNotification.prototype.send = function send(){
  console.log(this.message);
  console.log(this.device);
  if(this.message && this.device){
    var self = this;
    var last_notification = Date.now();
    _request({
      url: 'http://ec2-54-186-223-100.us-west-2.compute.amazonaws.com/push',
      method: "POST",
      json: true,
      body: {
        device: self.device,
        alert: self.message,
        payload: self.payload,
        badge: self.badge
      }
    }, function(err, result){
      console.log("pn sending error: " + JSON.stringify(err));
      //console.log("pn sending result body: "+JSON.stringify(result.body));
      if(err){
        // _logger.log('error',
        //             'Error trying to send push notification',
        //             {notification:self.message, device:self.device, error:err});
        console.log('Error trying to send push notification\n' + 
                    'Notification Message: ' + self.message + '\nDevice: ' + 
                    self.device + '\nError: ' +err);
        if(err.code === 'ECONNRESET' && last_notification >= Date.now() - 5000){
          console.log('Re-sending notification for: '+self.message+ 
                      '. ECONNRESET recieved and last notification was sent: '+last_notification);
          self.send();
        }
        if(self.callback) self.callback({success:false});
      }else{
        // _logger.log('info',
        //             'Successfully sent push notification',
        //             {device:self.device, user:self.object.to, notification:self.message});
        console.log('Successfully sent push notification\n' + 'Device: ' + self.device
                    + '\nUser: ' + self.object.to + '\nNotification: ' + self.message);
        if(self.callback) self.callback(result.body);
      }
    });
  }
};
