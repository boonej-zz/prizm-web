var isScrolling = false;
var fired = 0;
var pos = 0;
var cy = 0;
var cs = 0;
var tid;
var d;

function scrollHandler(){
  if ($(window).width() > 500) {
    clearTimeout(tid); 
    if (!isScrolling) {
      $('.dotNav').hide();
    }
    isScrolling = true;
    tid = setTimeout(function(){
      var ds = $('body').scrollTop();
      var pt = 0;
      $('.snap').each(function(i){
        var $this = $(this);
        var etop = $this.offset().top;
        if (Math.abs(ds - etop) < $this.height()/2) {
          $('body').animate({
            scrollTop: etop - 75
          }, 300, function(){
            if (isScrolling && etop != 75) {
              if (i%2 != 0) {
                $('.dotNav').addClass('blue-nav');
              } else {
                $('.dotNav').removeClass('blue-nav');
              }
              $('.dotNav').fadeIn(function(){
                isScrolling = false;
              });
            } 
          });
          return false;
        } 
      });
    }, 50);
  }
}

$(document).ready(function(){
  isScrolling = false;
  $(window).bind('scroll', scrollHandler);
});
