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
  animations: []
};

var id_to_players = {
}


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
  socket.on('new player', function() {
    // state[players][socket.id] = [];
    refresh();
  });

  socket.on('word_submit', function(data) {
    var valid = true;
    //TODO
    //check if word in dictionary
    //check if over 3 letters
    var word = data["word"].toUpperCase();
    var player = data["id"];
    var letters = state["letter_bank"].slice();
    for (letter of word) {
      if (letters.includes(letter)) { //remove it and continue iterating
        const index = letters.indexOf(letter);
        letters.splice(index,1);
      } else {
        socket.emit('alert',"not enough letters")
        valid = false;
        break
      }
    }
    if (valid == true) {
      state["letter_bank"] = letters;
      state["players"][player].push(word);
      io.sockets.emit('msg',player+" took "+word);
    }
    refresh();
  });

  socket.on('steal', function(data) {
    console.log(data);
    //1) if valid steal (1 or more extra letter), letters in word bank
    //2) if new word in dictionary
    //3) if not same root
    //then: player steals word
    refresh();
  });

});


function refresh() {
  io.sockets.emit('state', state);
  state["animations"] = [];
}