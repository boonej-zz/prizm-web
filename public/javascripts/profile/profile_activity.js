var activity = {
  notificationTab: function() {
    $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/jade',
        'Content-type': 'application/jade',
        'activity': 'notifications'
      },
      success: function(html) {
        if (html) {
          $('#notifications').html(html);
        }
        $('#requests').hide();
        $('#notifications').fadeIn();
      }
    });
  },
  requestTab: function() {
    $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/jade',
        'Content-type': 'application/jade',
        'activity': 'trusts'
      },
      success: function(html) {
        if (html) {
          $('#requests').html(html);
        }
        $('#notifications').hide();
        $('#requests').fadeIn();
      }
    });
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
        activity.requestTab();
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
        activity.requestTab();
      }
    });
  },
}