var adjustSize = function($e, s, n){
  if ($e.height() > 416) {
    s -= 2;
    $e.css('fontSize', s + 'pt');
    adjustSize($e, s, n);
  } else {
    n(s);
  }
};

$(document).ready(function(){
  /* var textSize = adjustSize($('#text'), 60, function(size){
    $('p#fontSize').text('Font size: ' + size + 'pt');
  }); */

});
