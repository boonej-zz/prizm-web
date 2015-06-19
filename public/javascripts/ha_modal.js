var overlay = {
  cancel: function(e){
    if (!e || e.target.classList.contains('modal-overlay') ||
        e.target.classList.contains('content')){
      $('.modal-overlay').remove();
      $('body').removeClass('noscroll');
    }
  },
  show: function(html){
    $('body').addClass('noscroll');
    $('body').append(html);
  }
}

var tabs = {
  select: function(e){
    var list = document.getElementsByClassName('tabs')[0];
    var tabs = list.getElementsByTagName('li');
    for (var i = 0; i != tabs.length; ++i){
      tabs[i].classList.remove('active');
    }
    e.target.classList.add('active');
    var sectionID = e.target.getAttribute('data-for');
    var targetSection = document.getElementById(sectionID);
    var sections = document.getElementsByClassName('body');
    for (var i= 0; i != sections.length; ++i){
      sections[i].classList.remove('active');
    }
    targetSection.classList.add('active');
  }
}
