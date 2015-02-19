/* Members Page */

var members = {
  // Member Action Methods
  approve: function(e) {
    var member_id = $(e.target).parents('td').attr('data');
    var organization = $('#organization').attr('data');
    $.ajax({
      type: 'POST',
      url: '/users/' + member_id,
      headers:{
        'Accept': 'application/json',
        'org': organization,
        'status': 'active'
      },
      success: function() {
        members.pendingTab();
        members.updateActiveCount();
        members.updatePendingCount();
      }
    });
  },
  reject: function(e) {
    var member_id = $(e.target).parents('td').attr('data');
    var organization = $('#organization').attr('data');
    $.ajax({
      type: 'POST',
      url: '/users/' + member_id,
      headers:{
        'Accept': 'application/json',
        'org': organization,
        'status': 'inactive'
      },
      success: function() {
        members.pendingTab();
        members.updatePendingCount();
      }
    });
  },
  remove: function(e) {
    var member_id = $(e.target).parents('td').attr('data');
    var organization = $('#organization').attr('data');
    $.ajax({
      type: 'POST',
      url: '/users/' + member_id,
      headers:{
        'Accept': 'application/json',
        'org': organization,
        'status': 'inactive'
      },
      success: function() {
        members.activeTab();
        members.updateActiveCount();
      }
    });
  },

  toggleRestrictMenu: function(e) {
    var target = e.target;
    var targetHidden = $(target).children('.restrict-menu').hasClass('hidden');
    if (targetHidden) {
      console.log("menu hidden");
      $('.restrict-menu').addClass('hidden');
      $(target).children('.restrict-menu').toggleClass('hidden');
    }
    else {
      console.log("menu visable");
      $(target).children('.restrict-menu').toggleClass('hidden');
    }

  },

  showCard: function(e) {
    var member_id = $(e.target).parents('td').attr('data');
    var member_selector = '.member-card[data=' + member_id + ']';
    var target = $(member_selector);
    $('.member-card').addClass('hidden');
    target.removeClass('hidden');
    $('#memberCard').modal();
  },

  // Member Page Controls
  activeTab: function() {
    var organization = $('#organization').attr('data');
    var request = $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/jade',
        'memberStatus': 'active',
        'content-type': 'application/jade',
        'org': organization
      },
      success: function(html) {
        members.updateActiveCount();
        if (html) {
          $('#active-members').html(html);
        }
        $('#pending-members').hide();
        $('#active-members').fadeIn();
      }
    });  
  },

  pendingTab: function() {
    var organization = $('#organization').attr('data');
    var request = $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/jade',
        'memberStatus': 'pending',
        'content-type': 'application/jade',
        'org': organization
      },
      success: function(html) {
        members.updatePendingCount();
        if (html) {
          $('#pending-members').html(html);
        }
        $('#active-members').hide();
        $('#pending-members').fadeIn();
      }
    });
   },

  updateActiveCount: function(){
    var organization = $('#organization').attr('data');
    $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/json',
        'content-type': 'application/json',
        'memberStatus': 'active',
        'org': organization
      },
      success: function(json) {
        $('a[href="#active"]').text("Approved Members (" + json.length + ")");
      }
    })
  },

  updatePendingCount: function(){
    var organization = $('#organization').attr('data');
    $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/json',
        'content-type': 'application/json',
        'memberStatus': 'pending',
        'org': organization
      },
      success: function(json) {
        var count = json.length;
        $('a[href="#pending"]').text("Pending Members (" + count + ")");
      }
    })
  },

  // Member Card Methods
  showCardBack: function(){
    $('.front-member').addClass('hidden');
    $('.back-member').removeClass('hidden');
  },
  showCardFront: function(){
    $('.back-member').addClass('hidden');
    $('.front-member').removeClass('hidden'); 
  }
};


$(function(){
  // Get Active and Pending Tab Counts
  members.updateActiveCount();
  members.updatePendingCount();
  // Find currently displayed member card and toggle hidden class when 
  // modal is dismissed
  $('#memberCard').on('click', '.modal-backdrop', function() {
    $('.member-card').not('hidden').addClass('hidden');
  });
  // Dismiss restrict menu
  $(document).mouseup(function (e) {
      var container = $('.member-action');
      // If the target is not the container or the child of the container
      if (!container.is(e.target) && container.has(e.target).length === 0) {
          $('.restrict-menu').addClass('hidden');
      }
  });
});
