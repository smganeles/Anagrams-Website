var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var unirest = require('unirest');

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
	response.sendFile(path.join(__dirname, 'pages/index.html'));
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
var state = {
  letter_bank: [],
  players: {},
};
var approval = {};
var active_players = {};
var id_to_player = {};
var busy = false;
var letter_flip;

io.on('connection', function(socket) {
  socket.on('new_player', function(name) {
    // console.log(active_players);
    // console.log(state);
    if (isEmpty(state["players"])) {
      play_flip();
    }
    if (!state["players"].hasOwnProperty(name)) { //always true, cause will only send new_player if really new
      state["players"][name] = [];
    }
    active_players[name] = true;
    approval[name] = null;
    id_to_player[socket.id]=name;
    refresh();
  });

  socket.on('chat_upld',function(msg){
    io.sockets.emit('chat',msg);
  });

  socket.on('word_submit', async function(data) {
    var valid = true;
    var word = data["word"].toUpperCase();
    if (busy) {
      socket.emit('alert',busy + " in process");
      valid = false;
    }
    if (valid==true) {
      if (word.length<3) {
        socket.emit('alert',"word must be 3 letters or longer");
        valid = false;
      }
    }
    if (valid==true) {  //dictionary check
      x = await is_word(word);
      if (!x) {
        socket.emit('alert',"not a valid word");
        valid = false;
      }
    }
    if (valid==true) { //check if all letters in the letter bank
      var letters = state["letter_bank"].slice();
      for (letter of word) {
        if (letters.includes(letter)) { //remove it and continue iterating
          const index = letters.indexOf(letter);
          letters.splice(index,1);
        } else {
          socket.emit('alert',"those letters not in the bank");
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

  socket.on('steal', async function(data) {
    var valid = true;
    var word = data["new_word"].toUpperCase();
    var old_word = data["steal_word"].toUpperCase();
    if (busy) {
      socket.emit('alert',busy + " in process");
      valid = false;
    }
    if (valid==true) {  //dictionary check
      x = await is_word(word);
      if (!x) {
        socket.emit('alert',"not a valid word");
        valid = false;
      }
    }
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
      busy = "stealing";
      pause_flip();
      var p_from = data["player_from"];
      var p_to = data["player_to"];
      io.sockets.emit('approval',{
        "p_to": p_to,
        "msg": p_from +" wants to steal "+word+" from "+old_word+" ("+p_to+")"
      });
      var timer_list = [];
      for (i=0;i<61;i++){
        (function(i) {
          timer_list.push(setTimeout(function(){ 
            var all_approve = true;
            var all_disapprove = true;
            var apprv = "";
            var disapprv = "";
            for (player in approval) {
              if (player != p_to && active_players[player]==true) {
                if (approval[player] == null){
                  all_approve = false;
                  all_disapprove = false;
                }
                else if (approval[player] == false){
                  disapprv += " " + player;
                  all_approve = false;
                }
                else if (approval[player]==true){
                  disapprv += " " + player;
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
              io.sockets.emit('verdict',p_from+" steals "+word+" from "+old_word+" ("+p_to+")");
              end_steal();
            }
            else if (all_disapprove == true){
              for (timer of timer_list) {
                clearTimeout(timer);
              }
              io.sockets.emit('verdict',"all active players disapproved");
              end_steal();
            }
            else if (i==5 || (i>1 && i%10==0 && i<60)) {
              var waiting = "Waiting for Unanimous Decision</p> <p class='msg'>&ensp; Approves:"+apprv+"</p><p class='msg'>&ensp; Disapproves:"+disapprv;
              io.sockets.emit('msg',waiting);
            }
            else if (i==60) {
              io.sockets.emit('verdict',"Took too long, moving on")
              end_steal();            }
          }, 1500*i));
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

  socket.on('disconnect', function(){
    active_players[id_to_player[socket.id]] = false;
    delete id_to_player[socket.id];
  })

});


function refresh() {
  io.sockets.emit('state', state);
}

function null_approval() {
  for (player in approval) {
    approval[player] = null;
  }
}

function pause_flip() {
  clearInterval(letter_flip);
}

function end_steal() {
  busy = false;
  null_approval();
  play_flip();
  refresh();
}

function play_flip() {
  letter_flip = setInterval(function() {  //letter flipping
    var num_remain = letters_rem.length;
    if (num_remain > 0) {
      var rand_idx = Math.floor(Math.random()*num_remain);
      var letter = letters_rem[rand_idx];
      letters_rem.splice(rand_idx,1);
      state["letter_bank"].push(letter);
      refresh();
    }
  }, flip_timer);
}

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

function dict_promise(word) {
  return new Promise (function(resolve, reject) {
    unirest.get("https://wordsapiv1.p.rapidapi.com/words/"+word)
      .header("x-rapidapi-host", "wordsapiv1.p.rapidapi.com")
      .header("x-rapidapi-key", "43be23b308msh403ea08483525a4p105ed7jsn35918a82996e")
      .end(function(res){
        if (res.notFound) {
          reject ('404');
        } else {
          resolve (res.body)
        }
      });
  });
}

async function is_word(word) {
  try {
    await dict_promise(word);
    return true;
  } catch (error) {
    return false;
  }
}