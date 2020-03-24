var socket = io();

var id="";

var active;
var stealing=false;
var player_from;
var steal_word;

function new_word() {
	$(".word").css("border","none");
	active = null;
	$("#submission").focus();
	stealing=false;
}

function Stealing(word) {
	stealing=true;
	var word_obj = $("#"+word);
	active = word;
	$(".word").css("border","none");
	word_obj.css("border", "2px solid white");
	word_obj.css("border-radius","4px");
	player_from = word_obj.parent().attr("id");
	steal_word = word;
	$("#submission").focus();
}

$(document).ready(function() {

	$("#approval").hide();

	$("#player_join").click(function(){
		var name = $("#nameInput").val().trim();
		// if (!document.getElementById(name)) {
		// 	socket.emit('new_player',name);
		// 	id = name;
		// } else {
		// 	id = name;
		// }
		socket.emit('new_player',name);
		id = name;
		$("#login_back").hide();
	});

	$("#nameInput").on("keyup", function(event) { //submit word when press enter
  		if (event.keyCode === 13) { 
		    event.preventDefault();
		    $("#player_join").click();
		}
	});

	$("#submit").click(function(){ //submit a word
		var word = $("#submission").val();
		$("#submission").val("");
		if (stealing == false) {
			package = {"word":word,"id":id};
			socket.emit('word_submit',package);
		} else { //stealing a word
			package = {
				"new_word":word,
				"steal_word":steal_word,
				"player_from":player_from,
				"player_to":id};
			socket.emit('steal',package);
			socket.emit('hey');
		}
		stealing=false;
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
		var msg = id + ": " + $("#chat_msg").val();
		socket.emit('chat_upld',msg);
		$("#chat_msg").val("");
	});

	$("#chat_msg").on("keyup", function(event) { //submit word when press enter
  		if (event.keyCode === 13) { 
		    event.preventDefault();
		    $("#chat_sbmt").click();
		}
	});

	$("#approve").click(function(){
		socket.emit('approve',id);
	});

	$("#disapprove").click(function(){
		socket.emit('disapprove',id);
	});



	//update the html
	socket.on('state', function(state) {
		//update words
		for (player in state["players"]) {
			if (!document.getElementById(player)) {  //if the player isn't on the board yet
				if (player!=id) {
					$("#top-row").append(
						"<div class = 'col word-bank' id = '" + player + "'></div>");
				} else {
					$("#bottom-row").append(
						"<div class = 'col word-bank' id = '" + player + "'></div>");
				}
			}
			$("#"+player).html("<h5>"+player+"</h5>"); //clear all words

			for (word of state["players"][player]) {  //redraw all words
				var word_HTML = "";
				for (letter of word) {
					word_HTML += "<p class = 'letter'>" + letter + "</p>";
				}
				$("#"+player).append(
					"<button class = 'word px-0' onclick = 'Stealing("+'"'+word+'"'+")' id = '" + word + "'>" + word_HTML + "</button>");
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
		//fix the height of the log
		// var log = $("#log");
		// var msgs = log.html();
		// log.html("");
		// var height=$("#letter-bank").innerHeight();
		// $("#log").css("max-height",height);
		// $("#log").html(msgs);
	});

	socket.on('msg',function(msg) {
		$("#logbox").append(
			"<p class='msg'>" + msg + "</p>");
		$('#logbox').scrollTop($('#logbox')[0].scrollHeight);
	});

	socket.on('alert',function(alert) {
		$("#logbox").append(
			"<p class='msg alrt'>" + alert + "</p>");
		$('#logbox').scrollTop($('#logbox')[0].scrollHeight);
	});

	socket.on('chat',function(msg) {
		$("#chatbox").append(
			"<p class='chat'>" + msg + "</p>");
		$('#chatbox').scrollTop($('#chatbox')[0].scrollHeight);
	});

	socket.on('approval',function(data){
		$("#logbox").append(
			"<p class='msg'>" + data["msg"] + "</p>");
		$('#logbox').scrollTop($('#logbox')[0].scrollHeight);
		if (data["p_to"]!=id){
			$("#approval").show(1000);			
		}
	});

	socket.on('verdict',function(msg){
		$("#logbox").append(
			"<p class='msg'>" + msg + "</p>");
		$('#logbox').scrollTop($('#logbox')[0].scrollHeight);
		$("#approval").hide(1000);
	});





}); //end doc.ready







