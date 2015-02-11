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
  }
}