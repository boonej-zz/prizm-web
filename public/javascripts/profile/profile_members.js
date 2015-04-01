/* Members Page */
var hoverLock = false;
var hover = function() {
 $('tbody>tr').hover(function(){
    if (!hoverLock){
      $('tbody>tr').removeClass('hover');
      $(this).addClass('hover');
    }
  });
};
var members = {
  // Member Action Methods
  formatTable: function(height) {
    var table = $('table');
      table.attr('org-width', table.width());
      table.find('tbody tr').each(function(){
        $(this).attr('org-width', $(this).width());
        $(this).attr('org-height', $(this).height() );
      }); 
      table.find('thead tr th').each(function(){
        $(this).attr('org-width', $(this).width() + 20);
        $(this).attr('org-height', $(this).height());
      });
      table.find('tbody tr td').each(function(){
        $(this).attr('org-width', $(this).width() + 20);
        $(this).attr('org-height', $(this).height());
      });
      $('table thead tr').css('display', 'block');
      $('tbody').css('display', 'block');
      //$('tbody tr').css('display', 'block');
      $('tbody').css('max-height', '606px');
      $('tbody').css('width', '100%');
      table.find('tbody tr').each(function(){
        $(this).css('width', $(this).attr('org-width') + 'px');
        $(this).css('height', $(this).attr('org-height') + 'px');
        $(this).css('padding', '16px 0px 16px 0px');
      });
      table.css('width', table.attr('org-width') + 'px');
      table.find('thead tr th').each(function(){
        $(this).css('width', $(this).attr('org-width') + 'px');
        $(this).css('padding', '0');
      });
      table.find('tbody tr td').each(function(){
        $(this).css('width', $(this).attr('org-width') + 'px');
      });

               },

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

  makeAmbassador: function(e) {
    var member_id     = $(e.target).parents('td').attr('data');
    var organization  = $('#organization').attr('data');

    $.ajax({
      type: 'POST',
      url: '/users/' + member_id,
      headers:{
        'Accept': 'application/json',
        'memberType': 'ambassador',
        'action': 'updateSubtype',
        'org': organization
      },
      success: function() {
        members.activeTab();
        hoverLock = false;
      },
      error: function(jqXHR) {
        console.log(jqXHR.responseText);
      }
    });
  },

  makeLuminary: function(e) {
    var member_id     = $(e.target).parents('td').attr('data');
    var organization  = $('#organization').attr('data');

    $.ajax({
      type: 'POST',
      url: '/users/' + member_id,
      headers:{
        'Accept': 'application/json',
        'memberType': 'luminary',
        'action': 'updateSubtype',
        'org': organization
      },
      success: function() {
        members.activeTab();
      },
      error: function(jqXHR) {
        console.log(jqXHR.responseText);
      }
    });
  },

  makeMember: function(e) {
    var member_id     = $(e.target).parents('td').attr('data');
    var organization  = $('#organization').attr('data');

    $.ajax({
      type: 'POST',
      url: '/users/' + member_id,
      headers:{
        'Accept': 'application/json',
        'memberType': 'null',
        'action': 'updateSubtype',
        'org': organization
      },
      success: function(response) {
        members.activeTab();
      },
      error: function(jqXHR) {
        console.log(jqXHR.responseText);
      }
    });
  },
  toggleGroupMenu: function(e){
    var target = e.target;
    var targetHidden = $(target).children('.group-menu').hasClass('hidden');
    $(target).toggleClass('selected');
    $('.remove-menu').addClass('hidden');
    $('.restrict-menu').addClass('hidden');
    if (targetHidden) {
      $('.group-menu').addClass('hidden');
      $(target).children('.group-menu').toggleClass('hidden');
    } else {
      $(target).children('.group-menu').toggleClass('hidden');
    }


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

  // Table Controls
  addMember: function() {
    return false;
  },

  exportCSV: function(e) {
    return false;
  },

  // Member Page Controls
  activeTab: function(sort) {
    if(!sort) sort = false;
    var organization = $('#organization').attr('data');
    var request = $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/jade',
        'memberStatus': 'active',
        'content-type': 'application/jade',
        'org': organization,
        'sort': sort
      },
      success: function(html) {
        members.updateActiveCount(sort);
        if (html) {
          $('#active-members').html(html);
        }
        $('#pending-members').hide();
        $('#active-members').fadeIn();
        hover();
        //members.formatTable('606px');

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
        hover();
        //members.formatTable('606px');
      }
    });
   },

  updateActiveCount: function(sort){
    var organization = $('#organization').attr('data');
    $.ajax({
      type: 'GET',
      url: window.location.pathname,
      headers: {
        'Accept': 'application/json',
        'content-type': 'application/json',
        'memberStatus': 'active',
        'org': organization,
        sort: sort
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
        $('a[href="#pending"]').text("Pending Approval (" + count + ")");
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
  },
  showNameMenu: function(){
    $('#nameMenu').toggleClass('hidden');
  },
  showStatusMenu: function(){
    $('#statusMenu').toggleClass('hidden');
  },
  showDateMenu: function(){
    $('#dateMenu').toggleClass('hidden');
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
    var ambassadorMenu  = '.member-type';
    var restrictMenu    = '.member-action.restrict';
    var removeMenu      = '.member-action.remove';
    var groupButton     = '.group-button';
    var target          = e.target;

    if ($(target).is(ambassadorMenu)) {
      $('.remove-menu').addClass('hidden');
      $('.restrict-menu').addClass('hidden');
      hoverLock = !hoverLock;      
    }
    else if ($(target).is(restrictMenu)) {
      $('.remove-menu').addClass('hidden');
      $('.ambassador-menu').addClass('hidden');
      $('.member-type').removeClass('selected');
      hoverLock = !hoverLock;
    }
    else if ($(target).is(removeMenu)) {
      $('.restrict-menu').addClass('hidden');
      $('.ambassador-menu').addClass('hidden');
      $('.member-type').removeClass('selected');
      hoverLock = !hoverLock;
    }
    else if ($(target).is(groupButton)) {
      $('.restrict-menu').addClass('hidden');
      $('.ambassador-menu').addClass('hidden');
      $('.member-type').removeClass('selected');
      hoverLock = !hoverLock;
    }
    else {
      $('#dateMenu').addClass('hidden');
      $('#nameMenu').addClass('hidden');
      $('#statusMenu').addClass('hidden');
      $('.remove-menu').addClass('hidden');
      $('.restrict-menu').addClass('hidden');
      $('.ambassador-menu').addClass('hidden');
      $('.member-type').removeClass('selected');    
      $('.group-menu').removeClass('selected');
      $('.group-menu').addClass('hidden');
      hoverLock = false;
    }
  })
});

$(document).ready(function(){
  // members.formatTable('606px');
  $('.group-menu li').click(function(){
    var $this = $(this);
    var group = $this.children('.group-icon').attr('group');
    $this.parents('.group-button').children('div.group-icon').attr('group', group);
  });
  hover(); 
});

