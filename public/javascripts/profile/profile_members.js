/* Members Page */

var members = {
  // Member Action Methods
  approve: function(member_id) {
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
  reject: function(member_id) {
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
  remove: function(member_id) {
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

  // Member Page Controls
  activeTab: function() {
    var request = $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/jade',
        'memberStatus': 'active'
      },
      success: function(html) {
        if (html) {
          $('#active-members').html(html);
        }
      }
    });
    request.done(function(){
      $('#pending-members').hide();
      $('#active-members').fadeIn();
    });   
  },

  pendingTab: function() {
    var request = $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/jade',
        'memberStatus': 'pending'
      },
      success: function(html) {
        if (html) {
          $('#pending-members').html(html);
        }
      }
    });
    request.done(function(){
      $('#active-members').hide();
      $('#pending-members').fadeIn();
    });
  },

  updateActiveCount: function(){
    $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/json',
        'memberStatus': 'active'
      },
      success: function(json) {
        $('a[href="#active"]').text("Approved Members (" + json.length + ")");
      }
    })
  },

  updatePendingCount: function(){
    $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/json',
        'memberStatus': 'pending'
      },
      success: function(json) {
        console.log("Pending count: " + json.length);
        $('a[href="#pending"]').text("Pending Members (" + json.length + ")");
      }
    })
  }
};


$(function(){
  // Get Active and Pending Tab Counts
  members.updateActiveCount();
  members.updatePendingCount();

  $('.restrict').on('click', function(){
    $(this).find('.restrict-menu').toggleClass('hidden');
  });
});
