var crypto = require('crypto');

exports.prismEncrypt = function(string, salt_key){
  var cipher  = crypto.createCipher('aes-256-cbc', salt_key);
  var crypted = cipher.update(string, 'utf8', 'hex');
  crypted     += cipher.final('hex');
  return crypted;
};
