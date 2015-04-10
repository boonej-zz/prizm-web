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
  toggleArchive: function(id, action, state){
    $.ajax({
      method: 'POST',
      url: '/profiles/' + uid + '/insights/' + id,
      headers: {
        action: action,
        'content-type': 'text/html'
      }
    })
    .done(function(html){
      insights.fetchInsights(state, true);
      insights.dismissOverlay();
    });
  },
  showFullBleed: function(id){
    $.ajax({
      method: 'GET',
      url: '/insights/' + id,
      headers: {
        'content-type': 'text/html'
      }
    })
    .done(function(html){
      if (html) {
        $('body').toggleClass('noscroll');
        $('body').append(html);
        $('#insightOverlay img.lazy').lazyload({threshold: 1000});
      }
    });
  },
  dismissOverlay: function(e){
    if (!e) {
      $('body').removeClass('noscroll');
      $('#insightOverlay').remove();
    } else {
      var $target = $(e.target);
      if (
        $target.is('#insightOverlay') ||
        $target.is('#insightOverlay img') 
      ){
        $('body').removeClass('noscroll');
        $('#insightOverlay').remove();
      } else {
        return false;
      }
    }
  }
};
