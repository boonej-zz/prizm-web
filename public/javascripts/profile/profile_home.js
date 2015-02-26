/* Profile Home Feed */
var home = {
  toggleComments: function(e) {
    var prizm_data = $(e.target).attr('prizm-data');
    drawer_selector = $('.comment-drawer[prizm-data=' + prizm_data + ']');
    drawer_selector.slideToggle();
  }
}
