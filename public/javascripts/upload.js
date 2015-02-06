
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
            div.appendChild(img);
            document.getElementById(elementId).appendChild(div);
            $(img).imgAreaSelect({
              handles: true,
              aspectRatio: '1:1',
              x1: 0,
              y1: 0,
              x2: 100,
              y2: 100,
              onSelectEnd: function(img, selection){
                var fields = ['x1', 'x2', 'y1', 'y2', 'width', 'height'];
                var field;
                for (var i = 0; field = fields[i]; ++i) {
                  document.getElementById(field)
                  .setAttribute('value', selection[field]);
                }
              }
            }); 
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
