var notifications = {
  showDelivered : function(e){
    var key = $(e.target).attr('data-key');
    var selector = '.modal-overlay[data-key = "' + key + '"]';
    $(selector).removeClass('hidden');
    $('body').addClass('noscroll');
  },
  closeDelivered : function(e){
    if (!e || e.target.classList.contains('modal-overlay') ||
        e.target.classList.contains('content')){
      $('.modal-overlay').addClass('hidden');
      $('body').removeClass('noscroll');
    }
  }
}
