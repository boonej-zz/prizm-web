var activity = {
  notificationTab: function() {
    $('#requests').hide();
    $('#notifications').fadeIn();
  },
  requestTab: function() {
    $('#notifications').hide();
    $('#requests').fadeIn();
  }
}