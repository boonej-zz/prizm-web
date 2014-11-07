var mongoose = require('mongoose');

var interestSchema = new mongoose.Schema({
  create_date     : {type:Date, default: Date.now()},
  text            : {type: String, default: null, required:true},
  subinterests    : {type: Array, default: []},
  is_subinterest  : {type: Boolean, default: false} 
});

interestSchema.statics.selectFields = function(type){
  var select = ['_id', 'text', 'create_date', 'subinterests', 'is_subinterest'];
  return select;
}

interestSchema.methods.format = function(type, add_fields){
  var format;
  if(!type) type = 'basic';
  format = {
    _id: this._id,
    create_date: this.create_date,
    text: this.text,
    subinterests: this.subinterests,
    is_subinterest: this.is_subinterest
  };
  return format;
}

interestSchema.statics.canResolve = function(){
  return [
    {subinterests: {identifier: '_id', model: 'Interest'}}
  ];
};

mongoose.model('Interest', interestSchema);