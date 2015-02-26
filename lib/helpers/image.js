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

exports.uploadImage = function(req, res, userId, next) {
  var s3 = new AWS.S3();
  var form = new multiparty.Form();
  var date = moment().format('ssmmhhDDMMYYYY');
  var unique = uuid.v1();
  var folder = userId + '/';
  var fileExt = '.jpg';
  var fileName = date + unique + fileExt;
  var userId = req.params.id;

  if (!userId) {
    next('Need to provide userId to upload photo');
  }

  form.parse(req, function (err, fields, files) {
    console.log(fields);
    console.log(files);
    var width = Number(fields.width);
    var height = Number(fields.height);
    var x1 = Number(fields.x1);
    var y1 = Number(fields.y1);
    var imageUrl = 'https://s3.amazonaws.com/higheraltitude.prism/' +
                   folder + fileName;
    if (files) {
      var fa = files.image;
      if (fa) {
        var file;
        for (var i = 0; file = fa[i]; ++i) {
          gm(file.path)
            .crop(width, height, x1, y1)
            .resize(600, 600)
            .stream(function (err, stdout, stderr) {
              var buf = new Buffer('');
              stdout.on('data', function (data) {
                buf = Buffer.concat([buf, data]);
              });
              stdout.on('end', function (data) {
                var data = {
                  Bucket: 'higheraltitude.prism',
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
        }
      }
    }
  });
}