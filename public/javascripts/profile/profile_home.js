/* Profile Home Feed */
var checkCount = 0;
$(document).ready(function(){
  home.watchForChanges();
});

var home = {
  toggleComments: function(e) {
    var prizm_data = $(e.target).attr('prizm-data');
    drawer_selector = $('.comment-drawer[prizm-data=' + prizm_data + ']');
    drawer_selector.slideToggle();
  },
  watchForChanges: function(){
    var lastPostDate = $('li.post:first').attr('data-date');
    if (checkCount > 0){
      $.ajax({
        type: 'GET',
        contentType: 'application/json',
        url:  '/',
        headers: {
          action: 'newer',
          create_date: lastPostDate
        }
        
      })
      .done(function(data){
        console.log(data.count);
        if (data.count > 0){
          var string = String(data.count) + ' new post';
          if (data.count > 1) {
            string = string + 's.';
          } else {
            string = string + '.';
          }
          $('#activityBar span').text(string);
          $('#activityBar').click(function(){
            window.location = window.location.pathname;
          });
          $('#activityBar').addClass('visible');
        }
        checkCount++;
        setTimeout('home.watchForChanges()', 30000);
      });
    } else {
      checkCount++;
      setTimeout('home.watchForChanges()', 30000);
    }
  }
}
