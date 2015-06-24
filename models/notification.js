var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var Sms = require('../classes/sms');
var SMS = mongoose.model('SMS');

var notificationSchema = new mongoose.Schema({
  from:               {type: ObjectId, ref: 'User', required: true},
  to:                 {type: ObjectId, ref: 'User', required: true},
  create_date:        {type: Date},
  text:               {type: String},
  replies:            {type: Array, default: []},
  sms:                {type: ObjectId, ref: 'SMS'} 
});

notificationSchema.statics.create = function(params, next){
  if (params.from && params.to) {
     var note = new this({
       from: params.from,
       to:  params.to
     });
     note.create_date = Date.now();
     note.text = params.text || '';
     note.save(function(err, n){
       if (err) console.log(err);
       if (n){
          Sms.sendMessage(n, function(err, response){
            if (response) {
              var s = new SMS(response);
              s.save(function(err, saved){
                n.sms = saved._id;
                n.save(function(err){
                  if (err) console.log(err);
                });
                next(err, n);
              });
            } else {
              next(err, n);
            }
          });
         
       }
     });
  } else {
    next(false, false);
  }
};

mongoose.model('Notification', notificationSchema);
