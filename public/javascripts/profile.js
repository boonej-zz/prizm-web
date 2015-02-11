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

/* Dismiss Post Modal */
$(function(){
  $('#postModal').on('click', '.modal-backdrop', function() {
    $('#post-display').empty();
  });
})

/* Header side scrolling */
$(function() {
  $('#profile-first').click(function() {
    $('.slider').animate({left: '0%'}, 600);
    $('.slider-nav li').toggleClass('active', false);
    $('#profile-first').toggleClass('active');
  });
  $('#profile-middle').click(function() {
    $('.slider').animate({left: '-33.33%'}, 600);
    $('.slider-nav li').toggleClass('active', false);
    $('#profile-middle').toggleClass('active');
  });
  $('#profile-last').click(function() {
    $('.slider').animate({left: '-66.66%'}, 600);
    $('.slider-nav li').toggleClass('active', false);
    $('#profile-last').toggleClass('active');
  });
});

/* Fix for Navbar (bootstrap modal moves it right 15px) */
$(function() {
  $('a[type="button"]').click(function() {
    $('.navbar-default').css('padding-right', '15px');
    $('.navbar-default').slideUp(200);
  });
  $('#loginModal').on('click', '.modal-backdrop', function() {
    $('.navbar-default').css('padding-right', '0px');
    $('.navbar-default').slideDown(200);
  });
});

