$(document).ready(function(){
  $(document).mouseup(function(e){
    var container = $('.avatar-menu .user-menu');
    var toggleMenu = $('.tool-tip');
    if (!$(e.target).parents('.avatar-menu').length) {
      if (toggleMenu.hasClass('rotated')){
        if ($(window).width() > 500) {
          container.toggle();
        } else {
          container.slideToggle(); 
        }
        $('.tool-tip').toggleClass('rotated');
      } 
    }
    var settingsMenu = $('.settings .user-menu');
    var settingsToggle = $('.settings-tool-tip');
    if (!$(e.target).parents('.settings-avatar-menu').length){
      if (settingsToggle.hasClass('rotated')){
        if ($(window).width() > 500) {
          settingsMenu.toggle();
        } else {
          settingsMenu.slideToggle(); 
        }
        $('.settings-tool-tip').toggleClass('rotated');
      }
    }
  });
  $('.settings-menu li').mousedown(function(){
    $('.settings li').removeClass('selected');
    $(this).addClass('selected');
  });
  $('#new-post').submit(function(){
    var $form = $('#new-post');
    var post = $form.serialize();
    $.ajax({
      type: 'POST',
      url: '/posts',
      headers: {
    
      },
      data: post,
      success: function(response) {
        alert('success');
      },
      error: function(jqXHR) {
        alert('failure');
      }
    });
    return false;
  });
  $('.btn-category').click(function(){
    $('.btn-create-post').removeClass('disabled');
  });
});

var nav = {
  toggleMenu: function(e) {
    var target        = e.target;
    var windowWidth   = $(window).width();
    var settingsMenu  = $(target).parents('.settings-avatar-menu')
    var navbarMenu    = $(target).parent('.avatar-menu');
    var menu;
    var tooltip;

    if (navbarMenu.length) {
      menu = $(navbarMenu).children('.user-menu');
      tooltip = $('.tool-tip');
    }
    if (settingsMenu.length) {
      menu = $(settingsMenu).children('.user-menu');
      tooltip = $('.settings-tool-tip');
    }
    $(tooltip).toggleClass('rotated');
    if (windowWidth > 500) {
      menu.toggle();
    }
    else {
      menu.slideToggle();
    }
  },

  toggleSettings: function() {
    $('.settings').toggleClass('settings-visable');
    $('body').toggleClass('body-push');
    $('.navbar .container').toggleClass('body-push');
    $('.overlay').toggle();
  },
  navigate: function(url){
    if (window.location.pathname != url) {
      window.location = url;
    } else {
      nav.toggleSettings();
    }
  },
  goToHomeFeed: function(){
    window.location = baseURL + '/';
  }
};

var login = {
  displayForm: function() {
    $('.front').css('display', 'none');
    $('.back').css('display', 'inherit');
  },
  register: function() {
    window.location = baseURL + '/register';
  }
};

var newPost = {
  showModal: function() {
    $('#newPostModal').modal();
  }
}

$(function() {
  $('img.lazy').lazyload();
  window.scrollTo(0, 0);
});
