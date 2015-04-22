var isFetching = false;

function startPage(){
 messages.scrollToLatest();
  $('#newMessage').submit(function(){
    var text = $('#newMessage input').val();
    var organization = $('input#selectedOrganization').val();
    var group = $('input#selectedGroup').val();
    $.ajax({
      type: 'POST',
      url: '/messages',
      contentType: 'application/json',
      headers: {
        organization: organization,
        group: group,
        text: text
      }
    })
    .done(function(){
      $('#newMessage input').val('');
      messages.refresh();
    });
    return false;
  });

  $('#changeName').submit(function(){
    var name = $('#changeName input').val();
    var org = $('input#selectedOrganization').val();
    var group = $('input#selectedGroup').val();
    var text = '#' + name.toLowerCase();
    $.ajax({
      method: 'PUT',
      url: '/organizations/' + org + '/groups/' + group,
      data: {name: name},
      success: function(d){
        $('#changeName').addClass('hidden');
        $('#groupName').text(text).removeClass('hidden');
        $('li.topic[dataid="' + group + '"]').text(text);
      },
      error: function(d){
         $('#changeName').addClass('hidden');
         $('#groupName').removeClass('hidden');
      }
    });
    return false;
  });


  $('#messages').scroll(function(){
    if ($('#messages').scrollTop() < 200) {
      if (!isFetching){
        messages.fetchOlder();
      }
    }
  });

  $('div.topic').click(function(e){
    var width = $(window).width();
    var $target = $(e.target);
    var members = '#groupMembers';
    var count = '#groupMembers .group-count';
    var name = '#groupName';
    if (width < 601 && !$target.is(members)&&!$target.is(count)&&!$target.is(name)) {
      $('.left-box').addClass('visible');
    }
  });
  $('.left-box .header').click(function(){
    var width = $(window).width();
    if (width < 601) {
      $('.left-box').removeClass('visible');
    }
  });
}

var messages = {
  scrollToLatest: function(){
    $('#messages').scrollTop($('#messages').prop('scrollHeight'));
  },
  changeTopic: function(e){
    isFetching = true;
    var target = e.target;
    var topic = $(target).text();
    var organization = $('input#selectedOrganization').val();
    $('.right-box .topic #groupName').text(topic);
    topic = topic?topic.substr(1):'all';
    var group = $(target).attr('dataID') || 'all';
    $('input#selectedGroup').val(group);
    $('li.topic').removeClass('active');
    $(target).addClass('active');   
    $('#messages').html('');
    $.ajax({
      method: 'GET',
      url : '/messages/' + group,
      headers: {
        organization: organization,
        'content-type': 'text/html'
      }
    })
    .done(function(html){
      $('.right-box').html(html);
      $('input#lastMessage').val($('li.message:first').attr('created'));
      isFetching = false;
      messages.scrollToLatest();
      var width = $(window).width();
      if (width < 601) {
        $('.left-box').removeClass('visible');
      }
      startPage();
    });
  },
  refresh: function(){
    isFetching = true;
    var organization = $('input#selectedOrganization').val();
    var group = $('input#selectedGroup').val();
    $.ajax({
      method: 'GET',
      url : '/messages/' + group,
      headers: {
        organization: organization,
        quick: 'quick',
        'content-type': 'text/html'
      }
    })
    .done(function(html){
      $('ul#messages').html(html);
      $('input#lastMessage').val($('li.message:first').attr('created'));
      isFetching = false;
      messages.scrollToLatest();
    });
  },
  fetchOlder: function(){
    isFetching = true;
    var organization = $('input#selectedOrganization').val();
    var group = $('input#selectedGroup').val();
    var lastDate =  $('input#lastMessage').val();
    $.ajax({
      method: 'GET',
      url: '/messages/' + group,
      contentType: 'text/html',
      headers: {
        organization: organization,
        lastDate: lastDate
      }
    })
    .done(function(html){
      $('#messages').prepend(html);
      $('input#lastMessage').val($('li.message:first').attr('created'));
      isFetching = false;
    });
  },
  likeMessage: function(e){
    var $target = $(e.target);
    var $parent = $target.parents('li.message');
    var $heart  = $parent.children().children('.foot').children('.heart');
    var action = 'like';
    if ($heart.hasClass('full')) action = 'unlike';
    var $likesCount = $heart.siblings('#likesCount');
    var id = $parent.attr('data-id');
    $.ajax({
      method: 'POST',
      url:    '/messages/actions/' + id,
      headers: {action: action},
      success: function(d){
        var rem = action == 'like'?'empty':'full';
        var add = action == 'like'?'full':'empty';
        $heart.removeClass(rem).addClass(add);
        var likes = Number($likesCount.text()); 
        var c = action == 'like'?likes+1:likes-1;
        $likesCount.text(c);
        if (c == 0) {
          $likesCount.addClass('clear');
        } else {
          $likesCount.removeClass('clear');
        }
      }
    })
  },
  showMembers: function(){
    $('#groupMembers').toggleClass('selected');
    $('#messageArea').toggleClass('hidden');
    $('#memberArea').toggleClass('hidden');
  },
  showNameForm: function(){
    $('#groupName').addClass('hidden');
    $('#changeName').removeClass('hidden');
    $('#changeName input').focus();
  }
};


$(document).ready(function(){
  startPage();
});


