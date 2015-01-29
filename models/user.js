var serial = require('serializer');
var utils = require('../utils');
var _ = require('underscore');
var moment = require('moment');
var mongoose = require('mongoose');
var ObjectId          = require('mongoose').Types.ObjectId;
var ObjectIdType      = mongoose.Schema.Types.ObjectId;

var orgStatusSchema = new mongoose.Schema({
  organization          : {type: ObjectIdType, ref: 'Organization', required: true},
  status                : {type: String, default: 'pending', required: true},
  create_date           : {type: Date, default: Date.now()}
})

var userSchema = new mongoose.Schema({
  age                   : {type: Number, default: 0},
  name                  : {type: String, default: ''},
  first_name            : {type: String, required: true},
  last_name             : {type: String, default: ''},
  email                 : {type: String, required: true,
                          index: {unique: true}, lowercase: true},
  info                  : {type: String, default: null},
  website               : {type: String, default: null},
  ethnicity             : {type: String, default: null},
  religion              : {type: String, default: null},
  phone_number          : {type: String, default: null},
  affiliations          : {type: Array, default:[]},
  password              : {type: String, default: null},
  provider              : {type: String, default: null},
  provider_id           : {type: String, default: null},
  provider_token        : {type: String, default: null},
  provider_token_secret : {type: String, default: null},
  last_provider_auth    : {type: Date, default: null},
  gender                : {type: String, default: null},
  birthday              : {type: String, default: null},
  address               : {type: String, default: null},
  city                  : {type: String, default: null},
  country               : {type: String, default: null},
  state                 : {type: String, default: null},
  zip_postal            : {type: String, default: null},
  cover_photo_url       : {type: String, default: ''},
  profile_photo_url     : {type: String, default: ''},
  create_date           : {type: Date, default: null},
  modify_date           : {type: Date, default: null},
  delete_date           : {type: Date, default: null},
  last_login_date       : {type: Date, default: null},
  posts_count           : {type: Number, default: 0},
  following             : {type: Array, default: []},
  followers             : {type: Array, default: []},
  following_count       : {type: Number, default: 0},
  followers_count       : {type: Number, default: 0},
  trust_count           : {type: Number, default: 0},
  type                  : {type: String, default: 'user'},
  date_founded          : {type: Date, default: null},
  mascot                : {type: String, default: null},
  enrollment            : {type: Number, default: null},
  instagram_token       : {type: String, default: null},
  instagram_min_id      : {type: String, default: null},
  twitter_token         : {type: String, default: null},
  twitter_min_id        : {type: String, default: null},
  tumblr_token          : {type: String, default: null},
  tumblr_min_id         : {type: String, default: null},
  tumblr_token_secret   : {type: String, default: null},
  review_key            : {type: String, default: null},
  reset_key             : {type: String, default: null},
  reset_date            : {type: String, default: null},
  password_reset        : {type: String, default: null},
  device_token          : {type: String, default: null},
  subtype               : {type: String, default: null},
  badge_count           : {type: Number, default: 0},
  active                : {type: Boolean, default: true},
  program_code          : {type: String, default: null},
  interests             : {type: Array, default: []},
  insight_count         : {type: Number, default: 0},
  unsubscribed          : {type: Boolean, default: false},
  pwd_updated           : {type: Boolean, default: false},
  org_status            : [orgStatusSchema]
},{ versionKey          : false });

userSchema.methods.createUserSalt = function(){
  return serial.stringify(this._id+this.create_date.valueOf()+this.email);
};

userSchema.methods.hashPassword = function(){
  if(this.password) {
    var salt = process.env.PRIZM_SALT;
    var pass = this.password;
    this.password = utils.prismEncrypt(this.password, salt);
    this.pwd_updated = true;
    if (this.password != pass){
      return true;
    }
  }
  return false;
};

userSchema.methods.validatePassword = function(password) {
  var salt = process.env.PRIZM_SALT;
  var hashed_password = utils.prismEncrypt(password, salt);
  if (_.isEqual(this.password, hashed_password)) {
    return true;
  }
  else {
    var old_salt = this.createUserSalt();
    hashed_password = utils.prismEncrypt(password, old_salt);
    if (_.isEqual(this.password, hashed_password)) {
      this.password = password;
      this.pwd_updated = true;
      if (this.hashPassword()){
        this.save();
        return true;
      }
    }
  }
  return false;
}

userSchema.statics.findOrganizationMembers = function(filters, next) {
  this.model('User').find({'org_status': {$elemMatch: filters}}, function(err, users) {
    next(err, users);
  });
};


userSchema.pre('save', function(next){
  var birthday = this.birthday?this.birthday.split('-'):false;
  if (birthday && birthday.length == 3) {
    birthday = [birthday[2], birthday[0] - 1, birthday[1]];
    birthday = moment(birthday);
    diff = moment().diff(birthday, 'years');
    if (diff != this.age) {
      this.age = diff;
    }
  }
  next();
});


mongoose.model('User', userSchema);
