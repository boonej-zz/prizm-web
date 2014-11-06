var basicAuth = require('basic-auth');
var crypto = require('crypto');

exports.prismEncrypt = function(string, salt_key){
  var cipher  = crypto.createCipher('aes-256-cbc', salt_key);
  var crypted = cipher.update(string, 'utf8', 'hex');
  crypted     += cipher.final('hex');
  return crypted;
};

exports.basicAuth = function (req, res, next) {
  function unauthorized(res) {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    return res.send(401);
  };

  var user = basicAuth(req);

  if (!user || !user.name || !user.pass) {
    return unauthorized(res);
  };

  if (user.name === 'beprizmatic' && user.pass === '@pple4Life') {
    return next();
  } else {
    return unauthorized(res);
  };
};

exports.validateEmail = function(email) {
  if (email.length == 0) return false;
  var reg = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}\b/i;
  return reg.test(email);
}