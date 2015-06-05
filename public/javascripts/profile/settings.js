$(document).ready(function(){
  $('.left-box li').click(settings.itemSelected);
});

var settings = {
  itemSelected: function(e){
    $(this).siblings('li').removeClass('selected');
    $(this).addClass('selected');
  },
  nav: function(path){
    var url = false;
    if (path == 'likes'){
      url = '/profile/settings/likes';
    }
    if (path == 'follow') {
      url = '/profile/settings/follow';
    }
    if (path == 'support') {
      url = '/profile/settings/support';
    }
    if (url) {
      $.ajax({
        method: 'GET',
        url: url
      })
      .done(function(html){
        $('.right-box').html(html);
      })
    }
  }
};
