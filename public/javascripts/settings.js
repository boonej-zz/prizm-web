var droppedFiles = false;
var colors = ['green', 'pink', 'red', 'orange', 'blue', 'purple', 'black'];

$(document).ready(function(){
  $('form#branding').submit(settings.submitBranding);
  $('form#theme').submit(settings.baseSubmit);
  $('form#welcome').submit(settings.submitWelcome);
  $('form#follow').submit(settings.baseSubmit);
  $('form#featured').submit(settings.baseSubmit);
  $('label.color').click(function(){
    var $this = $(this);
    var f = $this.attr('for');
    var color = $('input#' + f).val();
    for (var i = 0; i != colors.length; ++i){
      $('#selectedTheme').removeClass(colors[i]);
    }
    $('#selectedTheme').addClass(color);
  });
});

var settings = {
  nav: function(e){
    var title = false;
    var s = $(e.target).attr('data-val');
    switch (s) {
      case 'theme':
        title = 'Theme Color';
        break;
      case 'welcome':
        title = 'Welcome Screen';
        break;
      case 'branding':
        title = 'Branding';
        break;
      case 'follow':
        title = 'Who to Follow';
        break;
      case 'featured':
        title = 'Featured';
        break;
      case 'interests':
        title = 'Interests';
        break;
      default:
        break;
    }
    if (title) {
      $('#options li').removeClass('selected');
      $(e.target).addClass('selected');
      $('h3').text(title);
      $('.settings-form').addClass('hidden');
      $('#' + s).removeClass('hidden');
    }
  },
  submitWelcome: function(e){
    var org = $('#orgID').val();
    var d = new FormData($('form#welcome')[0]);
    if (droppedFiles) {
      d.append('image', droppedFiles);
    }
    $.ajax({
      method: 'PUT',
      url: '/organizations/' + org,
      contentType: false,
      data: d,
      cache: false,
      processData: false,
      headers: {action: 'welcome'},
      success: function(code){
        droppedFiles = false;
        window.location = '/organizations/settings';
      },
      error: function(err){
        alert('There was a problem updating your profile.');
      }
    });
    return false;
  },
  submitBranding : function(e){
    var org = $('#orgID').val();
    var d = new FormData($('form#branding')[0]);
    if (droppedFiles) {
      d.append('image', droppedFiles);
    }
    $.ajax({
      method: 'PUT',
      url: '/organizations/' + org,
      contentType: false,
      data: d,
      cache: false,
      processData: false,
      headers: {action: 'branding'},
      success: function(code){
        droppedFiles = false;
        window.location = '/organizations/settings';
      },
      error: function(err){
        alert('There was a problem updating your profile.');
      }
    });
    return false;
  },
  imageChanged: function(e){
    e.stopPropagation();
    e.preventDefault();
    var c = $(e.target).attr('data-preview');
    if (window.File && window.FileReader && window.FileList && window.Blob){
      var files = e.target.files || e.dataTransfer.files;
      var file;
      var result = '';
      for(var i = 0; file = files[i]; i++){
        if(!file.type.match('image.*')){
          continue;
        }
        reader = new FileReader();
        reader.onload = (function(tfile){
          return function(im) {
            $('.' + c).css('background-image', 'url(' + im.target.result +')'); 
            $('.' + c).css('background-size', 'cover');
            $('.' + c + ' .instructions').hide();
          }
        }(file));
        reader.readAsDataURL(file);
      } 
    } else {
      alert('This browser does not support the File API.');
    }
  },
  drag: function(e){
    e.stopPropagation();
    e.preventDefault();
  },
  drop: function(e){
    e.preventDefault();
    settings.drag(e);
    var files = e.target.files || e.dataTransfer.files;
    settings.imageChanged(e);
    droppedFiles = files[0];
  },
  baseSubmit: function(e){
    var action = $(e.target).attr('id');
    var org = $('#orgID').val();
    var d = $('form#' + action).serialize();
    $.ajax({
      method: 'PUT',
      url: '/organizations/' + org,
      data: d,
      cache: false,
      headers: {action: action},
      success: function(code){
        droppedFiles = false;
        window.location = '/organizations/settings';
      },
      error: function(err){
        alert('There was a problem updating your profile.');
      }
   
    });

    return false;
  }
};
