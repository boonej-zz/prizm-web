
var Upload = {
  infoAreaId: 'filesInfo',
  fileAreaId: 'filesToUpload',
  canvasId: 'imageCanvas',
  fileSelect:   function(e){
    e.stopPropagation();
    e.preventDefault();
    
    if (window.File && window.FileReader && window.FileList && window.Blob){
      var files = e.target.files;
      var file;
      var result = '';
      var elementId = this.infoAreaId;
      var fileAreaId = this.fileAreaId;
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
            var min = img.width <= img.height?img.width:img.height;
            var ratio = 300/min;
            var height = img.height * ratio;
            var width = img.width * ratio;
            var diff_h = (height - 300)/2;
            var diff_w = (300 - width)/2;
            $(div).css('background-image', 'url(' + e.target.result + ')');
            $(div).css('background-size', width + 'px ' + height + 'px');
            $(div).css('background-position', diff_w + 'px ' + diff_h + 'px');
            $(div).css('width', '300px')
            $(div).css('height', '300px');
            document.getElementById(elementId).appendChild(div);
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
