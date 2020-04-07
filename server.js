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

//////////////////////////////////////////

let wordset = new Set(fs.readFileSync(path.join(__dirname,'static/wordlist.txt'),'utf8').split("\n"));
let letters_rem = fs.readFileSync(path.join(__dirname,'static/letters.txt'),'utf8').split(",");
const tiles_list = fs.readFileSync(path.join(__dirname,'static/letters.txt'),'utf8').split(",");
let flip_timer = 8000;
let state = {
  letter_bank: [],
  players: {},
  active_players: {}
};
let approval = {};
let focused_players = {};
let id_to_player = {};
let busy = false;
let word_queue = [];
let stealing;
let flip_starttime;
let flip_pausetime;
let letter_flip;
let single_flip;
let flipping = false;
let chosen;
let typing_queue = [];
let submit_map = new Map();
let running_queue = false;


//////////////////////////////////////////

io.on('connection', function(socket) {
  socket.on('new_player', function(name) {
    if (isEmpty(state["players"])) {
      play_flip();
    }
    if (!state["players"].hasOwnProperty(name)) {
      state["players"][name.replace(/"/g, '')] = [];
    }
    state["active_players"][name] = true;
    approval[name] = null;
    id_to_player[socket.id]=name;
    if (stealing) {
      socket.emit('approval', {
      "p_to": "unsure",
      "msg": "stealing in process now"
      });
    }
    refresh();
  });

  socket.on('chat_upld',function(data){
    var sender;
    var msg;
    for (key in data) {
      sender = key;
      msg = data[key];
    }
    if (msg.slice(0,10) == "FLIP_SPEED") {
      var parsed_msg = msg.split(" ");
      flip_timer = parseInt(parsed_msg[parsed_msg.length-1]);
      pause_flip();
      play_flip();
    } 
    else if (msg.slice(0,6) == "PAUSE") {
      pause_flip();
    }
    else if (msg.slice(0,5) == "PLAY") {
      play_flip();
    }
    io.sockets.emit('chat',sender + ": " + msg);
  });

  socket.on('approve', function(id){ 
    approval[id]=true;
  });

  socket.on('disapprove', function(id){
    approval[id]=false;
    io.sockets.emit('msg',id_to_player[socket.id]+" disapproves");
  });

  socket.on('disconnect', function(){
    state["active_players"][id_to_player[socket.id]] = false;
    delete approval[id_to_player[socket.id]];
    delete id_to_player[socket.id];
    if (isEmpty(id_to_player)) {
      end_game();
    }
  });

  socket.on('word_submit', async function(sent_word) {
    var word = sent_word.toUpperCase();
    if (busy) {
      if (!stealing) {
        word_queue.push([word,socket]);
      } else {
        socket.emit('alert',"stealing in process");
      }
      return;
    } else {
      busy = true;
      pause_flip();
    }
    if (word.length<3) {
      socket.emit('alert',"word must be 3 letters or longer");
      end_word();
      return;
    }
    let x = await is_word(word);
    if (!x) { //not in dictionary
      socket.emit('alert',"not a valid word");
      end_word();
      return;
    }
    x = word_submit(word,socket);
    if (!x) { //word from bank
      end_word();
      return;
    } else {
      stealing = true;
      for (pair of word_queue) {
        pair[1].emit('alert',"stealing in process");
      }
      word_queue = [];
    }
    let p_to = id_to_player[socket.id];
    let p_from;
    let old_word;
    // if (Object.keys(x).length>1) {
    //   old_word = await which_word(x,socket);
    //   p_from = x[old_word];
    // } else {
    for (key in x) { //choose the last one
      old_word = key;
      p_from = x[key];
    }
    // }
    steal_approval(p_from,p_to,old_word,word,socket.id);
  });

  socket.on('chosen',function(word){
    chosen = word;
  });

  socket.on('focus',function(bool){
    focused_players[id_to_player[socket.id]] = bool;
  });

  // //ELAN
  // socket.on('word_submit_v2', async function(sent_word){
  //   for (const [socket_id,timer] of typing_queue) {
  //     if (socket.id==socket_id) {
  //       clearInterval(timer);
  //     }
  //   }
  //   var word = sent_word.toUpperCase();
  //   if (stealing) {
  //     socket.emit("alert","stealing in process");
  //     rmv_from_queue(socket.id);
  //     return;
  //     // if (!typing_queue.includes(socket)) {
  //     //   socket.emit('alert',"stealing in process")
  //     // }
  //   }
  //   if (word.length<3) {
  //     socket.emit('alert',"word must be 3 letters or longer");
  //     rmv_from_queue(socket.id);
  //     return;
  //   }
  //   let x = await is_word(word);
  //   if (!x) { //not in dictionary
  //     socket.emit('alert',"not a valid word");
  //     rmv_from_queue(socket.id);
  //     return;
  //   }
  //   submit_map.set(socket.id,word);
  //   run_queue();
  // });

  // //ELAN
  // socket.on('add_to_queue',function(){
  //   console.log(typing_queue);
  //   let on_queue = false;
  //   for (const [socket_id,timer] of typing_queue) {
  //     if (socket.id==socket_id) {
  //       on_queue = true;
  //     }
  //   }
  //   if (stealing) {
  //     socket.emit("alert","stealing in process");
  //     return;
  //   }
  //   else if (!on_queue){
  //     var x = setInterval(function(){
  //       //Method: delete item where it is, move it to end of list
  //       // typing_queue = typing_queue.filter(function(item){
  //       //   return item[0] !== socket.id;
  //       // });
  //       // typing_queue.push([socket.id,x]);
  //       // socket.emit("alert","took too long to type, moved to end of queue");
  //       //this method might allow too much time between destroy and replace
        
  //       //Method 2:
  //       let index;
  //       for (var i=0; i<typing_queue.length; i++) {
  //         if (typing_queue[i][0]==socket.id) {
  //           index = i;
  //         }
  //       }
  //       //will have error here if not on queue but timer still going
  //       typing_queue.push(typing_queue.splice(index,1)[0]);
  //       socket.emit("alert","took too long to type, moved to end of queue");
  //       emit_queue();
  //     },3000);
  //     typing_queue.push([socket.id,x]);
  //     emit_queue();
  //   } 
  //   else {
  //     socket.emit('alert',"already submitted word");
  //   }
  // });

  // //ELAN
  // socket.on('remove_from_queue',function(){
  //   for (const [socket_id,timer] of typing_queue) {
  //     if (socket.id==socket_id) {
  //       clearInterval(timer);
  //     }
  //   }
  //   rmv_from_queue(socket.id);

  //   // let index;
  //   // for (var i=0; i<typing_queue.length; i++) {
  //   //   if (typing_queue[i][0]==socket.id) {
  //   //     index = i;
  //   //   }
  //   // }
  //   // clearInterval(typing_queue[index][1]);
  //   // typing_queue.splice(index,1);
  //   // emit_queue();

  // });

});

//////////////////////////////////////////

function refresh() {
  io.sockets.emit('state', state);
}

function null_approval() {
  for (player in approval) {
    approval[player] = null;
  }
}

function end_word() {
  busy = false;
  if (word_queue.length>0) {
    word_queue[0][1].emit('word_submit',word_queue[0][0]); //run_queue;
  }
  play_flip();
}

//ELAN
function rmv_from_queue(socket_id) {
  typing_queue = typing_queue.filter(function(item){
    return item[0] !== socket_id;
  });
  emit_queue();
}

//ELAN
function emit_queue() {
  let queue = [];
  for (const [socket_id,timer] of typing_queue){
    queue.push(id_to_player[socket_id]);
  }
  io.sockets.emit('queue_refresh',{"queue":queue});
}

function end_steal() {
  busy = false;
  stealing = false;
  null_approval();
  play_flip();
  refresh();
}

function pause_flip() {
  if (flipping) {
    flip_pausetime = Date.now();
  }
  clearTimeout(single_flip);
  clearInterval(letter_flip);
  flipping = false;
}

function play_flip() {
  if (!flipping) { //otherwise mutiple calls will mess up "remaining"
    flipping = true;
    remaining = flip_timer - (flip_pausetime - flip_starttime);
    single_flip = setTimeout(function() {
      flip_starttime = Date.now();
      flip_letter();
      letter_flip = setInterval(function() {  //letter flipping
        flip_starttime = Date.now();
        flip_letter();
        if (letters_rem.length == 0){
          count_points();
        }
      }, flip_timer);
    }, remaining);
  }
}

function flip_letter(num_remain) {
  var num_remain = letters_rem.length;
  if (num_remain>0) {
    var rand_idx = Math.floor(Math.random()*num_remain);
    var letter = letters_rem[rand_idx];
    letters_rem.splice(rand_idx,1);
    state["letter_bank"].push(letter);
    refresh();
  } 
}

function count_points() {
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
  flip_timer = 8000;
  pause_flip();
  state = {
    letter_bank: [],
    players: {},
    active_players: {}
  };
  approval = {};
  id_to_player = {};
  busy = false;
  letters_rem = tiles_list.slice();
}

function steal_approval(p_from, p_to, old_word, new_word, socket_id) {
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
      if (player != p_to && focused_players[player]==true) {
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
      var index;
      clearInterval(x);
      var extra_letters = new_word.split('');
      for (letter of old_word.split('')) {
        index = extra_letters.indexOf(letter);
        extra_letters.splice(index,1);
      }
      for (letter of extra_letters) {
        index = state["letter_bank"].indexOf(letter);
        state["letter_bank"].splice(index,1);
      }
      state["players"][p_to].push(new_word);
      index = state["players"][p_from].indexOf(old_word);
      state["players"][p_from].splice(index,1);
      io.sockets.emit('verdict',p_to+" steals "+new_word+" from "+old_word+" ("+p_from+")");
      end_steal();
      rmv_from_queue(socket_id);
    }
    else if (all_disapprove == true){
      clearInterval(x);
      io.sockets.emit('verdict',"all active players disapproved"); //really, focused players
      end_steal();
      rmv_from_queue(socket_id);
    }
    else if (i==5 || (i>1 && i%10==0 && i<60)) {
      var waiting = "Waiting for Unanimous Decision</p> <p class='msg'>&ensp; Approves:"+apprv+"</p><p class='msg'>&ensp; Disapproves:"+disapprv;
      io.sockets.emit('msg',waiting);
    }
    else if (i==60) {
      clearInterval(x);
      io.sockets.emit('verdict',"Took too long, moving on")
      end_steal();
      rmv_from_queue(socket_id);
    }
  }, 1000);
}

function word_submit (sent_word, socket) {
  var player = id_to_player[socket.id];
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
    state["players"][player].push(sent_word);
    io.sockets.emit('msg',player+" took "+sent_word);
    refresh();
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
      if (contains) {
        if (word_big.length==0) {
          socket.emit('alert',"No new letters added to steal")
          return 
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
      }
      if (contains) {
        words_that_fit[word_2] = player_from;
      }
    }
  }
  if (isEmpty(words_that_fit)) {
    socket.emit('alert',"Not in bank and no word to steal from")
    return;
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


//ELAN
function run_queue () {
  if (submit_map.has(typing_queue[0][0]) && !stealing && !running_queue) {
    var socket_id = typing_queue[0][0];
    var word = submit_map.get(socket_id);
    running_queue = true;
    let socket = io.of(null || "/").connected[socket_id];
    x = word_submit(word,socket);
    if (!x) { //word from bank
      typing_queue.shift();
      emit_queue();
      submit_map.delete(socket_id);
      running_queue = false;
      if (typing_queue.length > 0) {
        run_queue();
      }
      return;
    } else {
      stealing = true;
      
      //clear queue and list!
      for (const [socket_id,timer] of typing_queue) {
        clearInterval(timer);
      }
      typing_queue = [];
      io.sockets.emit('queue_refresh',{"queue":[]});
      submit_map = new Map();

      let p_to = id_to_player[socket_id];
      let p_from;
      let old_word;
      // if (Object.keys(x).length>1) {
      //   old_word = await which_word(x,socket);
      //   p_from = x[old_word];
      // } else {
      for (key in x) { //choose the last one
        old_word = key;
        p_from = x[key];
      }
      // }
      pause_flip();
      steal_approval(p_from,p_to,old_word,word,socket_id);
    }
  }
}



//start typing during steal, wont be recorded