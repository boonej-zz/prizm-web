$(document).ready(function(){
  $(document).mouseup(function(e){
    var container = $('.user-menu');
    var toggleMenu = $('.tool-tip');
    if (!container.is(e.target) && container.has(e.target).length === 0
      && toggleMenu.hasClass('rotated')){
      if ($(window).width() > 500) {
        container.toggle();
      } else {
        container.slideToggle(); 
      }
      $('.tool-tip').toggleClass('rotated');
    }
  });
});

var nav = {
  toggleMenu: function() {
    var windowWidth = $(window).width();
    var menu = $('.user-menu');
    $('.tool-tip').toggleClass('rotated');
    if (windowWidth > 500) {
      menu.toggle();
    }
    else {
      menu.slideToggle();
    }
  },

  toggleSettings: function() {
    $('.settings').toggleClass('settings-visable');
  },

  goToHomeFeed: function(){
    window.location = baseURL + '/';
  }
};

var login = {
  displayForm: function() {
    $('.front').css('display', 'none');
    $('.back').css('display', 'inherit');
  }
};

/* Fix for Navbar (bootstrap modal moves it right 15px) */
/* This seems to shift it left on my browsers 
$(function() {
  $('body').on('show.bs.modal', function() {
    $('.navbar-default').css('right', '15px');
  });
  $('body').on('hidden.bs.modal', function() {
    $('.navbar-default').css('right', '0px');
  });
});

*/

/* Add current field to .user-menu based of window location */
// $(function(){
//   var location = window.location.pathname;
//   $('a[href="' + location + '"]').addClass('current');
// });
$(function() {
  $('img.lazy').lazyload();
});
