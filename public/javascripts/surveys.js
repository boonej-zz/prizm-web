$(document).ready(function(){
  $('form').submit(surveys.submit);
});

var surveys = {
   submit: function(e){
    var surveyID = $('#surveyID').val();
    var data = $(e.target).serialize();
    var currentPage = Number($(e.target).children('input[name="order"]').val());
    var nextPage = currentPage + 1;

    var headers = {};
    if ($(e.target).hasClass('last')) {
      headers =  {final: true};
    }
    $.ajax({
      method: 'POST',
      url: '/surveys/' + surveyID + '/answers',
      data: data,
      headers: headers, 
      success: function(res){
        if (res.action == 'finish'){
          window.location = window.location;
        } else {
          $('form.survey').addClass('hidden');
          $('form#question' + nextPage).removeClass('hidden');
        }
      }
    });
    return false;
  }
}
