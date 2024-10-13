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

  // Set the iframe's src attribute to the form URL
  document.getElementById('bookingIframe').src = formUrl;
}

// Function to close the booking pop-up
function closeBookingPopup() {
  document.getElementById('bookingPopup').classList.remove('active');
  document.body.style.overflow = 'auto';

  // Reset the iframe's src attribute
  document.getElementById('bookingIframe').src = '';
}

