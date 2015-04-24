window.heap=window.heap||[],heap.load=function(t,e){window.heap.appid=t,window.heap.config=e;var a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src=("https:"===document.location.protocol?"https:":"http:")+"//cdn.heapanalytics.com/js/heap-"+t+".js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(a,n);for(var o=function(t){return function(){heap.push([t].concat(Array.prototype.slice.call(arguments,0)))}},p=["clearEventProperties","identify","setEventProperties","track","unsetEventProperty"],c=0;c<p.length;c++)heap[p[c]]=o(p[c])};
if (window.location.hostname == 'www.prizmapp.com'){
  heap.load("3662545250");
} else {
  heap.load("3468470936");
}

var lastPostDate = new Date().toISOString();
var lastActivityDate = new Date().toISOString();
var lastMessageDate = new Date().toISOString();
var messagePollCount = 0;
var newPostCount = 0;
var newMessageCount = 0;

$(document).ready(function(){
  $.ajax({
    method: 'GET',
    headers: {process: 'analytics'},
    url: '/users/props',
    success: function(data){
      heap.identify(data);
    } 
  });
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
    var plusMenu = $('.plus-menu');
    if (!$(e.target).parents('.plus-menu').length ){
      plusMenu.addClass('hidden');
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
      contentType: false,
      cache: false,
      data: post,
      success: function(response) {
      },
      error: function(jqXHR) {
      }
    });
    return false;
  });
  $('.btn-category').click(function(){
    $('.btn-create-post').removeClass('disabled');
  });
  if (window.location.hostname == 'www.prizmapp.com' || window.location.hostname == 'prizmapp.dev') {
    poll.posts();
    poll.unreadActivities();
  }
});

var poll = {
  posts: function(){
    if (messagePollCount > 0) {
      console.log('polling');
      $.ajax({
        type: 'GET',
        contentType: 'application/json',
        url:  '/',
        headers: {
          action: 'newer',
          create_date: lastPostDate
        },
        success: function(){
          console.log('success');
        },
        error: function(){
          console.log('error');
        }
      })
      .done(function(data){
        lastPostDate = new Date().toISOString();
        if (data.count > 0) {
          newPostCount += data.count;
          var string = String(newPostCount) + ' new post';
          if (newPostCount > 1) {
            string = string + 's.';
          } else {
            string = string + '.';
          }
          $('#activityBar span').text(string);
          $('#activityBar').click(function(){
            window.location = '/';
          });
          $('#activityBar').addClass('visible');
          setTimeout(function(){
            $('#activityBar').removeClass('visible');
           
          }, 4000);
        }
        console.log('moving to activities');
        setTimeout('poll.activities()', 7500);
      });
    } else {
      messagePollCount++;
      setTimeout('poll.posts()', 7500);
    }
  },
  activities: function(){
    $.ajax({
      type: 'GET',
      contentType: 'application/json',
      url: '/profile/activity',
      headers: {
        action: 'newer',
        create_date: lastActivityDate
      },
      cache: false
    })
    .done(function(data){
      if (data && data.alert){
        $('#activityBar span').text(data.alert);
        $('#activityBar').click(function(){
          window.location = '/profile/activity';
        });
        $('#activityBar').addClass('visible');
       
      }
      setTimeout(function(){
          $('#activityBar').removeClass('visible');
          setTimeout('poll.messages()', 7500);
        }, 4000);
      lastActivityDate = new Date().toISOString();
    });
  },
  messages: function(){
    $.ajax({
      type: 'GET',
      contentType: 'application/json',
      url: '/messages',
      headers: {
        action: 'newer',
        create_date: lastMessageDate
      },
      cache: false
    })
    .done(function(data){
      lastMessageDate = new Date().toISOString();
      if (data.count && data.count > 0){
        newMessageCount += data.count;
        var string = String(newMessageCount) + ' new message';
        if (newMessageCount == 1) {
          string += '.';
        } else {
          string += 's.';
        }
        $('#activityBar span').text(string);
        $('#activityBar').click(function(){
        });
        $('#activityBar').addClass('visible');
       
      }
      setTimeout(function(){
          $('#activityBar').removeClass('visible');
          setTimeout('poll.posts()', 7500);
        }, 4000);
    });
  },
  unreadActivities: function(){
    $.ajax({
      type: 'GET',
      contentType: 'application/json',
      url: '/profile/activity',
      headers: {action: 'unread'},
      cache: false
    })
    .done(function(data){
      if (data.count && data.count > 0){
        $('.settings-menu ul:first-child li:nth-child(2)').addClass('new');
      } else {
        $('.settings-menu ul:first-child li:nth-child(2)').removeClass('new');
      }
      setTimeout('poll.unreadActivities()', 20000);
    });
  } 
};

var action = {
  showMenu: function(){
    var menuItems = $('#menuItems');
    if (menuItems && menuItems.length > 0) {
      $('.plus-menu').toggleClass('hidden');
    } else {
      post.showNewPostForm(); 
    }
  }
};

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

var modal = {
  cancel: function(e){
    var shouldDismiss = true;
    if (e) {
      shouldDismiss = $(e.target).is('.create-overlay');
    }
    if (shouldDismiss){
      $('.create-overlay').remove();
      $('body').removeClass('noscroll');
    }
  }
}

var group = {
  showNewGroupForm: function(){
    var organization = $('input#selectedOrganization').val();
    $.ajax({
      method: 'GET',
      url: '/profile/groups',
      contentType: 'text/html',
      headers: {organization: organization}
    })
    .done(function(html){
      $('body').addClass('noscroll');
      $('body').prepend(html);
      $('#newGroup').submit(group.createNewGroup);
      $('#Leader').change(function(){
        $('input.members[value=' + $(this).val() + ']').prop('checked', true);
      });
      $('#description').keyup(function(){
        if ($(this).val().length > 0 && $('#name').val().length > 0){
          $('button.save').attr('disabled', false);
        } else {
          $('button.save').attr('disabled', 'disabled');
        }
      });
      $('#name').keyup(function(){
        if ($(this).val().length > 0 && $('#description').val().length > 0){
          $('button.save').attr('disabled', false);
        } else {
          $('button.save').attr('disabled', 'disabled');
        }

      });
    });
  },
  selectRadio: function(e){
    var $target = $(e.target);
    var checkbox = 'input[type="checkbox"]';
    if (!$target.is(checkbox) ){
      if (!$target.is('label')){
        if ($target.is('.content')){
          var checked = $target.children(checkbox).prop('checked');
          $target.children(checkbox).prop('checked', !checked);
        } else {
            var checked = $target.siblings(checkbox).prop('checked');
            $target.siblings(checkbox).prop('checked', !checked);
        }
      }
    }
  },
  createNewGroup: function(){
    var organization = $('input#selectedOrganization').val();
    var data = $('#newGroup').serialize();
    $.ajax({
      type: 'POST',
      url:  '/profile/groups',
      data: data,
      headers: {organization: organization}
    })
    .done(function(html){
      window.location = window.location.pathname;
    });
    return false;    
  },
  filterMembers: function(e){
    var $target = $(e.target);
    var t = $target.val();
    var r = new RegExp(t, 'i');
    $('.selectArea .option').each(function(i){
      var $this = $(this);
      var s = $this.children('.content').first().children('.name').first().text();
      if (s.match(r) || t == '') {
        $this.show();
      } else {
        $this.hide();
      }
    });
  }
};

var post = {
  showNewPostForm: function(){
    $.ajax({
      method: 'GET',
      url: '/posts/new',
      contentType: 'text/html'
    })
    .done(function(html){
      $('body').addClass('noscroll');
      $('body').prepend(html);
      $('#newPost').submit(post.createNewPost);
      $('input[type="radio"]').click(function(){
        if ($('textarea').val() || $('input[type="file"]').val()) {
          $('button.save').attr('disabled', false);
        } else {
          $('button.save').attr('disabled', true);
        }
      });
      $('input[type="file"]').change(function(){
        if ($('input[type="radio"]:checked').length) {
          $('button.save').attr('disabled', false);
        } else {
          $('button.save').attr('disabled', true);
        }
      });
      $('#postText').keyup(function(){
        if ($('input[type="radio"]:checked').length && $('#postText').val().length > 0) {
          $('button.save').attr('disabled', false);
        } else {
           $('button.save').attr('disabled', true);
        }
      });
    });
  },
  createNewPost: function(){
    var post = $('#newPost').serialize();
    $('button.save').attr('disabled', true); 
    var data = new FormData($('form')[0]);
    $.ajax({
      method: 'POST',
      url: '/posts',
      contentType: false,
      cache: false, 
      processData: false,
      data: data,
      success: function(){
        modal.cancel();
        window.location = window.location.pathname;
      }
    });
   return false;
  }
}

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
