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
  },

  section4: function() {
    $('.section').toggleClass('section-4');
  },

  nextToFollow: function(direction) {
    var regExp          = new RegExp(/[^-\d\.]/g);
    var ucc             = $('.user-card-container');
    var widthValue      = ucc.css('width');
    var width           = parseInt(widthValue.replace(regExp, ''));
    var cardInfo        = ucc.data()
    var cardCount       = cardInfo.cardCount;
    var cardPosition    = cardInfo.cardPosition;
    var maxCardPosition = cardCount - 1;
    var leftPosition    = 0;

    if (direction == 'left' && cardPosition != 0) {
      cardPosition--;
    }

    if (direction == 'right' && cardPosition != maxCardPosition) {
      cardPosition++;
    }

    leftPosition = cardPosition * -410;

    var style = {
      left: leftPosition + 'px'
    }

    var data = {
      cardPosition: cardPosition
    }

    ucc.data(data);
    ucc.css(style);
  },

  followUser: function(e, userToFollow) {
    console.log("CLICK!");
    var target = e.target;
    var isFollowing = $(target).data('isFollowing');
    var userId = $('.registration-card').data('userId');

    console.log("Is following? - " + isFollowing);

    $.ajax({
      type: 'PUT',
      url: window.location,
      data: {
        'userToFollow': userToFollow,
        'isFollowing': isFollowing,
        'userId': userId
      },
      success: function() {
        if (isFollowing) {
          $(target).attr('data-is-following', false);
          $(target).data('isFollowing', false);
        }
        else {
          $(target).attr('data-is-following', true);
          $(target).data("isFollowing", true);
        }
        $(target).text(function() {
          return $(target).data('isFollowing') ? 'Following' : 'Follow';
        });
      }
    });
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
  $('body').on('click', function(){
    $('.section').addClass('section-1');
  })
})

$(function(){
  var offset = 75;
  var container = $('.user-card-container');
  var numberOfFollowCards = container.data('cardCount');
  var containerWidth = numberOfFollowCards * 410 + offset;
  var style = {
    width: containerWidth + 'px',
    paddingLeft: offset + 'px'
  }
  $(container).css(style);
})

$(function(){
  $('.form-register').submit(function(){
    thisForm = "#" + $(this).parent().attr('id') + " form";
    var user = $(thisForm).serialize();
    $.ajax({
      type: 'POST',
      url: window.location,
      data: user,
      success: function(user) {
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
