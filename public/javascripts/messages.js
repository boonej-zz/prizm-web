var isFetching = false;

function startPage(){
 messages.scrollToLatest();
  $('#newMessage').submit(function(){
    var action = $('#newMessage').attr('data-action');
    var url = action && action == 'edit'?'/messages/' + $('#newMessage').attr('data-id'):'/messages';
    var method = action && action == 'edit'?'PUT':'POST';
    var text = $('#newMessage input').val();
    var organization = $('input#selectedOrganization').val();
    var group = $('input#selectedGroup').val();
    var hash = window.location.hash;
    $.ajax({
      type: method,
      url: url,
      contentType: 'application/json',
      headers: {
        organization: organization,
        group: group,
        group_name: hash,
        text: text
      }
    })
    .done(function(){
      $('#newMessage input').val('');
      $('#newMessage').attr('data-action', '');
      $('#newMessage').attr('data-id', '');
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
    var info = '#groupInfo';
    if (width < 601 && !$target.is(members)&&!$target.is(count)&&!$target.is(name)&&!$target.is(info)) {
      $('.left-box').addClass('visible');
    }
  });
  $('.left-box .header').click(function(){
    var width = $(window).width();
    if (width < 601) {
      $('.left-box').removeClass('visible');
    }
  });
  $('body').click(function(e){
    if (!$(e.target).is('.edit-menu') && !$(e.target).is('span.edit') && !$(e.target).is('.edit-menu li')){
      $('.edit-menu').addClass('hidden');
      $('.edit').removeClass('active');
      $('ul#messages').removeClass('noscroll');
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
    var group = $(e.target).attr('dataid') || 'all';
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
    var $heart  = $parent.children().children('.likes').children('.heart');
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
  showViewed: function(e){
    var org = $('input#selectedOrganization').val();
    var group = $('input#selectedGroup').val();
    var message_id = $(e.target).parents('li.message').attr('data-id');
    $.ajax({
      url: '/organization/' + org + '/groups/' + group + '/members',
      method: 'GET',
      headers: {message_id: message_id},
      cache: false,
      success: function(html){
      },
      err: function(err){
      }
    });
  },
  showNameForm: function(){
    $('#groupName').addClass('hidden');
    $('#changeName').removeClass('hidden');
    $('#changeName input').focus();
  },
  showGroupInfo: function(e){
    $('#groupDescription').toggle();
  },
  showEditGroup: function(e){
    var name = $(e.target).attr('data-name');
    var org = $('#selectedOrganization').val();
    $.ajax({
      method: 'GET',
      url: '/profile/groups',
      contentType: 'text/html',
      headers: {organization: org, name: name, action: 'edit'},
      cache: false,
      success: function(data){
        modal.showModal(data);
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

        $('button.save').attr('disabled', false);
        $('#name').keyup(function(){
          if ($(this).val().length > 0 && $('#description').val().length > 0){
          } else {
            $('button.save').attr('disabled', 'disabled');
          }
        });
      },
      error: function(err){
        alert('This group cannot be edited at this time. Please check with your administrator.');
      }
    });
  },
  settingsClicked: function(e){
    var targetHidden = $(e.target).children('.edit-menu').hasClass('hidden');
    $(e.target).toggleClass('active');
    if (targetHidden){
      $(e.target).children('.edit-menu').css('top', $(e.target).offset().top - 75);
      $('ul#messages').addClass('noscroll');
    } else {
      $('ul#messages').removeClass('noscroll');
    }

    $(e.target).children('.edit-menu').toggleClass('hidden');
  },
  editMessage: function(e){
    var id = $(e.target).parents('li.message').attr('data-id');
    var text = $(e.target).parents('li.message').children('.raw-text').attr('data-text');
    $('#newMessage').attr('data-action', 'edit');
    $('#newMessage').attr('data-id', id);
    $('#newMessage input').val(text);
  },
  deleteMessage: function(e){
    var id = $(e.target).parents('li.message').attr('data-id');
    $.ajax({
      method: 'DELETE',
      url: '/messages/' + id,
      cache: false,
      success: function(response){
        $(e.target).parents('li.message').remove();
      },
      error: function(error){
        alert('There was a problem deleting the message.');
      }
    });
    $(e.target).parents('li.message').remove();
  }
};


$(document).ready(function(){
  startPage();
});


