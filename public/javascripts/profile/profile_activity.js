var activity = {
  notificationTab: function() {
    $('#requests').hide();
    $('#notifications').fadeIn();
  },
  requestTab: function() {
    $('#notifications').hide();
    $('#requests').fadeIn();
  },
  acceptRequest: function(e) {
    var trustId = $(e.target).parent('td').data('trustId');
    $.ajax({
      type: 'POST',
      url: '/trusts/' + trustId,
      headers: {
        'Accept': 'application/json',
        'Content-type': 'application/json',
        'status': 'accepted'
      },
      success: function() {

      }
    });
  },
  denyRequest: function(e) {
    var trustId = $(e.target).parent('td').data('trustId');
    $.ajax({
      type: 'POST',
      url: '/trusts/' + trustId,
      headers: {
        'Accept': 'application/json',
        'Content-type': 'application/json',
        'status': 'cancelled'
      },
      success: function() {

      }
    });
  }
}