$(document).ready(function(){
  $('form').submit(surveys.submit);
});

var surveys = {
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
        if (type === 'date') {
          return -1;
        } 
        return 1;
      } else if (asort < bsort) {
        if (type === 'date') {
          return 1;
        }
        return -1;
      }
      return 0;
    });
    $rows.detach().appendTo('li.body ul');
  },
  bodyHandler: function(e) {
    if (!$(e.target).is('.action-menu') && !$(e.target).parent().is('.action-menu')) {
      $('#surveyAdmin button.edit').removeClass('active');
      $('li.body').css('overflow', 'scroll');
      $(window).unbind('click', surveys.bodyHandler);
      $('#surveyAdmin button').bind('click', surveys.buttonHandler);
    }
  },
  buttonHandler: function(e){
    e.preventDefault();
    e.stopPropagation();
    var action = $(e.target).attr('data-action');
    var survey = $(e.target).attr('data-survey');
    if (action === 'edit') {
      $(e.target).addClass('active');
      $(e.target).siblings('.action-menu').offset({top: $(e.target).offset().top});
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
  }
}
