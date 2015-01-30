/* Members Page */
$(function(){
  // Handle Members Active/Pending Tab Toggle
  $('li a[href="#pending"]').click(function(){
    var request = $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/jade',
        'memberStatus': 'pending'
      },
      success: function(html) {
        if (html) {
          $('#pending-members').html(html);
        }
      }
    });
    request.done(function(){
      $('#active-members').hide()
      $('#pending-members').fadeIn();
    });
  });
  $('li a[href="#active"]').click(function(){
    var request = $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/jade',
        'memberStatus': 'active'
      },
      success: function(html) {
        if (html) {
          $('#active-members').html(html);
        }
      }
    });
    request.done(function(){
      $('#pending-members').hide()
      $('#active-members').fadeIn();
    });
  });
});