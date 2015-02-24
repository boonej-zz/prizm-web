/* Fetch posts for endless scrolling */
function elementInViewport(el){
  var top = el.offsetTop;
  var left = el.offsetLeft;
  var width = el.offsetWidth;
  var height = el.offsetHeight;

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
$(window).scroll(function() {
  if($(window).scrollTop() == $(document).height() - $(window).height()) {
    var lastPost = $('.profile-posts-container').children().children().last().attr('id');
    var creator = $('.profile-owner').attr('id');
    var feedType;
    if ($('#membersToggle').attr('data-toggle') == 'on') {
      feedType = 'members';
    }
    else {
      feedType = 'profile';
    }
    $.ajax({
      url: '/posts/',
      headers: {
        'Accept' : 'application/jade',
        'creator' : creator,
        'lastPost' : lastPost,
        'feedType' : feedType
      },
      success: function(html) {
        if(html) {
            $(".profile-posts-container").append(html);
            $('img.lazy').lazyload();
        }
      }
    });
  }
  animatePosts();
  });
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
    var currentPostId = $(target).parent().attr('id');
    var profilePostElement = $('#' + currentPostId).parent();
    var nextPostId;
    var nextPost;
    if (direction == 'left') {
      nextPostId = profilePostElement.prev().children('.post').attr('id');
    }
    if (direction == 'right') {
      nextPostId = profilePostElement.next().children('.post').attr('id');
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
      $('.profile-posts-container').hide();
      $('.members-posts-container').fadeIn();
      $('#membersToggle').attr('data-toggle', 'on');
    }
    if (state == 'on') {
      $('.members-posts-container').hide();
      $('.profile-posts-container').fadeIn();
      $('#membersToggle').attr('data-toggle', 'off');
    }
  },
  followUser: function() {
    var profileId = $('.profile-owner').attr('id');

    $.ajax({
      url: '/profiles/' + profileId + '/following',
      type: 'POST',
      success: function(response) {
        console.log('Success: ' + response)
      },
      error: function(response) {
        console.log('Error: ' + response)
      },
    })
  }
}

