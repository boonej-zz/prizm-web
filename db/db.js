// var serial = require('serializer');
// var utils = require('../utils');
// var mongoURI = process.env.MONGOHQ_URL || 'mongodb://localhost/prizm';

// var mongoose = require('mongoose');

// var activitySchema = new mongoose.Schema({
//   from:             {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
//   to:               {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
//   create_date:      {type: Date, default: Date.now(), required: false},
//   action:           {type: String, default: null, required: false},
//   post_id:          {type: String, default: null, required: false},
//   comment_id:       {type: String, default: null, required: false},
//   insight_id:       {type: String, default: null, required: false},
//   insight_target_id: {type: String, default: null, required: false},
//   has_been_viewed:  {type: Boolean, default: false, required: false}
// }, { versionKey: false });

// var recordSchema = new mongoose.Schema({
//   name:       String,
//   age:        Number,
//   gender:     String,
//   cityState:  String,
//   email:      String,
//   mobile:     String
// });

// var postSchema = new mongoose.Schema({
//   _id                 : {type: mongoose.Schema.Types.ObjectId, required:true},
//   text                : {type: String, default: null},
//   category            : {type: String, required:true},
//   create_date         : {type: Date, default:null, index: true},
//   modify_date         : {type: Date, default: Date.now()},
//   delete_date         : {type: Date, default: null},
//   scope               : {type: String, default: 'public'},
//   location_name       : {type: String, default: null},
//   location_longitude  : {type: Number, default: 0},
//   location_latitude   : {type: Number, default: 0},
//   creator             : {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
//   status              : {type: String, default: 'active'},
//   file_path           : {type: String, default: ''},
//   likes_count         : {type: Number, default: 0},
//   comments_count      : {type: Number, default: 0},
//   tags_count          : {type: Number, default: 0},
//   tags                : {type: Array, default: []},
//   // comments            : [commentSchema],
//   likes               : {type: Array, default: []},
//   hash_tags           : [String],
//   hash_tags_count     : {type: Number, default: 0},
//   is_flagged          : {type: Boolean, default: false},
//   flagged_count       : {type: Number, default: 0},
//   flagged_reporters   : [{reporter_id: String, create_date: Date}],
//   is_repost           : {type: Boolean, default: false},
//   origin_post_id      : {type: String, default: null},
//   external_provider   : {type: String, default: null},
//   external_link       : {type: String, default: null},
//   type                : {type: String, default: 'user'},
//   subtype             : {type: String, default: null},
//   scope_modify_date   : {type: Date, default: null},
//   accolade_target     : {type: String, default: null}
// }, { versionKey: false});

// var userSchema = new mongoose.Schema({
//   name                  : {type: String, default: ''},
//   first_name            : {type: String, required: true},
//   last_name             : {type: String, default: ''},
//   email                 : {type: String, required: true,
//                           index: {unique: true}, lowercase: true},
//   info                  : {type: String, default: null},
//   website               : {type: String, default: null},
//   ethnicity             : {type: String, default: null},
//   religion              : {type: String, default: null},
//   phone_number          : {type: String, default: null},
//   affiliations          : {type: Array, default:[]},
//   password              : {type: String, default: null},
//   provider              : {type: String, default: null},
//   provider_id           : {type: String, default: null},
//   provider_token        : {type: String, default: null},
//   provider_token_secret : {type: String, default: null},
//   last_provider_auth    : {type: Date, default: null},
//   gender                : {type: String, default: null},
//   birthday              : {type: String, default: null},
//   address               : {type: String, default: null},
//   city                  : {type: String, default: null},
//   country               : {type: String, default: null},
//   state                 : {type: String, default: null},
//   zip_postal            : {type: String, default: null},
//   cover_photo_url       : {type: String, default: ''},
//   profile_photo_url     : {type: String, default: ''},
//   create_date           : {type: Date, default: null},
//   modify_date           : {type: Date, default: null},
//   delete_date           : {type: Date, default: null},
//   last_login_date       : {type: Date, default: null},
//   posts_count           : {type: Number, default: 0},
//   following             : {type: Array, default: []},
//   followers             : {type: Array, default: []},
//   following_count       : {type: Number, default: 0},
//   followers_count       : {type: Number, default: 0},
//   trust_count           : {type: Number, default: 0},
//   type                  : {type: String, default: 'user'},
//   date_founded          : {type: Date, default: null},
//   mascot                : {type: String, default: null},
//   enrollment            : {type: Number, default: null},
//   instagram_token       : {type: String, default: null},
//   instagram_min_id      : {type: String, default: null},
//   twitter_token         : {type: String, default: null},
//   twitter_min_id        : {type: String, default: null},
//   tumblr_token          : {type: String, default: null},
//   tumblr_min_id         : {type: String, default: null},
//   tumblr_token_secret   : {type: String, default: null},
//   review_key            : {type: String, default: null},
//   reset_key             : {type: String, default: null},
//   reset_date            : {type: String, default: null},
//   password_reset        : {type: String, default: null},
//   device_token          : {type: String, default: null},
//   subtype               : {type: String, default: null},
//   badge_count           : {type: Number, default: 0},
//   active                : {type: Boolean, default: true},
// },{ versionKey          : false });

// var insightSchema = new mongoose.Schema({
//   creator         : {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
//   create_date     : {type: Date, default: null, required: false, index: true},
//   title           : {type: String, default: null, required: true},
//   text            : {type: String, default: null, required: true}, 
//   file_path       : {type: String, default: ''},
//   likes_count     : {type: Number, default: 0},
//   dislikes_count  : {type: Number, default: 0},
//   tags_count      : {type: Number, default: 0},
//   tags            : {type: Array, default: []},
//   hash_tags       : {type: [String], default: []},
//   hash_tags_count : {type: Number, default: 0},
//   link            : {type: String, default: null},
//   link_title      : {type: String, default: null}
// }); 

// var insightTargetSchema = new mongoose.Schema({
//   create_date     : {type: Date, default: null, required: false, index: true},
//   insight         : {type: mongoose.Schema.Types.ObjectId, ref: 'Insight', required: true},
//   creator         : {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
//   target          : {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
//   liked           : {type: Boolean, default: false},
//   disliked        : {type: Boolean, default: false},
//   file_path       : {type: String, default: null}
// });

// insightSchema.pre('save', function(next){
//   this.create_date = Date.now();
//   next();
// });

// insightTargetSchema.pre('save', function(next){
//   this.create_date = Date.now();
//   next();
// });

// activitySchema.pre('save', function(next) {
//   this.create_date = Date.now();
//   next();
// });

// userSchema.methods.createUserSalt = function(){
//   return serial.stringify(this._id+this.create_date.valueOf()+this.email);
// };

// userSchema.methods.hashPassword = function(){
//   if(this.password && this.create_date && this.email){
//     var user_salt = this.createUserSalt();
//     console.log(user_salt);
//     var old_pass = this.password;
//     this.password = utils.prismEncrypt(this.password, user_salt);
//     if(this.password != old_pass && this.password.length > old_pass.length){
//       return true;
//     }
//   }
//   return false;
// };

// mongoose.model('Activity', activitySchema);
// mongoose.model('Record', recordSchema);
// mongoose.model('Post', postSchema);
// mongoose.model('User', userSchema);
// mongoose.model('Insight', insightSchema);
// mongoose.model('InsightTarget', insightTargetSchema);

// mongoose.connect(mongoURI);
