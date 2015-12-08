/* Fetch posts for endless scrolling */

function elementInViewport(el){
  var top = el.offsetTop;
  var left = el.offsetLeft;
  var width = el.offsetWidth;
  var height = $(el).height();
  var e = el; 
  while (el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
    left += el.offsetLeft;
  }
  
  if (left >= window.pageXOffset &&
      top <= (window.pageYOffset + window.innerHeight) &&
      left <= (window.pageXOffset + window.innerWidth) ){
    return true;
  }
  return false;
};


function animatePosts() {
  var posts = $('.post');

  var post;
  for (i = 0; post = posts[i]; ++i){
    if (elementInViewport(post)){
      $(post).addClass('shown');
    }
  }
}
$(document).ready(function(){
  animatePosts();
  var listening = true;
  $(window).scroll(function() {
    if (listening) {
      if($(window).scrollTop() >= $(document).height() - $(window).height() - 500) {
        listening = false;
        var length = $('.post').length;
        var lastPost = $('.post').last().attr('id');
        var creator = $('.profile-owner').attr('id');
        var exploreType = $('#explore-type').data('exploreType');
        var feedType;
        if ($('#membersToggle').attr('data-toggle') == 'on') {
          feedType = 'members';
        }
        else if (document.URL.indexOf('explore') > -1) {
          feedType = 'explore'
        }
        else if (document.URL.indexOf('profile') > -1){
          feedType = 'profile';
        } else if ($('#scrollType').val()) {
          feedType = 'profile';
        } else {
          feedType = 'home';
        }
        if (length > 0){
          $.ajax({
            method: 'GET',
            url: feedType=='home'?'/':'/posts',
            headers: {
              'Content-type': 'application/jade',
              'Accept' : 'application/jade',
              'creator' : creator,
              'lastPost' : lastPost,
              'feedType' : feedType,
              'exploreType' : exploreType
            },
          })
          .done(function(html){
            if (feedType == 'profile') {
              $('.profile-posts-container').append(html);
            } else if (feedType == 'members') {
              $('.member-posts-container').append(html);
            } else if (exploreType == 'latest') {
              $('#latest').append(html);
            } else if (exploreType == 'popular') {
              $('#popular').append(html);
            } else if (exploreType == 'featured') {
              $('#featured').append(html);
            } else {
              $('.infinite-feed').append(html);
            }
            $('img.lazy').lazyload();
            listening = true;
          });
        }
      }
    animatePosts();
    }
  });
  $('#profileEdit form').submit(profile.updateProfile);
});


var profile = {
  slideHeader: function(e, multiple) {
    var target = e.target;
    var leftAmount = multiple * 33.33 * -1;
    $('.slider').animate({left: leftAmount + '%'}, 600);
    $('.slider-nav li').toggleClass('active', false);
    $(target).toggleClass('active');
  },

  showModal: function(e){
    var target = e.target;
    var postID = $(target).parents('.post').attr('id');
    $.ajax({
      url: '/posts/' + postID,
      headers: {
        'Accept': 'application/jade'
      },
      success: function(html) {
        if (html) {
          $('#post-display').html(html);
          $('#postModal').modal();
        }
      }
    });
  },

  dismissModal: function(e){
    $('#post-display').empty();
    $('#postModal').modal('hide');
  },

  nextPost: function(e, direction) {
    var target = e.target;
    var currentPostId = $(target).parents('.container').attr('id');
    var profilePostElement = $('#' + currentPostId);
    var nextPostId;
    var nextPost;
    if (direction == 'left') {
      nextPostId = $('#' + currentPostId).prev().attr('id');
    }
    if (direction == 'right') {
      nextPostId =  $('#' + currentPostId).next().attr('id');
    }
    if (!nextPostId){
      nextPostId = $('.posts #' + currentPostId).next().attr('id');
    }
    var request = $.ajax({
      url: '/posts/' + nextPostId,
      headers: {
        'Accept': 'application/jade'
      },
      success: function(html) {
        if (html) {
          nextPost = html
        }
      }
    });
    request.done(function(){
      $('#post-display').html(nextPost);
    });
  },

  toggleMembersPosts: function() {
    var posts;
    var organization = $('.organization').attr('id');
    var state        = $('#membersToggle').attr('data-toggle');
    var currentPosts = $('.members-posts-container').children().children('.post');
    var hasPosts     = currentPosts.length > 0 ? true : false;

    var initialRequest = $.ajax({
      url: '/posts/',
      headers: {
        'Accept': 'application/jade',
        'Content-type': 'application/jade',
        'orgID': organization,
        'feedType': 'members'
      },
      success: function(html) {
        if (html) {
          posts = html;
        }
      }
    });

    if (state == 'off') {
      if (hasPosts == false) {
        initialRequest.done(function(){
          $('.members-posts-container').html(posts);
          
          $('img.lazy').lazyload({threshold: 100});
        })
      }
      $('#profileEdit').addClass('hidden');
      $('.profile-followers-container').hide();
      $('.profile-following-container').hide();
      $('.profile-posts-container').hide();
      $('.members-posts-container').fadeIn();
      $('#membersToggle').attr('data-toggle', 'on');
      $('.toggle-label').addClass('active');
    }
    if (state == 'on') {
      $('#profileEdit').addClass('hidden');
      $('.profile-followers-container').hide();
      $('.profile-following-container').hide();
      $('.members-posts-container').hide();
      $('.profile-posts-container').fadeIn();
      $('#membersToggle').attr('data-toggle', 'off');
      $('.toggle-label').removeClass('active');
    }
  },

  displayFollowers: function(){
    var profileId = $('.profile-owner').attr('id');
    $.ajax({
      'Accept'      : 'application/jade',
      'Content-type': 'application/jade',
      'url'         : '/profiles/' + profileId + '/followers',
      'type'        : 'GET',
      success: function(html) {
        $('#profileEdit').addClass('hidden');
        $('.profile-followers-container').html(html);
        $('.profile-following-container').hide();
        $('.members-posts-container').hide();
        $('.profile-posts-container').hide();
        $('.profile-followers-container').fadeIn();
      },
      error: function(response) {
        console.log(response.responseText);
      },
    });
  },

  displayFollowing: function() {
    var profileId = $('.profile-owner').attr('id');
    $.ajax({
      'Accept'      : 'application/jade',
      'Content-type': 'application/jade',
      'url'         : '/profiles/' + profileId + '/following',
      'type'        : 'GET',
      success: function(html) {
        $('#profileEdit').addClass('hidden');
        $('.profile-following-container').html(html);
        $('.profile-followers-container').hide();
        $('.members-posts-container').hide();
        $('.profile-posts-container').hide();
        $('.profile-following-container').fadeIn();
      },
      error: function(response) {
        console.log(response.responseText);
      },
    });
  },

  followToggle: function(e, userToFollow) {
    var target = e.target;
    var isFollowing = $(target).data('isFollowing');

    $.ajax({
      type: 'POST',
      url: '/profiles/' + userToFollow + '/followers',
      success: function() {
        if (isFollowing) {
          $(target).attr('data-is-following', false);
          $(target).data('isFollowing', false);
        }
        else {
          $(target).attr('data-is-following', true);
          $(target).data("isFollowing", true);
        }
        $(target).text(function() {
          return $(target).data('isFollowing') ? 'Following' : 'Follow';
        });
        $('.btn-follow-next').text('Done');
        //$(target).fadeOut();
      }
    });
    return false;
  },
  
  displayPosts: function() {
    var postContainer = $('.profile-posts-container');

    if (postContainer.css('display') == 'none') {
      $('#profileEdit').addClass('hidden');
      $('.profile-followers-container').hide();
      $('.profile-following-container').hide();
      $('.members-posts-container').hide();
      $('.profile-posts-container').fadeIn();
    }
    else {
      return false;
    }
  },
  likePost: function(id, e){
    $.ajax({
      url: '/posts/' + id + '/like',
      type: 'POST',
      success: function(response){
        if (response == 'added') {
          var heart = e.target;
          var count = $(heart).siblings('.likes-count');
          $(heart).removeClass('not-liked');
          $(heart).addClass('liked');
          count = Number(count.html()) + 1;
          $(heart).siblings('.likes-count').html(count);
          $(heart).attr('onclick', 'profile.unlikePost("' + id + '", event)');
        }
      }
    });
   },
  unlikePost: function(id, e){
    $.ajax({
      url: '/posts/' + id + '/unlike',
      type: 'POST',
      success: function(response){
        if (response == 'removed') {
          var heart = e.target;
          var count = $(heart).siblings('.likes-count');
          $(heart).removeClass('liked');
          $(heart).addClass('not-liked');
          count = Number(count.html()) - 1;
          $(heart).siblings('.likes-count').html(count);
          $(heart).attr('onclick', 'profile.likePost("' + id + '", event)');
        }
      }
    });
  },
  overrideEnter: function(e){
    var key = e.which;
    if (key == 13) {
      e.preventDefault();
      $(e.target).blur();
      $(e.target).siblings('a').click();
      return false;
    } else {
      return true;
    }
                 },
  postComment: function(id, e){
    e.preventDefault();
    var text = $(e.target).siblings('#inputComment').val();
    var postId = id;
    var path = '/posts/' + postId + '/comment';
    var scroll = $('.comment-scroll').length?'.comment-scroll':'.comment-drawer';
    var data = {
      text: text
    };
    $.post(path, data, function(data){
      if (scroll == '.comment-drawer') {
        $(e.target).parent().parent().before(data);
        $('.post-modal-avatar').addClass('post-comments-avatar');
        $('.prizm-avatar-sm').addClass('prizm-avatar-xs');
        $('.prizm-avatar-xs').removeClass('prizm-avatar-sm');
        $('post-comments-avatar').removeClass('post-modal-avatar');

      } else {
        $(scroll).append(data);
        $(scroll).scrollTop($('.comment-scroll')[0].scrollHeight);
      }
      $(e.target).siblings('#inputComment').val('');
    });
  },
  showProfile: function(id){
    window.location = '/profiles/' + id;
  },
  updateProfile: function(e){
    var body = $('#profileEdit form').serialize(); 
    var d = new FormData($('#profileEdit form')[0]);
    var id = $('#userID').val();
    $.ajax({
      url: '/users/' + id,
      type: 'PUT',
      data: d,
      cache: false,
      contentType: false,
      processData: false
    })
    .done(function(data){
      window.location = '/profile';
    });
    return false;
  },
  cancelEdit: function(){
    $('#profileEdit').addClass('hidden'); 
    $('.profile-posts-container').removeClass('hidden');
  },
  editAvatar: function(){
    $('#avatar').click();
  },
  uploadAvatar: function(e) {
    e.stopPropagation();
    e.preventDefault();
    if (window.File && window.FileReader && window.FileList && window.Blob){
      var files = e.target.files;
      var file;
      var result = '';
      for (var i=0; file = files[i]; ++i){
        if (!file.type.match('image.*')){
          continue;
        }
        reader = new FileReader();
        reader.onload = (function (tfile){
          return function(r){
            $('img.prizm-avatar-md').attr('src', null);
            $('img.prizm-avatar-md').css('outline', 'none');
            $('img.prizm-avatar-md').attr('style', 'background-image: url(' + r.target.result + ')'); 
          }
        }(file));
        reader.readAsDataURL(file);
      }
    }
  }, 
  showPasswordReset: function(e){
    $.ajax({
      type: 'GET',
      url: '/profile/reset',
      cache: false,
      success: function(html){
        overlay.show(html);
        $('form#resetPassword').submit(function(){
            var pass = $('input#password').val();
            var conf = $('input#confirm').val();
            if (pass == conf) {
              var data = $('form#resetPassword').serialize();
              $.ajax({
                type: 'POST',
                url: '/passwordreset',
                cache: false,
                data: data,
                success: function(success){
                  if (success) {
                    alert('Your password was changed successfully.');
                    overlay.cancel();
                  } else {
                    alert('Your password could not be changed at this time.');
                  }
                },
                error: function(error){
                  alert('There was a problem changing your password.');
                }
              });
            }
            return false; 
          });

        $('.modal-overlay input').keyup(function(){
          var pass = $('input#password').val();
          var conf = $('input#confirm').val();
          if (pass == conf){
            $('.modal-overlay button.save').attr('disabled', false);
          } else {
            $('.modal-overlay button.save').attr('disabled', 'disabled');
          }
                  });
      }
    });
  }
}

