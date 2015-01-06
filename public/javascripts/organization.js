/* Fetch posts for endless scrolling */
$(window).scroll(function() {
  if($(window).scrollTop() == $(document).height() - $(window).height()) {
    var lastPost = $('#organization-posts').children().last().attr('id');
    var creator = $('.organization-owner').attr('id');
    $.ajax({
      url: './posts/',
      headers: {
        'Accept' : 'application/json',
        'creator' : creator,
        'lastPost' : lastPost
      },
      success: function(html) {
        if(html) {
            $("#organization-posts").append(html);
        }
      }
    });
  }
});

/* Header side scrolling */
$(function(){
  $('#org-first').click(function(){
    $('.slider').animate({left: '0%'}, 600);
    $('.slider-nav li').toggleClass('active', false);
    $('#org-first').toggleClass('active')
  })
  $('#org-middle').click(function(){
    $('.slider').animate({left: '-33.33%'}, 600);
    $('.slider-nav li').toggleClass('active', false);
    $('#org-middle').toggleClass('active')
  })
  $('#org-last').click(function(){
    $('.slider').animate({left: '-66.66%'}, 600);
    $('.slider-nav li').toggleClass('active', false);
    $('#org-last').toggleClass('active');
  })
})