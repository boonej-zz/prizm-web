var uuid = require('node-uuid');
var AWS = require('aws-sdk');
var gm = require('gm');
var mime = require('mime');
var multiparty = require('multiparty');
var moment    = require('moment');

var IMAGE_FORMATS = {
  standard: { width: 1200, height: 1200 },
  thumbLg:  { width: 600,  height: 600 },
  thumbMd:  { width: 300,  height: 300 },
  thumbSm:  { width: 80,   height: 80 }
}

var AWS_BUCKET = 'higheraltitude.prism'
// var AWS_BUCKET = 'higheraltitude.prizm.test'

exports.uploadImage = function(req, res, settings, next) {
  var s3 = new AWS.S3();
  var form = new multiparty.Form();
  var date = moment().format('ssmmhhDDMMYYYY');
  var unique = uuid.v1();
  var fileExt = '.jpg';
  var fileName = date + unique + fileExt;
  var folder;
  var userId;
  var imageType;

  if (!settings) {
    next('Photo not uploaded, missing settings');
  }
  else {
    userId = settings['userId'];
    imageType = settings['imageType'];
  }

  if (!userId) {
    next('Need to provide userId to upload photo');
  }

  if (imageType == 'profile') {
    folder = 'profile/';
  }
  else {
    folder = userId + '/';
  }

  form.parse(req, function (err, fields, files) {
    var imageUrl  = 'https://s3.amazonaws.com/' + AWS_BUCKET 
                    + '/' + folder + fileName;
    if (files) {
      var fa = files.image;
      if (fa) {
        var file;
        for (var i = 0; file = fa[i]; ++i) {
          if (!file.originalFilename) {
            next('Image upload can not be empty');
          }
          var $f = file;
          gm(file.path).size(function(err, d){
            height = d.height;
            width = d.width;
            width = width <= height?width:height;
            height = height <=width?height:width;
            gm($f.path)
            .gravity('Center')
            .crop(width, height)
            .resize(600, 600)
            .stream(function (err, stdout, stderr) {
              var buf = new Buffer('');
              stdout.on('data', function (data) {
                buf = Buffer.concat([buf, data]);
              });
              stdout.on('end', function (data) {
                var data = {
                  Bucket: AWS_BUCKET,
                  Key: folder + fileName,
                  Body: buf,
                  ContentType: mime.lookup(fileName),
                  ACL: 'public-read'
                };
                s3.putObject(data, function (err, result) {
                  if (err) {
                    next({error: err});
                  }
                  if (result) {
                    next(null, imageUrl);
                  }
                });
              });
            });
          });
        }
      }
    }
  });
}
