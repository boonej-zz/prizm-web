/* Register Page */

var reg = {
  individualForm: function() {
    $('#partner-form').hide();
    $('#individual-form').fadeIn();
  },

  partnerForm: function() {
    $('#individual-form').hide();
    $('#partner-form').fadeIn();
  },

  registerUser: function(){
    var user = $('form').serialize();
    $.ajax({
      type: 'POST',
      url: window.location,
      data: user,
      success: function(response) {
        console.log(response);
      }
    });
  }
}