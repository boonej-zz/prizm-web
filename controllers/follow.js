// Follow Controller
var express       = require('express');
var router        = express.Router();
var mongoose      = require('mongoose');
var User          = mongoose.model('User');
var ObjectId      = require('mongoose').Types.ObjectId;
var _             = require('underscore');
var Mixpanel      = require('mixpanel');
var mixpanel      = Mixpanel.init(process.env.MIXPANEL_TOKEN);

// Follow Methods

exports.followUserId = function(req, res){
  var currentUser = req.user;
  var userToFollow = req.params.id;
  var follower;
  var newUser = req.get('newUser');

  if (req.isAuthenticated()) {
    follower = req.user.id;
  }
  if (newUser) {
    follower = req.get('follower');
  }

  function addToFollowing(next) {
    console.log(typeof next);
    User.findOne({_id: ObjectId(follower)}, function(err, user) {
      if (err) next(err);
      if (user) {
        user.addFollowing(userToFollow, function(err, user) {
          if (err) next(err);
          if (user) {
            next(null, user);
          }
        });
      }
      else {
        next('Invalid User Id');
      }
    })

  }

  if (req.isAuthenticated() || newUser) {

    User.findOne({_id: ObjectId(userToFollow)}, function(err, user) {
      if (err) {
        res.status(500).send({error: err});
      }
      if (user) {
        user.addFollower(follower, function(err, user) {
          if (err) {
            res.status(400).send({error: err});
          }
          if (user) {
            addToFollowing(function(err, user) {
              if (err) {
                res.status(500).send({error: err});
              }
              if (user) {

                mixpanel.track('User followed', currentUser.mixpanel);
                res.status(200).send({
                  message: 'Successfully created follower/following relationship'
                });
              }
              else {
                res.status(500).send({error: 'Was unable to add to followers'});
              }
            });
          }
        });
      }
    });
  }
  else {
    res.send(400).status({error: "You must be logged in to follow a user"});
  }
}



//   if(req.body.creator && req.params.id){
//     var follow_result = {followee: null, follower: null}, query, update_data;

//     User.find({_id: {$in: [req.body.creator, req.params.id]}}, function(err, result){
//       if(err){

//         //TODO: create actual error response;
//         _utils.prismResponse(res, null, false, PrismError.serverError);
//       }else{

//         if(result.length !== 2){
//           _utils.prismResponse(res, null, false, PrismError.serverError);
//         }

//         var follower, followee;
//         if(result[0]._id == req.body.creator){
//           follower = result[0];
//           followee = result[1];
//         }else{
//           follower = result[1];
//           followee = result[0];
//         }

//         //check to make sure the followee is not already being followed by the follower
//         var is_following = false;
//         for(i=0; i < follower.following.length; i++){
//           if(follower.following[i]._id.toString() == followee._id.toString()){
//             is_following = true;
//           }
//         }

//         if(is_following){
//           var error = {
//             status_code: 400,
//             error_info: {
//               error: 'unable_to_follow_user',
//               error_description: 'The requested followee is already being followed'
//             }
//           };

//           _utils.prismResponse(res, null, false, error);

//         }else{

//           //update followee record
//           query = {_id: followee._id};
//           update_data = {
//             followers_count: followee.followers_count+1,
//             $push: {
//               "followers": {
//                 _id: follower._id.toString(),
//                 date: new Date().toString()
//               }
//             }
//           };

//           User.findOneAndUpdate(query,update_data, function(err, followee_update){

//             if(followee_update){
//               follow_result.followee = followee_update;

//               //update the follower record
//               query = {_id: follower._id};
//               update_data = {
//                 following_count: follower.following_count+1,
//                 $push: {
//                   "following": {
//                     _id: followee._id.toString(),
//                     date: new Date().toString()
//                   }
//                 }
//               };

//               User.findOneAndUpdate(query, update_data, function(err, follower_update){
//                 if(err) _utils.prismResponse(res, null, false, PrismError.serverError);

//                 new Activity({
//                   action: 'follow',
//                   to: req.params.id,
//                   from: req.body.creator
//                 }).save(function(err, activity){
//                   if(err){
//                     _logger.log('error', 'an error recieved while creating a FOLLOW activity',
//                                 {err:err, activity:activity});
//                     _utils.prismResponse(res, null, false, PrismError.serverError);
//                   }else{
//                     _logger.log('info', 'successfully created FOLLOW activity', {activty:activity});
//                     _utils.prismResponse(res, {message: "Successfully followed "+req.params.id}, true);
//                   }
//                 });
//                 //return response
//                 _utils.prismResponse(res, {message: 'Succesfully followed '+req.params.id}, true);
//               });

//             }else{
//               _utils.prismResponse(res, null, false, PrismError.serverError);
//             }
//           });
//         }
//       }
//     });
//   }else{
//     //create actual error
//     _utils.prismResponse(res, null, false, PrismError.serverError);
//   }
// };

// /**
//  * [unfollow description]
//  * @param  {[type]} req [description]
//  * @param  {[type]} res [description]
//  * @return {[type]}     [description]
//  */
// exports.unfollow = function(req, res){
//   if(req.params.id && req.body.creator){
//     //remove follower from followee
//     User.findOne({_id: req.params.id}, function(err, result){
//       if(err){
//         _utils.prismResponse(res, null, false, PrismError.invalidUserRequest);

//       }else{
//         //unset the creator from the followees followers array
//         var is_following = true;
//         for(var i=0; i < result.followers.length; i++){
//           if(result.followers[i]._id == req.body.creator){
//             result.followers.splice(i,1);
//             //decrement the followers count
//             result.followers_count = result.followers_count - 1;
//             is_following = false;
//           }
//         }

//         if(is_following){
//           var error = {
//             status_code: 400,
//             error_info: {
//               error: 'unable_to_unfollow_user',
//               error_description: 'unable to process unfollow request'
//             }
//           };

//           _utils.prismResponse( res,
//                                 null,
//                                 false,
//                                 error);
//         }else{

//           //save|update the followee record
//           result.save(function(err, updated){
//             if(err){
//               _utils.prismResponse(res, null, falase, PrismError.serverError);

//             }else{
//               //remove followee from the follower
//               User.findOne({_id: req.body.creator}, function(err, result){
//                 if(err){
//                   _utils.prismRespnse(res, null, false, PrismError.invalidRequest);

//                 }else{

//                   //unset the followee from the following array
//                   for(var i=0; i < result.following.length; i++){
//                     if(result.following[i]._id == req.params.id){
//                       result.following.splice(i,1);
//                       result.following_count = result.following_count -1;
//                     }
//                   }

//                   result.save(function(err, updated){
//                     if(err) {
//                       _utils.prismResponse(res, null, false, PrismError.serverError);
//                     }else{
//                       //emit unfollow activity event
//                       process.emit('activity', {
//                         type: 'unfollow',
//                         action: 'remove',
//                         user: req.body.creator,
//                         target: req.params.id,
//                         object: updated
//                       });
//                       //send back successful unfollow
//                       _utils.prismResponse(res, {message: 'Successfully unfollowed '+req.params.id}, true);
//                     }
//                   });
//                 }
//               });
//             }
//           });
//         }
//       }
//     });
//   }else{
//     _utils.prismResponse(res, null, false, PrismError.invalidRequest);
//   }
// };

// /**
//  * [fetchIsFollowingById description]
//  * @param  {[type]} req [description]
//  * @param  {[type]} res [description]
//  * @return {[type]}     [description]
//  */
// exports.fetchIsFollowingById = function(req, res){
//   if(req.params.id && req.params.following_id){
//     var criteria = {
//       _id: req.params.id,
//       "following._id": req.params.following_id
//     };
//     var fetch = User.find(criteria);
//     fetch.select({following: 1});
//     fetch.exec(function(err, result){
//       if(err){
//         _utils.prismResponse(res, null, false, PrismError.serverError);
//       }else{
//         var response = (result.length !== 0)? result[0].following[0] : result;
//         _utils.prismResponse(res, response, true);
//       }
//     });
//   }else{
//     _utils.prismResponse(res, null, false, PrismError.invalidRequest);
//   }
// };

// /**
//  * [fetchIsFollwersById description]
//  * @param  {[type]} req [description]
//  * @param  {[type]} res [description]
//  * @return {[type]}     [description]
//  */
// exports.fetchIsFollowersById = function(req, res){
//   if(req.params.id && req.params.follower_id){
//     var criteria = {
//       _id: req.params.id,
//       "followers._id": req.params.follower_id
//     };
//     var fetch = User.find(criteria);
//     fetch.select({followers:1});
//     fetch.exec(function(err, result){

//       if(err){
//         _utils.prismResponse(res, null, false, PrismError.serverError);

//       }else{
//         var response = (result.length !== 0)? result[0].followers[0] : result;
//         _utils.prismResponse(res, response, true);
//       }
//     });
//   }else{
//     _utils.prismResponse(res, null, false, PrismError.invalidRequest);
//   }
// };

// /**
//  * [fetchFollowing description]
//  * @param  {[type]} req [description]
//  * @param  {[type]} res [description]
//  * @return {[type]}     [description]
//  */
// exports.fetchFollowing = function(req, res){
//   if(req.params.id){
//     new Twine('User', {_id: req.params.id}, req, {fields: 'following'}, function(err, result){
//       if(err){
//         _utils.prismResponse(res, null, false, PrismError.ServerError);
//       }else{
//         if(result.data && result.data.length > 0)
//           result.data = result.data[0].following;
//         _utils.prismResponse(res, result, true);
//       }
//     });
//   }else{
//     _utils.prismResponse(res, null, false, PrismError.invalidRequest);
//   }
// };

// /**
//  * [fetchFollowers description]
//  * @param  {[type]} req [description]
//  * @param  {[type]} res [description]
//  * @return {[type]}     [description]
//  */
// exports.fetchFollowers = function(req, res){
//   if(req.params.id){
//     new Twine('User', {_id: req.params.id}, req, {fields: 'followers'}, function(err, result){
//       if(err){
//         _utils.prismResponse(res, null, false, PrismError.ServerError);
//       }else{
//         if(result.data && result.data.length > 0)
//           result.data = result.data[0].followers;
//         _utils.prismResponse(res, result, true);
//       }
//     });
//   }else{
//     _utils.prismResponse(res, null, false, PrismError.invalidRequest);
//   }
// };

// exports.fetchSuggestions = function(req, res){
//   var uid = req.params.id;
//   User.findOne({_id: uid}, function(err, user){
//     if (err) {
//       _utils.prismResponse(res, null, false, PrismError.ServerError);
//     } else {
//       var criteria = {};
//       criteria._id = {$ne: user._id};
//       criteria.active = true;
//       if (user.org_status && user.org_status.length > 0) {
//         var orgArray = [];
//         _.each(user.org_status, function(item, idx, list){
//           if (item.status != 'pending' && item.status != 'denied') {
//             orgArray.push(item.organization);
//           }
//         }); 
//       }
//       if (orgArray && orgArray.length > 0){
//         criteria.$or = [
//           {org_status : {
//             $elemMatch: {
//               organization: {$in: orgArray}, 
//               $or: [{status: {$ne: 'pending'}}, {status: {$ne: 'denied'}}]
//             }
//           }},
//           {subtype : 'luminary'}
//         ];
//         console.log(criteria);
//       } else {
//         criteria.subtype = 'luminary';
//       }
//       criteria.posts_count = {$gt: 4};
//       new Twine('User', criteria, req, null, function(error, result){
//         if (error) {
//           _utils.prismResponse(res, null, false, PrismError.ServerError);
//         } else {
//           console.log(result);
//           _utils.prismResponse(res, result, true);
//         }
//       });
//     }
//   });
// };
