var menuActive = false;
var baseURL = window.location.protocol + '//' + window.location.host;
var player;
try{Typekit.load();}catch(e){};
var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytVideo', {
    height: '600',
    width: '800',
    videoId: '3vDLs2ug_ec',
    events: {
      'onReady': function(e){
        e.target.playVideo();
      },
      'onStateChange': function(e){
        if (e.data == YT.PlayerState.PAUSED || e.data == YT.PlayerState.ENDED){
          //$('#ytVideo').hide();
        }
      }
    }
  });
}


function elInViewport(el, offset){
  var o = offset || 0;
  var top = el.offsetTop;
  var left = el.offsetLeft;
  var width = el.offsetWidth;
  var height = $(el).height();
  var e = el; 
  if (
    top + height >= window.pageYOffset + o &&
    top <= window.pageYOffset + o
  ){
    return true;
  } else {
    return false;
  }
};


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
              },
  mailTo: function(){
            window.location = 'mailto:info@prizmapp.com?subject=Find out more';
          },
  insightSubjectChange: function(e){
                        },
  errorHandler: function(jqXHR) {
    var errorMessage = JSON.parse(jqXHR.responseText).error;
    console.log(errorMessage);
    var html = '<div class="error-message"><span class="error"></span>' +
               '<p>' + errorMessage + '</p></div>';
    return html;
  },
  showProfile: function(id){
    window.location = '/profiles/' + id;
  },
  hideOverlay: function(e) {
    if (player) {
      player.stopVideo();
    };

    $('.modal-overlay').hide(); 
  },
  playVideo: function(e){
    if ($('iframe#ytVideo').length > 0) {
      $('.videooverlay').show();
      $('.modal-overlay').show();
      $('#ytVideo').show();
      player.playVideo();
    } else {
      $('.modal-overlay').show();
      var overlay = document.createElement('div');
      overlay.className = 'videooverlay';
      var videoDiv = document.createElement('div');
      videoDiv.id = 'ytVideo';
      overlay.appendChild(videoDiv);
      //document.body.appendChild(overlay);
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      var ft = document.getElementsByTagName('script')[0];
      ft.parentNode.insertBefore(tag, ft);
    }
    
   
  },
  playerReady: function(e){
    alert('ready');
  }
};

/** NAVIGATION BAR **/
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
  var currentPageIsHome = document.getElementById("new-home");
  if (currentPageIsHome) {
    var about = $('a[href="/#about"]').parent();
    var product = $('a[href="/#prizmproduct"]').parent();
    var why = $('a[href="/#why"]').parent();
    var pricing = $('a[href="/#plans"]').parent();
    var aboutOffset = $('a#about.anchor').offset().top - 100;
    var productOffset = $('a#prizmproduct.anchor').offset().top - 30;
    var whyOffset = $('#why').offset().top - 30;
    var pricingOffset = $('#plans').offset().top -30;
    if (scrolled_val < aboutOffset) {
      if ($('#back-up').is(':visible')){
        $('#back-up').addClass('hidden');;
      }
      $('.menu-button').toggleClass('selected', false);
    } else {
      if (!$('#back-up').is(':visible')){
        console.log('showing back up');
        $('#back-up').removeClass('hidden');
      }
      if (scrolled_val > aboutOffset && scrolled_val < productOffset) {
          $('.menu-button').toggleClass('selected', false);
          about.toggleClass('selected', true);
      }
      else if (scrolled_val > productOffset && scrolled_val < whyOffset) {
        if (product.hasClass('selected')) {
          return;
        }
        else {
          $('.menu-button').toggleClass('selected', false);
          product.toggleClass('selected');
        }
      }
      else if (scrolled_val > whyOffset && scrolled_val < pricingOffset) {
        if (why.hasClass('selected')) {
          return;
        }
        else {
          $('.menu-button').toggleClass('selected', false);
          why.toggleClass('selected');
        }
      }
      else if (scrolled_val > pricingOffset) {
        if (pricing.hasClass('selected')) {
          return;
        }
        else {
          $('.menu-button').toggleClass('selected', false);
          pricing.toggleClass('selected');
        }
      }
    }
  }
});

/* Luminary and Patner Side Nav */
$(function(){
  $(window).bind('scroll',function(e){
    redrawDotNav();
  });

  function redrawDotNav(){
    var offset = 75;
    var $f = $('.dotNav li a:first');
    var fEl = document.getElementById($f.attr('elem'));
    if (fEl) {
      $('.dotNav li a').each(function(){
        var $this = $(this);
        var id = $this.attr('elem');
        var el = document.getElementById(id);
        if (el) {
          if (elInViewport(el, 75)) {
            $('.dotNav li').removeClass('active');
            var $e = $('.dotNav a[elem="' + id + '"]').parent();
            $e.addClass('active');
          } 
        }
      });
    }
  }
});

/* Animated Scrolling For Side Navigation */
$(function(){
  $('.dotNav li').click(function(){
    var id = $(this).find('a').attr("href"),
        posi,
        ele,
        padding = $('.navbar-fixed-top').height();
    
    ele = $(id);
    posi = ($(ele).offset()||0).top - padding;
    
    $('html, body').animate({scrollTop:posi}, 'slow');
    
    return false;
  });
});

/* Home Page Animated Scrolling */
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

