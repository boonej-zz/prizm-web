var isFetching = false;
var counter = 0;
var currentTag = '';
var availableTags = [];
var availableUsers = [];
var typingHash = false;
var typingTag = false;
var userTags = [];

var refreshTags = function(){
  if (availableTags.length == 0){
    $('ul#topics li').each(function(){
      var group = $(this).attr('data-name') || 'all';
      availableTags.push(group);
    });
  }
  if (availableUsers.length == 0){
    $('ul#members li.member').each(function(){
      var member = $(this).attr('data-name');
      availableUsers.push(member);
    });
  }
};

function startPage(){
  refreshTags();
  $('#removeGroup').unbind('click', messages.showRemoveTip);
  $('#removeGroup').bind('click', messages.showRemoveTip);
  messages.scrollToLatest();
  $('#newMessage').submit(function(){
    var action = $('#newMessage').attr('data-action');
    var url = action && action == 'edit'?'/messages/' + $('#newMessage').attr('data-id'):'/messages';
    var method = action && action == 'edit'?'PUT':'POST';
    var text = $('#newMessage input').val();
    var organization = $('input#selectedOrganization').val();
    var group = $('input#selectedGroup').val();
    for (var i = 0; i != userTags.length; ++i){
      var tag = userTags[i];
      text = text.replace(tag.name, tag.id);
    }
    userTags = [];
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
      $('#newMessage button').removeClass('env');
      $('#newMessage button').attr('type', 'button');
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
    if (width < 801 && !$target.is(members)&&!$target.is(count)&&!$target.is(name)&&!$target.is(info)) {
      $('.left-box').addClass('visible');
    }
  });
  $('.left-box .header').click(function(){
    var width = $(window).width();
    if (width < 801) {
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
 $('#newMessage input').keyup(function(e){
    refreshTags(); 
    if ($('#newMessage input').val() && $('#newMessage input').val().length > 0){
      $('#newMessage button').addClass('env');
      $('#newMessage button').attr('type', 'submit');
    } else {
      $('#newMessage button').removeClass('env');
      $('#newMessage button').attr('type', 'button');
    }
    var fieldVal = $('#newMessage input').val();
    if ((e.keyCode == 51 && e.shiftKey) || fieldVal.substr(fieldVal.length - 1) == '#') {
      typingHash = true;
      typingTag = false;
      currentTag = '';
    } else if (e.keyCode == 32){
      typingTag = false;
      typingHash = false;
      currentTag = '';
      $('#autoComplete').addClass('hidden');
    } else if (e.keyCode == 50 || fieldVal.substr(fieldVal.length - 1) == '#') {
      typingTag = true;
      typingHash = false;
      currentTag = '';
    } 
    if (typingHash){
      if (!fieldVal || fieldVal.length == 0) {
        typingHash = false;
      }
      if (typingHash) {
        var c = fieldVal.substr(fieldVal.length - 1);
        if (c.match(/\w/)) {
          currentTag = currentTag + String.fromCharCode(e.keyCode).toLowerCase();
        } 
        if (e.keyCode == 8 && currentTag.length > 0){
          currentTag = currentTag.substr(0, currentTag.length - 1);
        }
        var filteredTags = [];
        for (var i = 0; i != availableTags.length; ++i){
          var len = currentTag.length;
          var value = availableTags[i];
          var sub = value.substr(0, len);
          if (sub == currentTag) {
            filteredTags.push(value);
          }
        }
        $('#autoComplete').removeClass('hidden');
        $('#autoComplete').html('');
        var ac = document.getElementById('autoComplete');
        for (var i = 0; i != filteredTags.length; ++i) {
          var listItem = document.createElement('li');
          listItem.appendChild(document.createTextNode('#' + filteredTags[i]));
          ac.appendChild(listItem);
          $(listItem).click(function(){
            var val = $('#newMessage input[type="text"]').val();
            var replace = '@' + currentTag;
            var regex = new RegExp(replace + '$'); 
            val = val.replace(regex, $(this).text());
            $('#newMessage input[type="text"]').val(val);
            $('#autoComplete').html('');
            $('#autoComplete').addClass('hidden');
            currentTag = '';
            typingHash = false;
            typingTag = false;
            $('#newMessage input[type="text"]').focus();
          });
        }
      } else {
        currentTag = '';
        $('#autoComplete').addClass('hidden');
      }
    } else if (typingTag){
      if (!fieldVal || fieldVal.length == 0) {
        typingTag = false;
        typingHash = false;
      }
      if (typingTag) {
        var c = String.fromCharCode(e.keyCode);
        if (c.match(/[A-Za-z]/)) {
          currentTag = currentTag + String.fromCharCode(e.keyCode).toLowerCase();
        } 
        if (e.keyCode == 8 && currentTag.length > 0){
          currentTag = currentTag.substr(0, currentTag.length - 1);
        }
        var filteredTags = [];
        console.log(availableUsers);
        for (var i = 0; i != availableUsers.length; ++i){
          var len = currentTag.length;
          var value = availableUsers[i];
          var sub = value.substr(0, len);
          if (sub.toLowerCase() == currentTag) {
            filteredTags.push(value);
          }
        }
        $('#autoComplete').removeClass('hidden');
        $('#autoComplete').html('');
        var ac = document.getElementById('autoComplete');
        for (var i = 0; i != filteredTags.length; ++i) {
          var photoUrl = $('ul#members li.member[data-name="' + filteredTags[i] +'"]').attr('data-avatar');
          var listItem = document.createElement('li');
          listItem.className = 'user-tag';
          var profilePhoto = document.createElement('div');
          var style = document.createAttribute('style');
          style.value = 'background-image: url("' + photoUrl + '")'; 
          profilePhoto.className = 'avatar';
          profilePhoto.setAttributeNode(style);
          listItem.appendChild(profilePhoto);
          listItem.appendChild(document.createTextNode('@' + filteredTags[i]));
          ac.appendChild(listItem);
          $(listItem).click(function(){
            var val = $('#newMessage input[type="text"]').val();
            var name = $(this).text().substr(1);
            var replace = '@' + currentTag;
            var regex = new RegExp(replace + '$', 'i');
            var id = $('ul#members li.member[data-name="' + name + '"]').attr('data-id');
            var obj = {name: name, id: id};
            userTags.push(obj);
            val = val.replace(regex, $(this).text());
            $('#newMessage input[type="text"]').val(val);
            $('#autoComplete').html('');
            $('#autoComplete').addClass('hidden');
            currentTag = '';
            typingHash = false;
            $('#newMessage input[type="text"]').focus();
          });
        }
      } else {
        currentTag = '';
        $('#autoComplete').addClass('hidden');
      }
 
    } 
    //var r = new RegExp('\S*#(?:\[[^\]]+\]|\S+)');
    /*
    var r = /(?:#)\S+/gi;
    var val = $('#newMessage input').val();
    var hashtags = [];
    while (result = r.exec(val)) {
      hashtags.push(result);
    }
    if (hashtags.length > 0){
      var lastTag = String(hashtags.pop()).substr(1);
      alert(String(lastTag));
    }
    */
  })  ;
  document.body.addEventListener('dragenter', messages.drag);
  document.body.addEventListener('dragleave', messages.dragEnd);
  document.body.addEventListener('dragover', function(e){
    e.stopPropagation();
    e.preventDefault();
  });
  document.body.addEventListener('drop', messages.drop);
}

var messages = {
  cleanHashtags: function(){
    $('li.message span.message').each(function(){
      var $this = $(this);
      var text = $this.html();
      var matches = text.match(/#\w+/g);
      if (matches) {
        for (var i = 0; i != matches.length; ++i) {
          var match = matches[i];
          var name = match.substr(1);
          var html = '<a class="cursor" onclick="messages.clickNav(\'' + name + '\')">' + match + '</a>';
          var r = new RegExp(match) ;
          text = text.replace(r, html);
          $this.html(text);
        }
      }
    });
  },
  clickNav: function(name){
    var topic = $('ul#topics li[data-name="' + name + '"]');
    if (name == 'all') {
      topic = $('ul#topics li:first-child');
    }
    if (topic){
      topic.click();
    }
  },
  scrollToLatest: function(){
    $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    messages.cleanHashtags();
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
      if (width < 801) {
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
  },
  showViews: function(e){
    var messageID = $(e.target).parents('li.message').attr('data-id');
    $.ajax({
      url: '/messages/' + messageID + '/views',
      method: 'GET',
      cache: false,
      success: function(html){
        if (html) {
          $('body').append(html);
          $('body').addClass('noscroll');
        }
      }
    });
  },
  addImage: function(e){
    if(!$(e.target).hasClass('env')){
      $('#uploadImage').click();
    }
  }, 
  uploadImage: function(e){
    e.stopPropagation();
    e.preventDefault();
    if (window.File && window.FileReader && window.FileList && window.Blob){
      var files = e.target.files || e.dataTransfer.files;
      var file = files[0];
      //if (file.type.match('image.*')){ 
        var data = new FormData();
        data.append('image', file);
        var organization = $('input#selectedOrganization').val();
        var group = $('input#selectedGroup').val();
        var hash = window.location.hash;
        $.ajax({
          type: 'POST',
          url: '/messages',
          contentType: false,
          cache: false,
          processData: false,
          headers: {
            organization: organization,
            group: group,
            group_name: hash
          },
          data: data
        })
        .done(function(){
          $('#newMessage input').val('');
          $('#newMessage').attr('data-action', '');
          $('#newMessage').attr('data-id', '');
          messages.refresh();
        });
    //  }
    } else {
      alert('This browser does not support the File API.');
    }
  },
  drag: function(e) {
    if (!$('#mewMessage').length) {
      e.stopPropagation();
      e.preventDefault();
      counter++;
      if (!$(document.body).hasClass('drag')) {
        $(document.body).addClass('drag');
      }
    }
  },
  dragEnd: function(e){
    if (!$('#mewMessage').length){
      e.stopPropagation();
      e.preventDefault();
      counter--;
      if (counter < 1){
        $(document.body).removeClass('drag');
        counter = 0;
      }
    }
  },
  drop: function(e){
    if (!$('#mewMessage').length) {
      e.stopPropagation();
      e.preventDefault();
      $(document.body).removeClass('drag');
      messages.uploadImage(e);
    }
  },
  removeHandler: function(e){
    var $c = $(e.target);
    if ((!$c.is('#removeTip') && !$c.parent().is('#removeTip')) || $c.hasClass('cancel')) {
      $('#removeTip').fadeOut('fast');
      $('body').unbind('click', messages.removeHandler);
      $('#removeGroup').bind('click', messages.showRemoveTip);
    }
  },
  showRemoveTip: function(e){
    $('#removeTip').fadeIn('fast', function(){
      $('body').on('click', messages.removeHandler);
      $('#removeGroup').unbind('click', messages.showRemoveTip);
    });
  },
  deleteGroup: function(e) {
    var name = $(e.target).attr('data-name');
    var org = $('input#selectedOrganization').val();

    $.ajax({
      method: 'DELETE',
      url: '/organizations/' + org + '/groups/' + name,
      success: function(r){
        window.location = window.location; 
      },
      error: function(e){
        alert('This group could not be deleted at this time.');
      }
    });
  }
};


$(document).ready(function(){
  startPage();
});


