$(document).ready(function(){
  $('form').submit(surveys.submit);
});

var surveys = {
  editSurvey: function(e) {
    var sid = $(e.target).attr('data-survey');
    $.ajax({
      method: 'GET',
      url: '/surveys/new',
      headers: {survey: sid},
      success: function(html){
        modal.showModal(html);
        $('#newSurvey').submit(survey.submit);
        $('#newSurvey input').keyup(survey.validate);
      }
    });
  },
  preloadIcons: function(){
    var images = [];
    var preload = JSON.parse($('.preload').attr('data-images'));
    for (var i = 0; i != preload.length; ++i) {
      var im = new Image();
      im.src = preload[i];
      images.push(im);
    }
    return images;
   },
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
  },
  sort: function(e){
    var $rows = $('li.body ul li');
    var type = $(e.target).attr('data-sort');
    var order =  $(e.target).attr('data-order');
    var sel = '.col[data-sort="' + type + '"]';
    $rows.sort(function(a,b){
      var asort, bsort;
      if (type === 'date') {
        asort = new Date($(a).children(sel).attr('data-date'));
        bsort = new Date($(b).children(sel).attr('data-date'));
      } else {
        asort = $(a).children(sel).text();
        bsort = $(b).children(sel).text();
      }
      console.log(asort + ' ' + bsort);
      if (asort > bsort) {
        if (order == 'desc') {
          return -1;
        } 
        return 1;
      } else if (asort < bsort) {
        if (order == 'desc') {
          return 1;
        }
        return -1;
      }
      return 0;
    });
    $rows.detach().appendTo('li.body ul');
  },
  delete: function(e){
    var sid = $(e.target).attr('data-survey');
    var url = '/surveys/' + sid;
    $.ajax({
      method: 'DELETE',
      url: url,
      success: function(d){
        $('li[data-survey="' + sid + '"]').remove();
      },
      error: function(e){
        alert('This survey could not be deleted at this time.');
      }
    }); 
  },
  bodyHandler: function(e) {
    if (!$(e.target).is('.action-menu') && !$(e.target).parent().is('.action-menu')) {
      $('#surveyAdmin button.edit').removeClass('active');
      $('#surveyAdmin button.resend').removeClass('active');
      $('li.body').css('overflow', 'scroll');
      $('.col.sortable').removeClass('active');
      $(window).unbind('click', surveys.bodyHandler);
      $('.col.sortable').unbind('click', surveys.sortHandler);
      $('.col.sortable').bind('click', surveys.sortHandler);
      $('#surveyAdmin button').unbind('click', surveys.buttonHandler);
      $('#surveyAdmin button').bind('click', surveys.buttonHandler);
    }
  },
  sortHandler: function(e){
    e.preventDefault();
    e.stopPropagation();
    $(e.target).addClass('active');
    $('.col.sortable').unbind('click', surveys.sortHandler);
    $('li.body').css('overflow', 'hidden');
    $('body').on('click', surveys.bodyHandler);
  },
  buttonHandler: function(e){
    e.preventDefault();
    e.stopPropagation();
    var action = $(e.target).attr('data-action');
    var survey = $(e.target).attr('data-survey');
    if (action === 'edit' || action =='resend') {
      $(e.target).addClass('active');
      var offset = $(e.target).offset().top;
      if ($(e.target).hasClass('resend')) offset -= 15;
      $(e.target).siblings('.action-menu').offset({top: offset});
      $('li.body').css('overflow', 'hidden');
      $('body').on('click', surveys.bodyHandler);
      $('#surveyAdmin button').unbind('click', surveys.buttonHandler);
    }
    if (action === 'results' || action === 'summary') {
      window.location = '/surveys/' + $(e.target).attr('data-survey') + '/' + action;
    }
  },
  showNonresponders: function(e){
    $('.tab-block').removeClass('active');
    $('.tab-block:last-child').addClass('active');
    $('ul#responders').hide();
    $('ul#nonresponders').show();
  },
  showResponders: function(e){
    $('.tab-block').removeClass('active');
    $('.tab-block:first-child').addClass('active');
    $('ul#nonresponders').hide();
    $('ul#responders').show();
  },
  exportCSV: function(e) {
    var surveyID = $('#surveyID').val();
    var questionID = $(e.target).attr('data-question');
    var path = '/surveys/' + surveyID + '/questions/' + questionID + '/export.csv';
    window.location = path;
  },
  showUserResponses: function(e) {
    var sid = $(e.target).attr('data-survey');
    var uid = $(e.target).attr('data-user');
    var url = '/surveys/' + sid + '/responses/' + uid;
    console.log(url);
    $.ajax({
      method: 'GET',
      url: url,
      cache: false,
      success: function(html){
        console.log(html);
        modal.showModal(html); 
      }
    })
  },
  resendNotification: function(e){
    var sid = $(e.target).attr('data-survey');
    var uid = $(e.target).attr('data-user') || false;
    var url = '/surveys/' + sid + '/notifications';
    $.ajax({
      method: 'POST',
      url: url,
      cache: false,
      contentType: 'application/json',
      data: JSON.stringify({targets: uid }) ,
      success: function(){
        alert('Notification sent.');
      },
      error: function(){
        alert('There was a problem sending your notification.');
      }
    });
  },
  cancelResend: function(e){
    $('#surveyAdmin button.resend').removeClass('active');
    $('#surveyAdmin button').unbind('click', surveys.buttonHandler);
    $('#surveyAdmin button').bind('click', surveys.buttonHandler);
  }
}
