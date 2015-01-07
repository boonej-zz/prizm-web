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

$('#navbar-name').click(function(){
  $('#profile-menu').toggleClass('hidden');
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