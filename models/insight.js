var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var insightSchema = new mongoose.Schema({
  creator         : {type: ObjectId, ref: 'User', required: true},
  create_date     : {type: Date, default: null, required: false, index: true},
  title           : {type: String, default: null, required: true},
  text            : {type: String, default: null, required: true}, 
  file_path       : {type: String, default: ''},
  likes_count     : {type: Number, default: 0},
  dislikes_count  : {type: Number, default: 0},
  tags_count      : {type: Number, default: 0},
  tags            : {type: Array, default: []},
  hash_tags       : {type: [String], default: []},
  hash_tags_count : {type: Number, default: 0},
  link            : {type: String, default: null},
  link_title      : {type: String, default: null}
}); 

insightSchema.pre('save', function(next){
  this.create_date = Date.now();
  next();
});

mongoose.model('Insight', insightSchema);