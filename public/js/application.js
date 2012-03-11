$(document).ready(function () {
  $('.new-article img').addClass('thumbnail')

  $(".collapse").click(function () {
    $(this).collapse();
  });

  $('.sidebar .nav li').click(function () {
    var jThis = $(this);
    jThis.siblings().removeClass('active');
    jThis.addClass('active');
  });

  $("#back-to-top").hide();
  $(function () {
    $(window).scroll(function () {
      if ($(this).scrollTop() > 150) {
        $('#back-to-top').fadeIn();
      } else {
        $('#back-to-top').fadeOut();
      }
    });

    $('#back-to-topptop a').click(function () {
      $('body,html').animate({
        scrollTop: 0
      }, 800);
      return false;
    });
  });
});
