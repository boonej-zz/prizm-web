var mongoose = require('mongoose');
var ObjectId      = mongoose.Schema.Types.ObjectId;

var groupSchema = new mongoose.Schema({
  name          : {type: String, required: true},
  description   : {type: String, default: ''},
  organization  : {type: ObjectId, ref: 'Organization', required: true},
  leader        : {type: ObjectId, ref: 'User', required: false},
  create_date   : {type: Date},
  status        : {type: String, default: 'active', required: true} 
});

groupSchema.statics.newGroup = function(obj, next){
  console.log(obj);
  if (obj.organization && obj.name) {
    var model = new this(obj);
    model.save(function(err, group){
      console.log('Error: ' + err);
      console.log('Group: ' + group);
      next(err, group);
    });
  } else {
    return false;
  }
}

groupSchema.pre('save', function(next){
  if (!this.status) {
    this.status = 'active';
  }
  if (!this.create_date) {
    this.create_date = Date.now();
  }
  next();
});

mongoose.model('Group', groupSchema);
