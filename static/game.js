var socket = io();

var id="Simon";

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

	socket.emit('new player');

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
				"player_to":id}
			socket.emit('steal',package);
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
		var log = $("#log");
		var msgs = log.html();
		log.html("");
		var height=$("#letter-bank").innerHeight();
		$("#log").css("max-height",height);
		$("#log").html(msgs);
	});

	socket.on('msg',function(msg) {
		$("#log").append(
			"<p class='msg'>" + msg + "</p>");
	});

	socket.on('alert',function(alert) {
		$("#log").append(
			"<p class='msg alrt'>" + alert + "</p>");
	});





}); //end doc.ready







