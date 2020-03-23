var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

app.set('port',5000);
app.use('/static', express.static(__dirname + '/static')); //Routing
server.listen(5000, function() {
  console.log('Starting server on port 5000');
});

///////////////////////////////////////////

app.get('/', function(request,response){
	response.sendFile(path.join(__dirname, 'pages/login.html'));
}); 

app.get('/game', function(req,res){
  res.sendFile(path.join(__dirname, 'pages/index.html'))
});


//////////////////////////////////////////

// let letters_rem = {
//   A: 13, B: 3, C: 3, D: 6, E: 18, F: 3, G: 4, H: 3, I: 12,
//   J: 2, K: 2, L: 5, M: 3, N: 8, O: 11, P: 4, Q: 2, R: 9,
//   S: 6, T: 9, U: 6, V: 3, W: 3, X: 2, Y: 3, Z: 2
// }
let letters_rem = [
  "A","A","A","A","A","A","A","A","A","A","A","A","A",
  "B","B","B",
  "C","C","C",
  "D","D","D","D","D","D",
  "E","E","E","E","E","E","E","E","E","E","E","E","E","E","E","E","E","E",
  "F","F","F",
  "G","G","G","G",
  "H","H","H",
  "I","I","I","I","I","I","I","I","I","I","I","I",
  "J","J",
  "K","K",
  "L","L","L","L","L",
  "M","M","M",
  "N","N","N","N","N","N","N","N",
  "O","O","O","O","O","O","O","O","O","O","O",
  "P","P","P","P",
  "Q","Q",
  "R","R","R","R","R","R","R","R","R",
  "S","S","S","S","S","S",
  "T","T","T","T","T","T","T","T","T",
  "U","U","U","U","U","U",
  "V","V","V",
  "W","W","W",
  "X","X",
  "Y","Y","Y",
  "Z","Z"]

var flip_timer = 10000;

// var state = {
//   letter_bank: [],
//   players: {},
//   animations: []
// };

var state = {
  letter_bank: [],
  players: {
    Simon: ["QUA","HOLA","HELLO"],
    Elan: ["ACUTE", "WHELP"],
    Gabi: ["MILK","EGGS", "CEREAL"],
    Fourth: ["PURPLE","KNIFE","KNIGHT","REDEWIFENER"]
  },
};

var id_to_players = {
}

var approval = {
  Simon: null,
  Elan: null,
  Gabi: null,
  Fourth: null
}

var active_players = {
  Simon: true,
  Elan: true,
  Gabi: true,
  Fourth: true
};

var busy = false;


setInterval(function() {  //letter flipping
  var num_remain = letters_rem.length;
  if (num_remain > 0) {
    var rand_idx = Math.floor(Math.random()*num_remain);
    var letter = letters_rem[rand_idx];
    letters_rem.splice(rand_idx,1);
    state["letter_bank"].push(letter);
    refresh();
  }
}, flip_timer);



io.on('connection', function(socket) {
  socket.on('new player', function(name) {
    // state[players][socket.id] = [];
    state["players"][name] = [];
    refresh();
  });

  socket.on('chat_upld',function(msg){
    io.sockets.emit('chat',msg);
  });

  socket.on('word_submit', function(data) {
    var valid = true;
    if (busy) {
      socket.emit('alert',busy + " in process");
      valid = false;
    }

    var word = data["word"].toUpperCase();
    if (valid==true) {
      if (word.length<3) {
        socket.emit('alert',"word must be 3 letters or longer");
        valid = false;
      }
    }

    //TODO
    //check if word in dictionary

    if (valid==true) { //check if all letters in the letter bank
      var letters = state["letter_bank"].slice();
      for (letter of word) {
        if (letters.includes(letter)) { //remove it and continue iterating
          const index = letters.indexOf(letter);
          letters.splice(index,1);
        } else {
          socket.emit('alert',"not enough letters in bank");
          valid = false;
          break;
        }
      }
    }
    if (valid == true) {
      var player = data["id"];
      state["letter_bank"] = letters;
      state["players"][player].push(word);
      io.sockets.emit('msg',player+" took "+word);
    }
    refresh();
  });

  socket.on('steal', function(data) {
    var valid = true;
    if (busy) {
      socket.emit('alert',busy + " in process");
      valid = false;
    }
    busy = "stealing";
    var word = data["new_word"].toUpperCase();
    var old_word = data["steal_word"].toUpperCase();

    //TODO
    //check if word in dictionary

    if (valid==true) { //check that all old letters are used
      var word_c = word.split('');
      for (letter of old_word) { //take out all the letters in the old word
        if (word_c.includes(letter)) {
          const index = word_c.indexOf(letter);
          word_c.splice(index,1);
        } else {
          socket.emit('alert',"missing letters from original word");
          valid = false;
          break;
        }
      }
    }
    if (valid==true) { //check that new letters added
      if (word_c.length==0) {
        socket.emit('alert',"no new letters added");
        valid = false;
      }  
    }
    if (valid==true) { //check if all added letters are in the bank
      var letters = state["letter_bank"].slice();
      for (letter of word_c) {
        if (letters.includes(letter)) {
          const index = letters.indexOf(letter);
          letters.splice(index,1);
        } else {
          socket.emit('alert',"added letters not in the bank");
          valid = false;
          break;
        }
      }
    }
    if (valid==true) {
      var p_from = data["player_from"];
      var p_to = data["player_to"];
      io.sockets.emit('approval',p_from +" wants to steal "+word+" from "+p_to);
      //pause the flip timer
      for (i=0;i<30;i++){
        (function(i) {
          var timer_list = []
          timer_list.push(setTimeout(function(){ 
            var all_approve = true;
            var all_disapprove = true;
            for (player in approval) {
              if (player != p_to && active_players[player]==true) {
                if (approval[player] === false){
                  all_approve = false;
                }
                else if (approval[player]==true){
                  all_disapprove = false;
                }
              }
            }
            if (all_approve == true){
              for (timer of timer_list) {
                clearTimeout(timer);
              }
              state["players"][p_to].push(word);
              const index = state["players"][p_from].indexOf(old_word);
              state["players"][p_from].splice(index,1);
              io.sockets.emit('verdict',p_from+" steals "+word+" from "+p_to);
              refresh();
              busy = false;
            }
            else if (all_disapprove == true){
              for (timer of timer_list) {
                clearTimeout(timer);
              }
              io.sockets.emit('verdict',"all active players disapproved");
              busy = false;
            }
          }, 1000*i));
        })(i);
      }
    }
  });

  socket.on('approve', function(id){ 
    approval[id]=true;
  });

  socket.on('disapprove', function(id){
    approval[id]=false;
    io.sockets.emit('msg',player+" disapproves");
  });

});


function refresh() {
  io.sockets.emit('state', state);
}