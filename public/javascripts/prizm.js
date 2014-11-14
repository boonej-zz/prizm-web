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


