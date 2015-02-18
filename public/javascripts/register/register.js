/* Register Page */

var register = {
  individualForm: function() {
    $('#partner-form').hide();
    $('#individual-form').fadeIn();
  },

  partnerForm: function() {
    $('#individual-form').hide();
    $('#partner-form').fadeIn();
  }
}