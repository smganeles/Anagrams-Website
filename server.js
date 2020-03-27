var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var unirest = require('unirest');
var fs = require('fs');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

const PORT = process.env.PORT || 5000;

app.set('port',PORT);
app.use('/static', express.static(__dirname + '/static')); //Routing
server.listen(PORT, function() {
  console.log('Starting server on port 5000');
});


///////////////////////////////////////////

app.get('/', function(request,response){
	response.sendFile(path.join(__dirname, 'pages/index.html'));
}); 

app.get('/restart', function(req,res){
  end_game();
  res.redirect('/');
});

// app.get('/lookup/', function(request,response){
//   var word = request.query["word"];
//   console.log(word);
//   app.get('http://www.dictionaryapi.com/api/v3/references/collegiate/json/'+word+'?key=79ffc137-e40a-4e53-899e-b0e16fb1441b',function(req,res){
//     console.log(res.body);
//   });
// });
//////////////////////////////////////////

// let letters_rem = {
//   A: 13, B: 3, C: 3, D: 6, E: 18, F: 3, G: 4, H: 3, I: 12,
//   J: 2, K: 2, L: 5, M: 3, N: 8, O: 11, P: 4, Q: 2, R: 9,
//   S: 6, T: 9, U: 6, V: 3, W: 3, X: 2, Y: 3, Z: 2
// }


var wordset = new Set(fs.readFileSync(path.join(__dirname,'static/wordlist.txt'),'utf8').replace("\r\n").split("\n"));
//only works non-locally (local split is "\r\n")

var letters_rem = [
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
  "Z","Z"];

// var letters_copy = letters_rem.slice();
var letters_copy = [
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
  "Z","Z"];



var flip_timer = 1000;
var state = {
  letter_bank: [],
  players: {},
};
var approval = {};
var active_players = {};
var id_to_player = {};
var busy = false;
var letter_flip;
var word_queue = [];
var chosen;


io.on('connection', function(socket) {
  socket.on('new_player', function(name) {
    if (isEmpty(state["players"])) {
      play_flip();
    }
    if (!state["players"].hasOwnProperty(name)) {
      state["players"][name.replace(/"/g, '')] = [];
    }
    active_players[name] = true;
    approval[name] = null;
    id_to_player[socket.id]=name;
    refresh();
  });

  socket.on('chat_upld',function(msg){
    io.sockets.emit('chat',msg);
    // io.sockets.emit('msg',"wordset size"+wordset.size);
  });

  // socket.on('word_submit', async function(data) {
  //   var valid = true;
  //   if (busy) {
  //     socket.emit('alert',busy + " in process");
  //     valid = false;
  //   }
  //   var word = data["word"].toUpperCase();
  //   if (valid==true) {
  //     if (word.length<3) {
  //       socket.emit('alert',"word must be 3 letters or longer");
  //       valid = false;
  //     }
  //   }
  //   if (valid==true) {  //dictionary check
  //     var x = await is_word(word);
  //     if (!x) {
  //       socket.emit('alert',"not a valid word");
  //       valid = false;
  //     }
  //   }
  //   if (valid==true) { //check if all letters in the letter bank
  //     var letters = state["letter_bank"].slice();
  //     for (letter of word) {
  //       if (letters.includes(letter)) { //remove it and continue iterating
  //         const index = letters.indexOf(letter);
  //         letters.splice(index,1);
  //       } else {
  //         socket.emit('alert',"those letters not in the bank");
  //         valid = false;
  //         break;
  //       }
  //     }
  //   }
  //   if (valid == true) {
  //     var player = data["id"];
  //     state["letter_bank"] = letters;
  //     state["players"][player].push(word);
  //     io.sockets.emit('msg',player+" took "+word);
  //   }
  //   refresh();
  // });

  socket.on('steal', async function(data) {
    var valid = true;
    if (busy==false) {
      busy = "stealing";
    } else {
      socket.emit('alert',busy+" in process");
      valid = false;
      // try {
      //   await wait_until_free();
      // } catch {
      //   io.sockets.emit('alert',"Busy too long; Something is wrong");
      //   valid=false;
      // }
    }
    pause_flip();
    var word = data["new_word"].toUpperCase();
    var old_word = data["steal_word"].toUpperCase();
    var word_c = word.split('');
    if (valid==true) {  //dictionary check
      var x = await is_word(word);
      if (!x) {
        socket.emit('alert',"not a valid word");
        valid = false;
      }
    }
    if (valid==true) { //check that all old letters are used
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
    var extra_letters = word_c.slice();
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
    if (valid==false){
      end_steal();
    } else {
      var p_from = data["player_from"];
      var p_to = data["player_to"];
      io.sockets.emit('approval',{
        "p_to": p_to,
        "msg": p_to +" wants to steal "+word+" from "+old_word+" ("+p_from+")"
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
                  apprv += " " + player;
                  all_disapprove = false;
                }
              }
            }
            if (all_approve == true){
              for (timer of timer_list) {
                clearTimeout(timer);
              }
              for (letter of extra_letters) {
                const index = state["letter_bank"].indexOf(letter);
                state["letter_bank"].splice(index,1);
              }
              state["players"][p_to].push(word);
              const index = state["players"][p_from].indexOf(old_word);
              state["players"][p_from].splice(index,1);
              io.sockets.emit('verdict',p_to+" steals "+word+" from "+old_word+" ("+p_from+")");
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
    io.sockets.emit('msg',id_to_player[socket.id]+" disapproves");
  });

  socket.on('disconnect', function(){
    active_players[id_to_player[socket.id]] = false;
    delete id_to_player[socket.id];
    // console.log(active_players);
    // console.log(id_to_player);
    if (isEmpty(id_to_player)) {
      end_game();
    }
  });

  socket.on('word_submit', async function(sent_word) {
    var word = sent_word.toUpperCase();
    if (busy) {
      word_queue.push([word,socket]);
      return;
    } else {
      busy = true;
    }
    if (word.length<3) {
      socket.emit('alert',"word must be 3 letters or longer");
      return;
    }
    var x = await is_word(word);
    if (!x) {
      socket.emit('alert',"not a valid word");
      return;
    }
    console.log('bout to submit');
    x = word_submit(word,socket);
    if (!x) {
      queue[0][1].emit('word_submit',queue[0][0]);
      return;
    } else {
      for (pair of word_queue) {
        pair[0].emit('alert',"stealing in process");
      }
      word_queue = [];
    }
    var p_to = id_to_player[socket.id];
    var p_from;
    var old_word;
    if (Object.keys(x).length>1) {
      old_word = await which_word(x,socket);
      p_from = x[old_word];
    }
    steal_approval(p_from,p_to,old_word,word);
  });

  socket.on('chosen',function(word){
    chosen = word;
  });
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
  clearInterval(letter_flip);
  letter_flip = setInterval(function() {  //letter flipping
    var num_remain = letters_rem.length;
    if (num_remain > 0) {
      var rand_idx = Math.floor(Math.random()*num_remain);
      var letter = letters_rem[rand_idx];
      letters_rem.splice(rand_idx,1);
      state["letter_bank"].push(letter);
      refresh();
    } 
    else if (num_remain == 0){
      io.sockets.emit('msg',"GAME HAS ENDED!!");
      for (player in state["players"]) {
        io.sockets.emit('msg', player+ ":");
        var total=0;
        for (word of state["players"][player]) {
          total += word.length-2; 
        }
        io.sockets.emit('msg',"&ensp;"+total+" Points");
      }
    }
  }, flip_timer);
}

function isEmpty(obj) {
  for(var key in obj) {
    if(obj.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
}

function scrabbledict_promise(word) {
  return new Promise (function(resolve,reject){
    if (wordset.has(word)) {
      resolve();
    } else {
      reject();
    }
  });
}

async function is_word(word) {
  try {
    await scrabbledict_promise(word);
    return true;
  } catch (error) {
    return false;
  }
}

function end_game() {
  pause_flip();
  state = {
    letter_bank: [],
    players: {},
  };
  approval = {};
  active_players = {};
  id_to_player = {};
  busy = false;
  letters_rem = letters_copy;
}

function steal_approval(p_from, p_to, old_word, new_word) {
  io.sockets.emit('approval',{
    "p_to": p_to,
    "msg": p_to +" wants to steal "+new_word+" from "+old_word+" ("+p_from+")"
  });
  var i = 0;
  var x = setInterval(function(){
    i+=1;
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
          apprv += " " + player;
          all_disapprove = false;
        }
      }
    }
    if (all_approve == true){
      clearInterval(x);
      for (letter of extra_letters) {
        const index = state["letter_bank"].indexOf(letter);
        state["letter_bank"].splice(index,1);
      }
      state["players"][p_to].push(new_word);
      const index = state["players"][p_from].indexOf(old_word);
      state["players"][p_from].splice(index,1);
      io.sockets.emit('verdict',p_to+" steals "+word+" from "+old_word+" ("+p_from+")");
      end_steal();
    }
    else if (all_disapprove == true){
      clearInterval(x);
      io.sockets.emit('verdict',"all active players disapproved");
      end_steal();
    }
    else if (i==5 || (i>1 && i%10==0 && i<60)) {
      var waiting = "Waiting for Unanimous Decision</p> <p class='msg'>&ensp; Approves:"+apprv+"</p><p class='msg'>&ensp; Disapproves:"+disapprv;
      io.sockets.emit('msg',waiting);
    }
    else if (i==60) {
      clearInterval(x);
      io.sockets.emit('verdict',"Took too long, moving on")
      end_steal();
    }
  }, 1000);
}



function word_submit (sent_word, socket) {
  var player = id_to_player[socket.it];
  var word = sent_word.split("");
  var letter_bank = state["letter_bank"].slice();
  var in_bank = true;
  for (letter of word) {
    if (letter_bank.includes(letter)) {
      var index = letter_bank.indexOf(letter);
      letter_bank.splice(index,1);
    } else {
      in_bank = false;
      break;
    }
  }
  if (in_bank) {
    state["letter_bank"] = letter_bank;
    state["players"][player].push(word);
    io.sockets.emit('msg',player+" took "+word);
    return;
  }
  var words_that_fit = {};  //player:word_that_can_steal;
  for (player_from in state["players"]) {
    for (word_2 of state["players"][player_from]) {
      var word_small = word_2.split("");
      var word_big = word.slice();
      var contains = true; //sent_word contains word_small
      for (letter of word_small) {
        if (word_big.includes(letter)) {
          var index = word_big.indexOf(letter);
          word_big.splice(index,1);
        } else {
          contains = false;
          break;
        }
      }
      if (contains) { //check if rest of word in letter_bank
        letter_bank = state["letter_bank"].slice();
        for (letter of word_big) {
          if (letter_bank.includes(letter)) {
            var index = letter_bank.indexOf(letter);
            letter_bank.splice(index,1);
          } else {
            contains = false;
            break;
          }
        }
        if (contains) {
          words_that_fit[word_2] = player_from;
        }
      }
    }
  }
  if (isEmpty(words_that_fit)) {
    socket.emit('alert',"Not in bank and no word to steal from")
    return;
  } else if (Object.keys(words_that_fit).length==1) {
    return words_that_fit;
  } else {
    return words_that_fit;
  }
}

function which_word(obj,socket) {
  socket.emit('choose',obj);
  return new Promise(resolve => 
    setInterval(function(){
      if (chosen) {
        resolve();
      }
    },500));
}

// function timeout(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }