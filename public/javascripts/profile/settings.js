var prepHeader = function(){
  $('.left-box').removeClass('visible');
  $('.right-box h3').click(function(e){
    var width = $(window).width();
    if (width < 601) {
      $('.left-box').toggleClass('visible');
    }
  });

}

$(document).ready(function(){
  $('.left-box li').click(settings.itemSelected);
  prepHeader();
});

var settings = {
  itemSelected: function(e){
    $(this).siblings('li').removeClass('selected');
    $(this).addClass('selected');
  },
  nav: function(path){
    var url = '/profile/settings/' + path;
    if (url) {
      $.ajax({
        method: 'GET',
        url: url
      })
      .done(function(html){
        $('.right-box').html(html);
        interests.layoutInterests();
        $('.buttons button.save').click(interests.submit);
        prepHeader();
      })
    }
  }
};
