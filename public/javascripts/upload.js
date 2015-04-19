
var Upload = {
  infoAreaId: 'preview',
  fileAreaId: 'filesToUpload',
  canvasId: 'imageCanvas',
  targetWidth: 300,
  targetHeight: 300,
  fileSelect:   function(e){
    e.stopPropagation();
    e.preventDefault();
    
    if (window.File && window.FileReader && window.FileList && window.Blob){
      var files = e.target.files;
      var file;
      var result = '';
      var elementId = this.infoAreaId;
      var fileAreaId = this.fileAreaId;
      var targetWidth = this.targetWidth;
      var targetHeight = this.targetHeight;
      for (var i = 0; file = files[i]; i++) {
        if (!file.type.match('image.*')){
          continue;
        }
        reader = new FileReader();
        reader.onload = (function (tfile){
          return function(e){
            var div = document.createElement('div');
            var img = document.createElement('img');
            img.setAttribute('src', e.target.result);
            console.log(img.width);
            console.log(img.height);
            var min = img.width <= img.height?img.width:img.height;
            var ratio = img.width <= img.height?targetWidth/min:targetHeight/min;

            var height = img.height * ratio;
            var width = img.width * ratio;
            var diff_h = (targetHeight - height)/2;
            var diff_w = (targetWidth - width)/2;
            $(div).css('background-image', 'url(' + e.target.result + ')');
            $(div).css('background-size', width + 'px ' + height + 'px');
            $(div).css('background-position', diff_w + 'px ' + diff_h + 'px');
            $(div).css('background-repeat', 'no-repeat');
            $(div).css('width', targetWidth + 'px');
            $(div).css('height', targetHeight + 'px');
            $('output').html(div);
          } 
        }(file));
        reader.readAsDataURL(file);
      }
    } else {
      alert('This browser does not support the File API.');
    }
  },
  dragOver: function(e){
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }
}
