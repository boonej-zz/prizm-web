var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var trustSchema = new mongoose.Schema({
  from                : { type: ObjectId,
                          ref: 'User',
                          required: true },
  from_posts          : { type: Array, default: [] },
  from_comments       : { type: Array, default: [] },
  from_post_likes     : { type: Array, default: [] },
  from_comment_likes  : { type: Array, default: [] },
  from_posts_count    : { type: Number, default: 0 },
  from_comments_count : { type: Number, default: 0 },
  from_likes_count    : { type: Number, default: 0 },
  to                  : { type: ObjectId,
                          ref: 'User',
                          required: true },
  to_posts            : { type: Array, default: [] },
  to_comments         : { type: Array, default: [] },
  to_post_likes       : { type: Array, default: [] },
  to_comment_likes    : { type: Array, default: [] },
  to_posts_count      : { type: Number, default: 0 },
  to_comments_count   : { type: Number, default: 0 },
  to_likes_count      : { type: Number, default: 0 },
  type                : { type: String, default: null },
  status              : { type: String, default: 'pending',
                          lowercase: true },
  create_date         : { type: Date, default: null },
  modify_date         : { type: Date, default: null },
  delete_date         : { type: Date, default: null },
  last_modified_by    : { type: String, default: null },
  from_score          : { type: Number, default: null },
  to_score            : { type: Number, default: null }
});

mongoose.model('Trust', trustSchema);
