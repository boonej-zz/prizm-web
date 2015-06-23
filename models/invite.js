var mongoose = require('mongoose');
var ObjectId      = mongoose.Schema.Types.ObjectId;
var crypto = require('crypto');

var inviteSchema = new mongoose.Schema({
  address       : {type: String, required: true, index: true},
  status        : {type: String, default: 'unsent'},
  user          : {type: ObjectId, ref: 'User', required: false},
  organization  : {type: ObjectId, ref: 'Organization', index: true},
  code          : {type: String, required: false},
  create_date   : {type: Date},
  modify_date   : {type: Date},
  group         : {type: ObjectId, ref: 'Group', required: false}
});


function generateCode() {
  var chars = 'abcdefghijklmnopqrstuwxyz';
  var rnd = crypto.randomBytes(6);
  var value = new Array(6)
  var len = chars.length;
  for (var i = 0; i < 6; i++) {
    value[i] = chars[rnd[i] % len]
  };
  return value.join('');
}

inviteSchema.pre('save', function(next){
  if (!this.create_date){
    this.create_date = Date.now();
  }
  if (!this.code) {
    this.code = generateCode();
  }
  this.modify_date = Date.now();
  next();
});

mongoose.model('Invite', inviteSchema);
