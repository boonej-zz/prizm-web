Stripe.setPublishableKey('pk_test_df7OuHn4tLSeOPofKF8DUjw0');

var org ={
  nextSection: function() {
    var pcc               = $('.payment-card-container');
    var numberOfSections  = pcc.data('numberOfSections');
    var currentSection    = pcc.data('currentSection');
    var sectionElem       = $('.section')
    var sectionOffset     = -100 / numberOfSections
    var nextSection       = 0;
    var leftPosition      = 0;

    numberOfSections = parseInt(numberOfSections);
    currentSection = parseInt(currentSection);
    nextSection = currentSection + 1;
    if (nextSection == numberOfSections) {
      return false;
    }
    leftPosition = nextSection * sectionOffset;
    data = {
      currentSection: nextSection
    }
    style = {
      left: leftPosition + '%'
    }
    pcc.data(data);
    sectionElem.css(style);
  },

  verifyOrgCode: function(e) {
    var orgInfo = $('#org-creation-info');
    var confirmButton = $('#code-confirm');
    var code = $('#inputCode').val();
    $('#check-code').submit(function(){
      $.ajax({
        type: 'GET',
        url: window.location,
        headers: {
          'Accept': 'application/json',
          'content-type': 'application/json',
          action: 'checkCode',
          data: code
        },
        success: function(response) {
          orgInfo.data('code', response.code);
          confirmButton.removeClass('disabled');
        },
        error: function(jqXHR) {
          $('.message-code').html(jqXHR.responseText);
          confirmButton.addClass('disabled');
        }
      });
      return false;
    });
  },

  verifyNamespace: function(e) {
    var orgInfo = $('#org-creation-info');
    var confirmButton = $('#namespace-confirm');
    var namespace = $('#inputNamespace').val();
    $('#check-namespace').submit(function(){
      $.ajax({
        type: 'GET',
        url: window.location,
        headers: {
          'Accept': 'application/json',
          'content-type': 'application/json',
          action: 'checkNamespace',
          data: namespace
        },
        success: function(response) {
          orgInfo.data('namespace', response.namespace);
          confirmButton.removeClass('disabled');
        },
        error: function(jqXHR) {
          $('.message-namespace').html(jqXHR.responseText);
          confirmButton.addClass('disabled');
        }
      });
      return false;
    });
  },

  chooseTheme: function(e) {
    var $form   = $('.form-theme');
    var theme   = $('input[name=theme]:checked').val();
    var orgInfo = $('#org-creation-info');
    if ($form[0].checkValidity()) {
      orgInfo.data('theme', theme);
      org.nextSection();
    }
    else {
      $('.message-theme').html('Must choose theme');
    }
  },

  uploadPhoto: function(){
    var orgInfo = $('#org-creation-info');
    var photoButton = $('.btn-photo');
    $('.form-photo').submit(function(){
      var formData = new FormData($(this)[0]);
      $.ajax({
        type: 'POST',
        url: window.location + '?action=uploadPhoto',
        contentType: false,
        processData: false,
        data: formData,
        success: function(response) {
          orgInfo.data('welcomeImage', response.url);
          $('[class^="imgareaselect"]').css('display', 'none');
          $('.btn-create-org').removeClass('disabled');
        },
        error: function(jqXHR) {
          $('.message-photo').html(jqXHR.responseText);
        }
      });
      return false;
    });
  },

  createStripeAccount: function(e) {
    var orgInfo = $('#org-creation-info');
    $('#payment-form').submit(function(){
      $.ajax({
        type: 'POST',
        url: window.location + '?action=createStripeAccount',
        success: function(response) {
        },
        error: function(jqXHR) {
          $('.message-payment').html(jqXHR.responseText);
        }
      });
      return false
    });
  },

  createOrg: function() {
    var orgInfo = $('#org-creation-info');
    var code = orgInfo.data('code');
    var namespace = orgInfo.data('namespace');
    var welcomeImage = orgInfo.data('welcomeImage');

    $.ajax({
      type: 'POST',
      url: window.location + '?action=createOrg',
      headers: {
        'code': code,
        'namespace': namespace,
        'welcomeImage' : welcomeImage
      },
      success: function(response) {
        org.nextSection();
      },
      error: function(jqXHR) {
        $('.message-create').html(jqXHR.responseText);
      }
    });
    return false;
  }
}

$(function() {
  $('#payment-form').submit(function(event) {
    var $form = $(this);

    // Disable the submit button to prevent repeated clicks
    $form.find('button').prop('disabled', true);

    Stripe.card.createToken($form, stripeResponseHandler);

    // Prevent the form from submitting with the default action
    return false;
  });
});

function resubmitPaymentForm($form){
  var orgInfo = $('#org-creation-info');
  var data = $form.serialize();
  $.ajax({
    type: 'POST',
    url: window.location + '?action=createStripeAccount',
    data: data,
    success: function(response) {
      $('.message-payment').html('Payment information saved successfully');
      $('#payment-form :input').attr('disabled', true);
      $('.btn-payment').removeClass('disabled');
      orgInfo.data('customerId', response.customer.id)
    },
    error: function(jqXHR) {
      $('.message-payment').html(jqXHR.responseText);
    }
  });
  return false;
};

function stripeResponseHandler(status, response) {
  var $form = $('#payment-form');
  var orgInfo = $('#org-creation-info');

  if (response.error) {
    // Show the errors on the form
    $form.find('.payment-errors').text(response.error.message);
    $form.find('button').prop('disabled', false);
  } else {
    // response contains id and card, which contains additional card details
    var token = response.id;
    // Insert the token into the form so it gets submitted to the server
    $form.append($('<input type="hidden" name="stripeToken" />').val(token));
    // and submit
    // $form.get(0).submit();
    resubmitPaymentForm($form);
  }
};

$(function(){
  var pcc = $('.payment-card-container');
  var numberOfSections = pcc.data('numberOfSections');
  var pccWidth;
  var sectionWidth;

  numberOfSections = parseInt(numberOfSections);
  pccWidth = numberOfSections * 100;
  sectionWidth = 100/ numberOfSections;
  pcc.css('width', pccWidth + '%');
  $('.section').css('width', sectionWidth + '%');
})