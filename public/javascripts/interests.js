$(document).ready(function(){
  interests.layoutInterests();
  $('ul#interests li').click(interests.interestClicked);
  $('button.interests').click(interests.submit);
});

var interests = {
  interestClicked: function(e){
    var id = $(e.target).attr('data-id');
    if ($(e.target).hasClass('parent')) {
      $('li.subinterest[data-parent="' + id + '"]').toggleClass('hidden').toggle();
    }
    $(e.target).toggleClass('selected');
    interests.layoutInterests();
    if ($('#interests li.selected').length > 2) {
      $('button.interests').attr('disabled', false);
    } else {
      $('button.interests').attr('disabled', 'disabled');
    }
  },
  submit: function(e){
    var next = $('#interests').attr('data-next');
    var headers = {};
    if (next) {
      headers.next = next;
    }
    var interests = [];
    $('#interests li.selected').each(function(){
      var $this = $(this);
      interests.push($this.attr('data-id'));
    });
    $.ajax({
      method: 'PUT',
      url: '/users/interests',
      data: {interests: interests},
      headers: headers,
      cache: false,
      success: function(d){
        if (d.next) {
          $.ajax({
            method: 'GET',
            url: d.next,
            success: function(h){
              var state = {register: d.next.substr(1)};
              var split = d.next.split('/');
              var last = split[split.length - 1];
              history.pushState(state, last, last);
              document.open();
              document.write(h);
              document.close();
            }
          }); 
        } else {
          window.location = window.location;
        } 
      },
      error: function(e){
        alert('There was a problem saving your interests.');
      }
    });
    return false;
  },
  layoutInterests: function(e){
    var interests = $('ul#interests li:not(".hidden")');
    var l = interests.length;
    var i = 0;
    while (i < l + 3) {
      var clump = [];
      for (var t = 0; t < 3; ++t) {
        if (interests[i + t]) {
          clump.push(interests[i + t]);
        }
      }
      var lengths = [];
      for (var t = 0; t < 3; ++t) {
        if (clump[t]) {
          lengths.push($(clump[t]).text().length);
        }
      }
      lengths = lengths.sort(function(a, b){
        return a - b;
      });
      var mid = lengths.length == 3?lengths[1]:lengths[0];
      var max = lengths[lengths.length - 1];
      var min = lengths[0];
      var diff = max - min;
      var std = 33;
      var lg = max/mid * std;
      var sm = 100 - std - lg;
      if (mid == min) {
        std = std - (lg - std)/2;
        sm = std;
      }
      if (max == mid) {
        std = std + (lg - std)/2;
        sm = std;
      }
      if (clump.length == 2) {
        lg = 50;
        std = 50;
        sm = 50;
      }
      var small = false;
      var medium = false;
      var large = false;

      for (var t = 0; t < 3; ++t){
        var style = [];
        var w = std;
        var p = 'mid';
        if (clump[t]) {
          var text = $(clump[t]).text();
          switch (text.length) {
            case min:
              if (!small) {
                w = sm;
                small = true;
                break;
              }
            case mid:
              if (! medium) {
                w = std;
                medium = true;
                break;
              }
            case max:
              if (! large) {
                w = lg;
                large = true;
                break
              };
            default:
              break;
          }
          switch (t) {
            case 1:
              style.push({style: 'margin-left', value: '1%'});
              style.push({style: 'margin-right', value: '1%'});
              w -= 2;
              break;
            default:
              style.push({style: 'margin-left', value: '0'});
              style.push({style: 'margin-right', value: '0'});
              break;
          }
          style.push({style: 'width', value: String(w) + '%'});
          style.push({style: 'display', value: 'inline-block'});
          for (var m = 0; m < style.length; ++m) {
            $(clump[t]).css(style[m].style, style[m].value);
          }
        }
      }
      i += 3;
    }
  }
}
