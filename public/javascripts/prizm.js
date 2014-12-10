var menuActive = false;
var baseURL = window.location.protocol + '//' + window.location.host;

var prizm = {
  signUp:   function(){
              $('#info-form').lightbox_me({
              });
            },
  submitForm: function(){
                var data = {
                  name: $('#name').val(),
                  age:  $('#age').val(),
                  gender: $('input:radio[name=gender]:checked').val(),
                  cityState: $('#city-state').val(),
                  email: $('#email').val(),
                  mobile: $('#mobile').val()
                };
               
                $.post('/', data, function(){
                  var confirmText = $('#confirm').html();
                  $('#form-body').html(confirmText);
                });
                
              },
  menuClicked: function(){
                 if (!menuActive){
                  menuActive = true;
                  $('.menu').slideDown();
                 } else {
                   menuActive = false;
                  $('.menu').slideUp();
                 }
               }, 
  goHome:     function(){
                window.location = baseURL;
              }
};

$(function(){
  $('.menu-button').click(function(){
    if ($(this).hasClass('selected')) {
      return;
    }
    else {
      $('.menu-button').toggleClass('selected', false);
      $(this).toggleClass('selected');
    }
  });
});

$(window).scroll(function(){
  var scrolled_val = $(document).scrollTop().valueOf();
  var about = $('a[href="#about"]').parent()
  var insight = $('a[href="#insight"]').parent()
  var mission = $('a[href="#mission"]').parent()
  if (scrolled_val < 658) {
    console.log("HOME");
    $('.menu-button').toggleClass('selected', false);
  }
  else if (scrolled_val > 658 && scrolled_val < 992) {
    console.log("ABOUT")
    if (about.hasClass('selected')) {
      return;
    }
    else {
      $('.menu-button').toggleClass('selected', false);
      about.toggleClass('selected');
    }
  }
  else if (scrolled_val > 1292 && scrolled_val < 1532) {
    if (insight.hasClass('selected')) {
      return;
    }
    else {
      $('.menu-button').toggleClass('selected', false);
      insight.toggleClass('selected');
    }
  }
  else if (scrolled_val > 1932) {
    if (mission.hasClass('selected')) {
      return;
    }
    else {
      $('.menu-button').toggleClass('selected', false);
      mission.toggleClass('selected');
    }
  }
})

$(function() {
  $('a[href*=#]:not([href=#])').click(function() {
    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
      if (target.length) {
        $('html,body').animate({
          scrollTop: target.offset().top
        }, 600);
        return false;
      }
    }
  });
});
/*
$(function() {
  var input_element = document.getElementById("interest-selection");
  input_element.onchange = interestCount;
});

function interestCount() {
  var numberOfSelectedInterests = $('#interest-selection :selected').length;
  var interest_number = document.getElementById("interest-count");
  interest_number.value = numberOfSelectedInterests;
}
*/


