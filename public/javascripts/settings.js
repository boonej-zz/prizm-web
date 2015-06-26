var droppedFiles = false;

$(document).ready(function(){
  $('form#branding').submit(settings.submitBranding);
});

var settings = {
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
            $('.logo-drop').css('background-image', 'url(' + im.target.result +')'); 
            $('.logo-drop').css('background-size', 'cover');
            $('.logo-drop .instructions').hide();
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
  }
};
