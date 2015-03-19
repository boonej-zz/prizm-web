var currentExploreType = $('#explore-type')
var explore = {
  latestTab: function() {
    $.ajax({
      type: 'GET',
      url: '/posts',
      headers: {
        'Accept': 'application/jade',
        'Content-type': 'application/jade',
        'feedType': 'explore',
        'exploreType': 'latest'
      },
      success: function(html) {
        if (html) {
          $('#lastest').html(html);
        }
        $('#popular').hide();
        $('#featured').hide();
        $('#latest').fadeIn();
        $('img.lazy').lazyload();
        $('#explore-type').attr('data-explore-type', 'latest');
      }
    });
  },
  popularTab: function() {
    $.ajax({
      type: 'GET',
      url: '/posts',
      headers: {
        'Accept': 'application/jade',
        'Content-type': 'application/jade',
        'feedType': 'explore',
        'exploreType': 'popular'
      },
      success: function(html) {
        if (html) {
          $('#popular').html(html);
        }
        $('#latest').hide();
        $('#featured').hide();
        $('#popular').fadeIn();
        $('img.lazy').lazyload();
        $('#explore-type').attr('data-explore-type', 'popular');
      }
    });
  },
  featuredTab: function() {
    $.ajax({
      type: 'GET',
      url: '/posts',
      headers: {
        'Accept': 'application/jade',
        'Content-type': 'application/jade',
        'feedType': 'explore',
        'exploreType': 'featured'
      },
      success: function(html) {
        if (html) {
          $('#featured').html(html);
        }
        $('#popular').hide();
        $('#latest').hide();
        $('#featured').fadeIn();
        $('img.lazy').lazyload();
        $('#explore-type').attr('data-explore-type', 'featured');
      }
    });
  },
}