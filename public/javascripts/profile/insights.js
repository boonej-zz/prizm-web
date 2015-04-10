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
      if (!state) {
        insights.fetchInsights('new', true);
      } else {
        if (state = 'modal_archive') {
          var type = state == 'modal_new'?'new':'archive';
          insights.fetchInsights(type, true);
          insights.dismissOverlay();
        }
      }
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
        $('img.lazy').lazyload({threshold: 200});
      }
    });
  },
  dismissOverlay: function(e){
    if (!e) {
      $('body').toggleClass('noscroll');
      $('#insightOverlay').remove();
    } else {
      var $target = $(e.target);
      if (
        $target.is('#insightOverlay') ||
        $target.is('#insightOverlay img') 
      ){
        $('body').toggleClass('noscroll');
        $('#insightOverlay').remove();
      } else {
        return false;
      }
    }
  }
};
