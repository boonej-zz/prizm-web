var uid = $('#userId').attr('value');

$(document).ready(function(){
  $('img.lazy').lazyload(
    {threshold: 200,
     container: $('#insights')}
  );
});

var insights = {
  fetchInsights: function(type, noscroll){
    if (!noscroll) {
      $('#insights').scrollTop();
    }
    $.ajax({
      method: 'GET',
      url: '/profiles/' + uid + '/insights',
      headers: {
        type: type,
        'content-type': 'text/html'
      }
    })
    .done(function(html){
      $('#insights').html(html); 
      $('img.lazy').lazyload(
        {threshold: 200,
         container: $('#insights')}
      );
      if (type == 'archive') {
        $('#insights').addClass('archive');
      } else {
        $('#insights').removeClass('archive');
      }
    });
  },
  toggleArchive: function(id, action){
    $.ajax({
      method: 'POST',
      url: '/profiles/' + uid + '/insights/' + id,
      headers: {
        action: action,
        'content-type': 'text/html'
      }
    })
    .done(function(html){
      insights.fetchInsights('new', true);
    });
  }
};
