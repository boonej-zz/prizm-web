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

  interestSelect: function(e) {
    var target = e.target;
    var interest = $(target).attr('data-interest');
    var subInterestSelector = ' .' + interest;
    $(target).toggleClass('selected');
    $(subInterestSelector).removeClass('selected');
    $(subInterestSelector).toggleClass('hidden');
    reg.interestCount();
  },

  interestCount: function() {
    var numberOfInterests = 0;
    $('.interests-container li').each(function() {
      if ($(this).hasClass('selected')) {
        numberOfInterests ++;
      }
    });
    if (numberOfInterests < 3) {
      $('#save-interests-button').addClass('disabled');
    }
    else {
      $('#save-interests-button').removeClass('disabled');
    }
  },

  saveInterests: function() {
    var interests = [];
    var interestId;
    var userId = $('.registration-card').attr('data-user-id');
    $('.interests-container li').each(function(){
      if ($(this).hasClass('selected')) {
        interestId = $(this).attr('data-interest');
        interests.push(interestId);
      }
    });
    console.log(interests);
    $.ajax({
      type: 'PUT',
      url: window.location,
      data: {
        'interests': interests, 
        'userId': userId
      },
      success: function(response) {
        $('.section').addClass('section-3');
      },
    })
  },

  section2: function() {
    $('.section').toggleClass('section-2');
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

// $(function(){
//   $('body').on('click', function(){
//     $('.section').addClass('section-1');
//   })
// })

$(function(){
  $('.form-register').submit(function(){
    thisForm = "#" + $(this).parent().attr('id') + " form";
    var user = $(thisForm).serialize();
    $.ajax({
      type: 'POST',
      url: window.location,
      data: user,
      success: function(user) {
        console.log(user._id);
        $('.registration-card').attr('data-user-id', user._id);
        $('.section').addClass('section-1');
      },
      error: function(jqXHR) {
        $('.message').html(jqXHR.responseText);
      }
    });
    return false;
  });
});
