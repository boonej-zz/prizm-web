/* Register Page */

var reg = {
  nextSection: function() {
    var rc                = $('.registration-card');
    var numberOfSections  = rc.data('numberOfSections');
    var currentSection    = rc.data('currentSection');
    var sectionElem       = $('.section')
    var sectionOffset     = -16.66666667;
    var nextSection       = 0;
    var leftPosition      = 0;

    numberOfSections = parseInt(numberOfSections);
    currentSection = parseInt(currentSection);
    nextSection = currentSection + 1;
    if (nextSection > numberOfSections) {
      return false;
    }
    leftPosition = nextSection * sectionOffset;
    data = {
      currentSection: nextSection
    }
    style = {
      left: leftPosition + '%'
    }
    rc.data(data);
    sectionElem.css(style);
  },

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
    $.ajax({
      type: 'POST',
      url: window.location,
      headers: {
        dataType: 'interests',
      },
      data: {
        'interests': interests, 
        'userId': userId
      },
      success: function(response) {
        reg.nextSection();
      },
    });
    return false;
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
    var target = e.target;
    var isFollowing = $(target).data('isFollowing');
    var userId = $('.registration-card').data('userId');

    console.log("Is following? - " + isFollowing);

    $.ajax({
      type: 'POST',
      url: '/profiles/' + userToFollow + '/following',
      headers: {
        newUser: true,
        follower: userId
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
    return false;
  },

  registerUser: function(e) {
    $('.form-register').submit(function(){
      thisForm = "#" + $(this).parent().attr('id') + " form";
      var user = $(thisForm).serialize();
      $.ajax({
        type: 'POST',
        url: window.location,
        headers: {
          dataType: 'user'
        },
        data: user,
        success: function(user) {
          $('.registration-card').attr('data-user-id', user._id);
          reg.nextSection();
          // Hack - need to append 'data-user-id' attr to photo upload
          $('#userId').attr('value', user._id);
        },
        error: function(jqXHR) {
          $('.message').html(jqXHR.responseText);
        }
      });
      return false;
    });
  },

  uploadPhoto: function() {
    var userId    = $('.registration-card').data('userId');
    var imageType = 'profile';
    var dataType  = 'photo';
    var queryURL  = '/?dataType=' + dataType + '&imageType=' + imageType +
                    '&userId=' + userId;

    $('.form-photo').submit(function(){
      var formData = new FormData($(this)[0]);
      $.ajax({
        type: 'POST',
        url: window.location + queryURL,
        contentType: false,
        processData: false,
        data: formData,
        success: function(response) {
          reg.nextSection();
        },
        error: function(jqXHR) {
          $('.message-photo').html(jqXHR.responseText);
          console.log(jqXHR.responseText);
        }
      });
      return false;
    });
  }
}

/**
 * Set the width of the container of the suggested followers based
 * the number of suggested followers
 *
 * The offest is padding on the container to ensure the first card
 * appears in the center of the parent div
 */
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
});
