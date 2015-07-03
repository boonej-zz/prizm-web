$(document).ready(function(){
  $('form.register-form').submit(register.submit);
  $('form#avatar').submit(register.uploadAvatar);
  $('#imageContainer').click(function(){
    $('input#imageFile').click();
  });
});

var droppedFiles = false;
var upload = false;

var register = {
  submit: function(e){
    var data = $(e.target).serialize();
    $.ajax({
      method: 'POST',
      url: '/users',
      data: data,
      cache: false,
      success: function(d){
        if (d.next) {
          $.ajax({
            method: 'GET',
            url: d.next,
            success: function(h){
              var state = {register: d.next.substr(1)};
              var split = d.next.split('/');
              var last = split[split.length - 1];
              history.pushState(state, last, last);
              document.open();
              document.write(h);
              document.close();
            }
          });
        } else {
          window.location = '/';
        }
        return false;
      },
      error: function(e){
        alert(e.responseJSON.error);
      }
    });
    return false;
  },
  finishFollow: function(e){
   var next = '/register/avatar';
   $.ajax({
      method: 'GET',
      url: next,
      success: function(h){
        var state = {register: next.substr(1)};
        var split = next.split('/');
        var last = split[split.length - 1];
        history.pushState(state, last, last);
        document.open();
        document.write(h);
        document.close();
      }
   });
  },
  finishWelcome: function(e){
    var next = '/register/interests';
    $.ajax({
      method: 'GET',
      url: next,
      success: function(h){
        var state = {register: next.substr(1)};
        var split = next.split('/');
        var last = split[split.length - 1];
        history.pushState(state, last, last);
        document.open();
        document.write(h);
        document.close();
      }
   });

  },
  imageChanged: function(e){
    e.stopPropagation();
    e.preventDefault();
    upload = true;
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
            $('#imageContainer').css('background-image', 'url(' + im.target.result +')'); 
            $('#imageContainer').css('background-size', 'cover');
            $('#photoInstructions').hide();
          }
        }(file));
        reader.readAsDataURL(file);
      } 
    } else {
      alert('This browser does not support the File API.');
    }
  },
  drag: function(e) {
    e.stopPropagation();
    e.preventDefault();
    e.target.className = (e.type == 'dragover'?'hover':'');
  },
  drop: function(e){
    e.preventDefault();
    insight.drag(e);
    upload = true;
    var files = e.target.files || e.dataTransfer.files;
    insight.imageChanged(e);
    droppedFiles = files[0];
  },
  uploadAvatar: function(e){
    e.preventDefault();
    if (upload) {
    var d = false;
    if (droppedFiles) {
      d = new FormData();
      d.append('image', droppedFiles);
    } else {
      d = new FormData($('form#avatar')[0]);
    }
    console.log(d);
      $.ajax({
        method: 'POST',
        url: '/users/avatar',
        contentType: false,
        data: d,
        cache: false,
        processData: false,
        success: function(html){
          droppedFiles = false;
          window.location = '/';
        },
        error: function(err){
          droppedFiles = false;
          alert('There was an error uploading your avatar. Please try again later.');
        }
      });
    } else {
      window.location = '/';
    }
      return false;
    } 
};
