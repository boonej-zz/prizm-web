/* Fetch posts for endless scrolling */
$(window).scroll(function() {
  if($(window).scrollTop() == $(document).height() - $(window).height()) {
    var lastPost = $('#profile-posts').children().last().attr('id');
    var creator = $('.profile-owner').attr('id');
    $.ajax({
      url: './posts/',
      headers: {
        'Accept' : 'application/json',
        'creator' : creator,
        'lastPost' : lastPost
      },
      success: function(html) {
        if(html) {
            $("#profile-posts").append(html);
        }
      }
    });
  }
});

$(function(){
  $('#profile-navbar').click(function(){
    $('#profile-menu').toggleClass('hidden');
  });
});

/* Header side scrolling */
$(function(){
  $('#profile-first').click(function(){
    $('.slider').animate({left: '0%'}, 600);
    $('.slider-nav li').toggleClass('active', false);
    $('#profile-first').toggleClass('active');
  });
  $('#profile-middle').click(function(){
    console.log("CLICKED")
    $('.slider').animate({left: '-33.33%'}, 600);
    $('.slider-nav li').toggleClass('active', false);
    $('#profile-middle').toggleClass('active');
  });
  $('#profile-last').click(function(){
    $('.slider').animate({left: '-66.66%'}, 600);
    $('.slider-nav li').toggleClass('active', false);
    $('#profile-last').toggleClass('active');
  });
});

/* Fix for Navbar (bootstrap modal moves it right 15px) */
$(function(){
  $('a[type="button"]').click(function(){
    $('#navbar').css('padding-right', '15px');
    $('#navbar').slideUp(function(){
      $('#navbar').css('margin-left', '7px');
    });
  });
  $('#loginModal').on('click', '.modal-backdrop', function () {
    $('#navbar').animate({
      paddingRight: "0px"
    }, 150);
    $('#navbar').animate({
      marginLeft: ""
    }, 150);
    $('#navbar').slideDown(200);
  });
});

