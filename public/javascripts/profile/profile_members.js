/* Members Page */

var members = {
  // Member Action Methods
  approve: function(e) {
    var member_id = $(e.target).parent('td').attr('data');
    var organization = $('#organization').attr('data');
    $.ajax({
      type: 'POST',
      url: '/users/' + member_id,
      headers:{
        'Accept': 'application/json',
        'org': organization,
        'status': 'active',
        'action': 'updateOrgStatus'
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
        'status': 'inactive',
        'action': 'updateOrgStatus'
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
        'status': 'inactive',
        'action': 'updateOrgStatus'
      },
      success: function() {
        members.activeTab();
        members.updateActiveCount();
      }
    });
  },

  addAmbassador: function(e) {
    var member_id     = $(e.target).parents('td').attr('data');
    var organization  = $('#organization').attr('data');

    $.ajax({
      type: 'POST',
      url: '/users/' + member_id,
      headers:{
        'Accept': 'application/json',
        // 'org': organization,
        // 'status': 'active',
        'memberType': 'ambassador',
        'action': 'updateSubtype'
      },
      success: function() {
        members.activeTab();
      },
      error: function(jqXHR) {
        console.log(jqXHR.responseText);
      }
    });
  },

  removeAmbassador: function(e) {
    var member_id     = $(e.target).parents('td').attr('data');
    var organization  = $('#organization').attr('data');

    $.ajax({
      type: 'POST',
      url: '/users/' + member_id,
      headers:{
        'Accept': 'application/json',
        // 'org': organization,
        // 'status': 'active',
        'memberType': 'null',
        'action': 'updateSubtype'
      },
      success: function(response) {
        console.log("success! - " + response);
        members.activeTab();
      },
      error: function(jqXHR) {
        console.log(jqXHR.responseText);
      }
    });
  },

  toggleAmbassadorMenu: function(e) {
    var target = e.target;
    var targetHidden = $(target).children('.ambassador-menu').hasClass('hidden');

    $(target).toggleClass('selected');
    $('.remove-menu').addClass('hidden');
    $('.restrict-menu').addClass('hidden');

    if (targetHidden) {
      $('.ambassador-menu').addClass('hidden');
      $(target).children('.ambassador-menu').toggleClass('hidden');
    }
    else {
      $(target).children('.ambassador-menu').toggleClass('hidden');
    }
  },

  toggleRestrictMenu: function(e) {
    var target = e.target;
    var targetHidden = $(target).children('.restrict-menu').hasClass('hidden');
    
    $('.remove-menu').addClass('hidden');
    $('.ambassador-menu').addClass('hidden');

    if (targetHidden) {
      console.log('restrict was hidden - showing now');
      $('.restrict-menu').addClass('hidden');
      $(target).children('.restrict-menu').removeClass('hidden');
    }
    else {
      console.log('restrict was visable - hiding now');
      $('.restrict-menu').addClass('hidden');
    }
  },

  toggleRemoveMenu: function(e) {
    var target = e.target;
    var targetHidden = $(target).children('.remove-menu').hasClass('hidden');
    
    $('.restrict-menu').addClass('hidden');
    $('.ambassador-menu').addClass('hidden');

    if (targetHidden) {
      $('.remove-menu').addClass('hidden');
      $(target).children('.remove-menu').toggleClass('hidden');
    }
    else {
      $(target).children('.remove-menu').toggleClass('hidden');
    }

  },

  cancelRemoveMenu: function() {
    $('.remove-menu').addClass('hidden');
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
  $(document).mouseup(function(e) {
    // Hack to dimiss menus unless menu is clicked.
    var ambassadorMenu  = $('.member-type');
    var restrictMenu    = $('.member-action .restrict');
    var removeMenu      = $('.member-action .remove');
    var target          = e.target;

    if ($(target).is(ambassadorMenu)) {
      $('.remove-menu').addClass('hidden');
      $('.restrict-menu').addClass('hidden');
    }
    else if ($(target).is(restrictMenu)) {
      $('.remove-menu').addClass('hidden');
      $('.ambassador-menu').addClass('hidden');
      $('.member-type').removeClass('selected');
    }
    else if ($(target).is(removeMenu)) {
      $('.restrict-menu').addClass('hidden');
      $('.ambassador-menu').addClass('hidden');
      $('.member-type').removeClass('selected');
    }
    else {
      $('.remove-menu').addClass('hidden');
      $('.restrict-menu').addClass('hidden');
      $('.ambassador-menu').addClass('hidden');
      $('.member-type').removeClass('selected');    
    }
  })
});
