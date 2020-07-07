var socket = io();
var id="";
var player_from;
var steal_word;
var focus = true;
var typing = false;
var prev_word = "  ";
var queue = [];

function new_word() {
	$(".word").css("border","none");
	$("#submission").focus();
}

$(document).ready(function() {

	$("#approval-box").hide();

	$(document).click(function(){
		if (!focus) {
			socket.emit('focus',true);
			focus==true;
		}
	});

	//Player joining
	$("#player_join").click(function(){
		var name = $("#nameInput").val().trim();
		var letters = /^[0-9a-zA-Z]+$/;
		if (!name.match(letters) || name.includes(" ")) {
			$("#login_msg").html("No symbols or spaces allowed in Name");
		} else {
			socket.emit('new_player',name);
			// id = name;
		};
	});
	$("#nameInput").on("keyup", function(event) { //submit name when press enter
  		if (event.keyCode === 13) {
		    event.preventDefault();
		    $("#player_join").click();
		}
	});

	//Submitting a word
	$("#submit").click(function(){ 
		var word = $("#submission").val();
		$("#submission").val("");
		socket.emit('word_submit_v2',word); //ELAN: word_submit_v2
		prev_word = "   ";
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
	$("#submission").on("paste",function(event){
		event.preventDefault();
	});

	//submitting a chat message
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

	// //ELAN
	// $("#submission").on('input',function(){
	// 	if ($(this).val().length>=2) {
	// 		if (prev_word.length<2){
	// 			typing = true;	
	// 			socket.emit('add_to_queue',$(this).val());
	// 		}
	// 	} else if ($(this).val().length<2) {
	// 		if (prev_word.length>=2) {
	// 			typing = false;
	// 			socket.emit('remove_from_queue',prev_word);
	// 			//UNLESS SUBMITTED
	// 		}
	// 	}
	// 	prev_word = $(this).val();
	// });

	//update the html
	socket.on('state', function(state) {
		//clear top and bottom row (besides queue)
		$("#top-row").html("");
		//ELAN
		// $("#bottom-row").html("<div class = 'col-2 bg-secondary mr-3 pt-2' id='typing_queue'></div>");
		// for (name of queue) {
		// 	$("#typing_queue").append(
		// 		"<p class='msg'>" + name + "</p>");
		// }
		$("#bottom-row").html("");
		// sort, most words first
		let players = state["players"];
		let sorted_players = [];
		let num_players = Object.keys(players).length;
		for (i=0; i<num_players;i++) {
			let max = -1;
			let most_words;
			for (player in players) {
				let x = players[player].length;
				if (x>max) {
					max = x;
					most_words = player;
				}
			}
			sorted_players.push([most_words,players[most_words]]);
			delete players[most_words];
		}
		// for (player in state["players"]) {
		for (const [player,words] of sorted_players) {
			if (player!=id) {
				$("#top-row").append(
					"<div class = 'col word-bank' id = '" + player + "'></div>");
			} else {
				$("#bottom-row").append(
					"<div class = 'col word-bank' id = '" + player + "'></div>");
			}
			if (!state["active_players"][player]) {
				$("#"+player).css("background-color","#ffd1d1");
			}
			else if (!state["focused_players"][player]){
				$("#"+player).css("background-color","#fff3d1");
			}
			$("#"+player).html("<h5>"+player+"</h5>"); //clear all words
			// for (word of state["players"][player]) {  //redraw all words
			for (word of words) {
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
		//check if focus changes
		if (document.hasFocus() && state["focused_players"][id]==false) {
			socket.emit('focus',true);
			focus = true;
		} else if (!document.hasFocus() && state["focused_players"][id]==true) {
			socket.emit('focus',false);
			focus = false;
		}
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

	socket.on('locked', function() {
		$("#login_msg").html("Game is currently locked");
	});

	socket.on('not_locked', function(name) {
		$("#login_back").hide();
		// console.log("not locked");
		id = name;
	});


	// // ELAN queue
	// socket.on('queue_refresh',function(obj){
	// 	queue = obj["queue"];
	// 	$("#typing_queue").html("");
	// 	for (name of obj["queue"]) {
	// 		$("#typing_queue").append(
	// 			"<p class='msg'>" + name + "</p>");
	// 	}
	// });




}); //end doc.ready







