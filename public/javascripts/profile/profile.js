/* Fetch posts for endless scrolling */
$(window).scroll(function() {
  if($(window).scrollTop() == $(document).height() - $(window).height()) {
    var lastPost = $('.profile-posts-container').children().children().last().attr('id');
    var creator = $('.profile-owner').attr('id');
    $.ajax({
      url: '/posts/',
      headers: {
        'Accept' : 'application/json',
        'creator' : creator,
        'lastPost' : lastPost
      },
      success: function(html) {
        if(html) {
            $(".profile-posts-container").append(html);
        }
      }
    });
  }
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
  }
}

/* Fix for Navbar (bootstrap modal moves it right 15px) */
$(function() {
  $('body').on('show.bs.modal', function() {
    $('.navbar-default').css('right', '15px');
  });
  $('body').on('hidden.bs.modal', function() {
    $('.navbar-default').css('right', '0px');
  });
});

