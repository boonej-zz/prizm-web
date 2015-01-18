// Profile Helper
var _ = require('underscore');

var shuffle = function(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

exports.shufflePostImagesForProfileHeader = function(posts) {
  if (posts.length < 16) {
    return posts;
  }
  else {
    var profileImages = [];
    _.each(posts, function(post, index, list) {
      profileImages[index] = post.file_path;
    });
    var shuffledImages = shuffle(profileImages);
    return shuffledImages;
  }
};



