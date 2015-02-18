var basicAuth = require('basic-auth');
var uuid = require('node-uuid');
var crypto = require('crypto');
var express = require('express');
var basicAuth = require('basic-auth-connect');
var _ = require('underscore');

exports.auth = basicAuth(function(user, pass, next){
  var result = (user === 'beprizmatic' && pass === '@pple4Life');
  next(null, result);
});

exports.prismEncrypt = function(string, salt_key){
  var cipher  = crypto.createCipher('aes-256-cbc', salt_key);
  var crypted = cipher.update(string, 'utf8', 'hex');
  crypted     += cipher.final('hex');
  return crypted;
};

exports.validateEmail = function(email) {
  if (email.length == 0) return false;
  var reg = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}\b/i;
  return reg.test(email);
}

exports.generateUUID = function(suffix) {
	return uuid.v1() + '-' + suffix;
}

exports.replaceTagsFromUserList = function(string, userList){
  console.log(userList);
  var ps = '<a class="tag-link" href="/profiles/';
  var pm = '">@';
  var pe = '</a>';
  var newString = string;
  var match = string.match(/@\S{24}/g); 
  if (match && match.length > 0){
    _.each(match, function(tag, idx, list){
      if (tag && tag.length > 0){
        var uid = tag.substr(1);
        var mu = _.find(userList, function(user){
          return String(user._id) == uid;
        });
        if (mu) {
          var replace = ps + String(mu._id) + pm + mu.name + pe;
          newString = newString.replace(tag, replace);
        }
      }
    });
  }
  return newString;
};
