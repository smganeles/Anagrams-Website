var socket = io();
var id="";
var active;
var player_from;
var steal_word;
var focus;

function new_word() {
	$(".word").css("border","none");
	active = null;
	$("#submission").focus();
}

$(document).ready(function() {

	$("#approval-box").hide();

	$("#player_join").click(function(){
		var name = $("#nameInput").val().trim();
		if (name.includes(" ")) {
			$("#login_msg").html("No spaces allowed in Name")
		} else {
			socket.emit('new_player',name);
			id = name;
			$("#login_back").hide();
		};
	});
	$("#nameInput").on("keyup", function(event) { //submit name when press enter
  		if (event.keyCode === 13) { 
		    event.preventDefault();
		    $("#player_join").click();
		}
	});

	$("#submit").click(function(){ //submit a word
		var word = $("#submission").val();
		$("#submission").val("");
		socket.emit('word_submit',word);
		active=null;
		player_from=null;
		steal_word=null;
	});
	$("#submission").on("keyup", function(event) { //submit word when press enter
  		if (event.keyCode === 13) { 
		    // Cancel the default action, if needed
		    event.preventDefault();
		    $("#submit").click();
		}
	});

	$("#chat_sbmt").click(function(){
		var data = {};
		data[id] = $("#chat_msg").val();
		socket.emit('chat_upld',data);
		$("#chat_msg").val("");
	});
	$("#chat_msg").on("keyup", function(event) { //submit chat when press enter
  		if (event.keyCode === 13) { 
		    event.preventDefault();
		    $("#chat_sbmt").click();
		}
	});

	$("#approve").click(function(){
		socket.emit('approve',id);
		$("#submission").focus();
	});

	$("#disapprove").click(function(){
		socket.emit('disapprove',id);
		$("#submission").focus();
	});



	//update the html
	socket.on('state', function(state) {
		//update words
		$("#top-row").html("");
		$("#bottom-row").html("");
		for (player in state["players"]) {
			if (player!=id) {
				$("#top-row").append(
					"<div class = 'col word-bank' id = '" + player + "'></div>");
			} else {
				$("#bottom-row").append(
					"<div class = 'col word-bank' id = '" + player + "'></div>");
			}
			if (!state["active_players"][player]) {
				$("#"+player).css("background-color","#ffa6a6");
			}
			$("#"+player).html("<h5>"+player+"</h5>"); //clear all words
			for (word of state["players"][player]) {  //redraw all words
				var word_HTML = "";
				for (letter of word) {
					word_HTML += "<p class = 'letter'>" + letter + "</p>";
				}
				$("#"+player).append(
					"<button class = 'word px-0' id = '" + word + "'>" + word_HTML + "</button>");
			}
		}
		//update letter bank
		$("#letter-bank").html("");
		for (letter of state["letter_bank"]) {  //redraw all letters in letter-bank
			$("#letter-bank").append("<p class = 'letter m-2'>" + letter + "</p>");
		}
		//reoutline active word
		if (active) {
			$("#"+active).css("border", "2px solid white");
			$("#"+active).css("border-radius","4px");
		}
		//check if doc in focus
		if (document.hasFocus()) {
			focus = true;
		} else {
			focus = false;
		}
		socket.emit('focus',focus);
	});

	socket.on('msg',function(msg) {
		$("#log-box").append(
			"<p class='msg'>" + msg + "</p>");
		$('#log-box').scrollTop($('#log-box')[0].scrollHeight*4);
	});

	socket.on('alert',function(alert) {
		$("#log-box").append(
			"<p class='msg alrt'>" + alert + "</p>");
		$('#log-box').scrollTop($('#log-box')[0].scrollHeight*4);
	});

	socket.on('chat',function(msg) {
		$("#chat-box").append(
			"<p class='chat'>" + msg + "</p>");
		$('#chat-box').scrollTop($('#chat-box')[0].scrollHeight*4);
	});

	socket.on('approval',function(data){
		if (data["p_to"]!=id){
			$("#approval-box").show(1000);			
		}
		$("#log-box").append(
			"<p class='msg'>" + data["msg"] + "</p>");
		$('#log-box').scrollTop($('#log-box')[0].scrollHeight*4);
	});

	socket.on('verdict',function(msg){
		$("#approval-box").hide(1000);
		$("#log-box").append(
			"<p class='msg'>" + msg + "</p>");
		$('#log-box').scrollTop($('#log-box')[0].scrollHeight*4);
	});




}); //end doc.ready







