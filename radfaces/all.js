// Twitter Widget
!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');

// Modals
$('.thumbnail').click(function(){
   $('.modal').hide();
   $('body').addClass('modal--open');
   $('#'+$(this).data('id')).fadeToggle();
});
$('.modal__close-btn').click(function(){
  $(this).closest('.modal').fadeToggle();
  $('body').removeClass('modal--open');
});
$(document).on( 'keydown', function ( e ) {
  if (e.keyCode === 27) {
    $('.modal').hide();
    $('body').removeClass('modal--open');
  }
});
