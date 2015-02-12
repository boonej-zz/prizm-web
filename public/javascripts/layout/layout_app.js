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
};

var profile = {
  displayForm: function() {
    console.log("Called!");
    $('.front').css('display', 'none');
    $('.back').css('display', 'inherit');
  }
};