$(document).ready(function() {
    $(window).scroll(function() {
        if ($(this).scrollTop() > 800) {
            $('#middle').css('color', 'white');
            $('#logoimg').attr('src', '/assets/traplogowhite.png');
        } else {
            $('#middle').css('color', 'black'); // or any other default color
             $('#logoimg').attr('src', '/assets/traplogo.png'); // original logo path
        }
    });
});

function showprojects(){
    $("#projects_container").css("display","inherit");
    $("#projects_container").addClass("animated slideInDown");
    setTimeout(function(){
        $("#projects_container").removeClass("animated slideInDown");
    },800);
}
function closeprojects(){
    $("#projects_container").addClass("animated slideOutUp");
    setTimeout(function(){
        $("#projects_container").removeClass("animated slideOutUp");
        $("#projects_container").css("display","none");
    },800);
}
function showabout(){
    $("#about_container").css("display","inherit");
    $("#about_container").addClass("animated slideInLeft");
    setTimeout(function(){
        $("#about_container").removeClass("animated slideInLeft");
    },800);
}
function closeabout(){
    $("#about_container").addClass("animated slideOutLeft");
    setTimeout(function(){
        $("#about_container").removeClass("animated slideOutLeft");
        $("#about_container").css("display","none");
    },800);
}
function showwork(){
    $("#work_container").css("display","inherit");
    $("#work_container").addClass("animated slideInLeft");
    setTimeout(function(){
        $("#work_container").removeClass("animated slideInLeft");
    },800);
}
function closework(){
    $("#work_container").addClass("animated slideOutLeft");
    setTimeout(function(){
        $("#work_container").removeClass("animated slideOutLeft");
        $("#work_container").css("display","none");
    },800);
}
function showevents(){
    $("#events_container").css("display","inherit");
    $("#events_container").addClass("animated slideInLeft");
    setTimeout(function(){
        $("#events_container").removeClass("animated slideInLeft");
    },800);
}
function closeevents(){
    $("#events_container").addClass("animated slideOutLeft");
    setTimeout(function(){
        $("#events_container").removeClass("animated slideOutLeft");
        $("#events_container").css("display","none");
    },800);
}
    function showfindus(){
    $("#findus_container").css("display","inherit");
    $("#findus_container").addClass("animated slideInLeft");
    setTimeout(function(){
        $("#findus_container").removeClass("animated slideInLeft");
    },800);
}
function closefindus(){
    $("#findus_container").addClass("animated slideOutLeft");
    setTimeout(function(){
        $("#findus_container").removeClass("animated slideOutLeft");
        $("#findus_container").css("display","none");
    },800);
}
function showcontact(){
    $("#contact_container").css("display","inherit");
    $("#contact_container").addClass("animated slideInLeft");
    setTimeout(function(){
        $("#contact_container").removeClass("animated slideInLeft");
    },800);
}
function closecontact(){
    $("#contact_container").addClass("animated slideOutLeft");
    setTimeout(function(){
        $("#contact_container").removeClass("animated slideOutLeft");
        $("#contact_container").css("display","none");
    },800);
}

function showreviews(){
    $("#reviews_container").css("display","inherit");
    $("#reviews_container").addClass("animated slideInLeft");
    setTimeout(function(){
        $("#reviews_container").removeClass("animated slideInLeft");
    },800);
}
function closereviews(){
    $("#reviews_container").addClass("animated slideOutLeft");
    setTimeout(function(){
        $("#reviews_container").removeClass("animated slideOutLeft");
        $("#reviews_container").css("display","none");
    },800);
}
setTimeout(function(){
    $("#loading").addClass("animated fadeOut");
    setTimeout(function(){
      $("#loading").removeClass("animated fadeOut");
      $("#loading").css("display","none");
      $("#box").css("display","none");
      $("#projects").removeClass("animated fadeIn");
      $("#about").removeClass("animated fadeIn");
      $("#contact").removeClass("animated fadeIn");
      $("#work").removeClass("animated fadeIn");
    },1000);
},10);

// Function to show the pop-up
function showPopup() {
  document.getElementById('popup').classList.add('active');
}

// Function to close the pop-up
function closePopup() {
  document.getElementById('popup').classList.remove('active');
}

// Automatically show the pop-up after a delay (e.g., 3 seconds)
window.onload = function() {
  setTimeout(showPopup, 3000); // Adjust time as needed
};

// Function to show the booking pop-up with the specified form URL
function openBookingPopup(formUrl) {
  document.getElementById('bookingPopup').classList.add('active');
  document.body.style.overflow = 'hidden';

  startBookingTracking(formUrl);

  // Set the iframe's src attribute to the form URL
  document.getElementById('bookingIframe').src = formUrl;
}

// Function to close the booking pop-up
function closeBookingPopup() {
  document.getElementById('bookingPopup').classList.remove('active');
  document.body.style.overflow = 'auto';

  stopBookingTracking();

  // Reset the iframe's src attribute
  document.getElementById('bookingIframe').src = '';
}

// ---------------------------------------------------------------------------
// Booking conversion tracking
// The booking form is a single-page Google Form in a cross-origin iframe, so
// the parent page cannot read its document or URL. PR #1 counted iframe `load`
// events and treated load #2 as a submit. That missed real bookings:
//
// 1. index.html preloads the form on #bookingIframe. The Book buttons then set
//    the same URL again. In browsers that do not reload on a same-src
//    assignment, the "empty form" load never happens after tracking starts, so
//    a real submit is seen as load #1 and ignored.
// 2. GTM-5SZ4LPWJ only fires a GA4 event named "Make a Booking" on clicks of
//    https://forms.gle/YRD8qtPnJxGCTMdf8. The buttons call openBookingPopup()
//    instead, so that tag never runs. It also never sent `generate_lead`.
// 3. Google Forms validates required fields in-page (no iframe load). A
//    completed submit is detected when the iframe later loads again, which is
//    what happens when Google shows the confirmation view via navigation.
//    An in-document XHR confirmation with no navigation cannot be seen from
//    the parent; booking_click would still fire.
//
// Approach: fire `booking_click` when the popup opens. Ignore iframe loads
// until the form has been quiet for BOOKING_SETTLE_MS and the popup has been
// open for BOOKING_MIN_FILL_MS (longer than a display/reload, shorter than
// filling this form). The next load is generate_lead + Meta Lead + OpenAI
// lead_created, at most once per popup open. Validation-error reloads cannot
// be distinguished from a confirmation if they ever start navigating; they
// currently do not.
// ---------------------------------------------------------------------------
var BOOKING_FORM_ID = '1FAIpQLSe57gW9pysQn_LBf5PKRmur-yoccAw3rXOiFYUdNK2N3EszSQ';
var BOOKING_SETTLE_MS = 1500;
var BOOKING_MIN_FILL_MS = 4000;
var bookingTracking = {
  active: false,
  armed: false,
  fired: false,
  prefilled: false,
  openedAt: 0,
  settleTimer: null
};

function bookingFormVariant(prefilled) {
  return prefilled ? 'welcome_popup_free_gin_mixer' : 'standard';
}

function sendGtagEvent(name, params) {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
      return;
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(['event', name, params]);
  } catch (e) {}
}

function clearBookingSettleTimer() {
  if (bookingTracking.settleTimer) {
    clearTimeout(bookingTracking.settleTimer);
    bookingTracking.settleTimer = null;
  }
}

function armBookingTrackingAfterSettle() {
  clearBookingSettleTimer();
  if (!bookingTracking.active || bookingTracking.fired) return;
  bookingTracking.settleTimer = setTimeout(function () {
    bookingTracking.settleTimer = null;
    if (bookingTracking.active && !bookingTracking.fired) {
      bookingTracking.armed = true;
    }
  }, BOOKING_SETTLE_MS);
}

function startBookingTracking(formUrl) {
  stopBookingTracking();
  bookingTracking.active = typeof formUrl === 'string' && formUrl.indexOf(BOOKING_FORM_ID) !== -1;
  bookingTracking.armed = false;
  bookingTracking.fired = false;
  bookingTracking.prefilled = bookingTracking.active && formUrl.indexOf('usp=pp_url') !== -1;
  bookingTracking.openedAt = Date.now();
  if (bookingTracking.active) {
    trackBookingClick(bookingTracking.prefilled);
    armBookingTrackingAfterSettle();
  }
}

function stopBookingTracking() {
  clearBookingSettleTimer();
  bookingTracking.active = false;
  bookingTracking.armed = false;
  bookingTracking.fired = false;
  bookingTracking.openedAt = 0;
}

function onBookingIframeLoad() {
  var iframe = document.getElementById('bookingIframe');
  var src;
  if (!bookingTracking.active || bookingTracking.fired) return;
  if (!iframe) return;
  src = iframe.getAttribute('src');
  if (!src || src === 'about:blank') return;

  // Display loads (initial form, same-src reload, extra Google redirects)
  // arrive before the form could have been filled. Restart the quiet timer.
  if (!bookingTracking.armed || Date.now() - bookingTracking.openedAt < BOOKING_MIN_FILL_MS) {
    bookingTracking.armed = false;
    armBookingTrackingAfterSettle();
    return;
  }

  bookingTracking.fired = true;
  clearBookingSettleTimer();
  trackBookingConversion(bookingTracking.prefilled);
}

function trackBookingClick(prefilled) {
  sendGtagEvent('booking_click', {
    form_name: 'booking',
    form_variant: bookingFormVariant(prefilled)
  });
}

function trackBookingConversion(prefilled) {
  var variant = bookingFormVariant(prefilled);
  // lead_created: the form is a booking request that staff confirm, not a confirmed
  // reservation or payment. Its "customer_action" data object takes no custom
  // fields, and there is no price to report.
  try {
    if (typeof window.oaiq === 'function') {
      window.oaiq('measure', 'lead_created', { type: 'customer_action' });
    }
  } catch (e) {}
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Lead', { content_name: 'booking_form_submitted' });
    }
  } catch (e) {}
  sendGtagEvent('generate_lead', {
    form_name: 'booking',
    form_variant: variant
  });
}

document.addEventListener('DOMContentLoaded', function () {
  var iframe = document.getElementById('bookingIframe');
  if (iframe) iframe.addEventListener('load', onBookingIframeLoad);
});
