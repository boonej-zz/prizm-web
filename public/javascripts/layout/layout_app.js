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
    window.location = baseURL + '/profile';
  }
};

var login = {
  displayForm: function() {
    $('.front').css('display', 'none');
    $('.back').css('display', 'inherit');
  }
};

/* Fix for Navbar (bootstrap modal moves it right 15px) */
$(function() {
  $('body').on('show.bs.modal', function() {
    $('.navbar-default').css('right', '15px');
  });
  $('body').on('hidden.bs.modal', function() {
    $('.navbar-default').css('right', '0px');
  });
});