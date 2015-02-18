/* Register Page */

var reg = {
  individualForm: function() {
    $('#partner-form').hide();
    $('#individual-form').fadeIn();
  },

  partnerForm: function() {
    $('#individual-form').hide();
    $('#partner-form').fadeIn();
  }

  // registerUser: function(event){
  //   event.preventDefault();
  //   console.log("YES");
  //   var user = $('form').serialize();
  //   $.ajax({
  //     type: 'POST',
  //     url: window.location,
  //     data: user,
  //     success: function(response) {
  //       alert('Success');
  //       // console.log(response);
  //     },
  //     error: function(response) {
  //       alert('Error');
  //       $('.message').html(response.error);
  //     }
  //   });
  // }
}

$(function(){
  $('.form-register').submit(function(){
    thisForm = "#" + $(this).parent().attr('id') + " form"
    var user = $(thisForm).serialize();
    $.ajax({
      type: 'POST',
      url: window.location,
      data: user,
      success: function(response) {
        $('section').addClass('section-1');
      },
      error: function(jqXHR, textStatus, errorThrown) {
        $('.message').html(jqXHR.responseText);
      }
    });
    return false;
  });
});

$(function(){
  $('body').on('click', function(){
    console.log("CLICK");
    $('.section').toggleClass('section-1');
  })
})

