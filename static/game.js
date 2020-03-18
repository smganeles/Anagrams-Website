var socket = io();
socket.on('message', function(data) {
  console.log(data);
  $("#p1").html("HOLA AMIGOS");
  document.getElementById("p1").innerHTML = 'HI THERE';
  // $("#p1").innerHTML = 'hi there';
});