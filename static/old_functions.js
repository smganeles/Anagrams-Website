function dict_promise1(word) {
  return new Promise (function(resolve, reject) {
    wordsapi = false;
    unirest.get("https://wordsapiv1.p.rapidapi.com/words/"+word)
      .header("x-rapidapi-host", "wordsapiv1.p.rapidapi.com")
      .header("x-rapidapi-key", "43be23b308msh403ea08483525a4p105ed7jsn35918a82996e")
      .end(function(res){
        // console.log("1done");
        if (!res.notFound) { //no 404 error
          resolve();
        } else {
          reject();
        }
      });
  });
}

function dict_promise2(word) {
  return new Promise (function(resolve,reject) {
    unirest.get('https://www.dictionaryapi.com/api/v3/references/collegiate/json/'+word+'?key=79ffc137-e40a-4e53-899e-b0e16fb1441b')
      .end(function(res){
        // console.log("2done");
        // console.log(res.body.length);
        if (!(typeof res.body[0]=="string")) { //word found in dictionary
          resolve();
        } else {
          reject();
        }
      });
  });
}

async function is_word(word) {
  try {
    await dict_promise1(word);
    return true;
  } catch (error) {
    try {
      await dict_promise2(word);
      return true;
    } catch (error) {
      return false;
    }
  }
}

function create_wordset() {
  fs.readFile('./static/wordlist.txt','utf8', function read(err, data) {
    if (err) {
      throw err;
    } else {
      x = new Set(data.split("\r\n"));
      return x;
    }
  });
}




function wait_until_free() {
  return new Promise (function(resolve,reject){
    var a = setInterval(function(){
      if (busy==false) {
        resolve();
      }
    },50);
    var b = setTimeout(function(){
      clearInterval(a);
      reject();
    },5000);
  });
}


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



    // socket.on('steal', async function(data) {
  //   var valid = true;
  //   if (busy==false) {
  //     busy = "stealing";
  //   } else {
  //     socket.emit('alert',busy+" in process");
  //     valid = false;
  //   }
  //   pause_flip();
  //   var word = data["new_word"].toUpperCase();
  //   var old_word = data["steal_word"].toUpperCase();
  //   var word_c = word.split('');
  //   if (valid==true) {  //dictionary check
  //     var x = await is_word(word);
  //     if (!x) {
  //       socket.emit('alert',"not a valid word");
  //       valid = false;
  //     }
  //   }
  //   if (valid==true) { //check that all old letters are used
  //     for (letter of old_word) { //take out all the letters in the old word
  //       if (word_c.includes(letter)) {
  //         const index = word_c.indexOf(letter);
  //         word_c.splice(index,1);
  //       } else {
  //         socket.emit('alert',"missing letters from original word");
  //         valid = false;
  //         break;
  //       }
  //     }
  //   }
  //   if (valid==true) { //check that new letters added
  //     if (word_c.length==0) {
  //       socket.emit('alert',"no new letters added");
  //       valid = false;
  //     }  
  //   }
  //   var extra_letters = word_c.slice();
  //   if (valid==true) { //check if all added letters are in the bank
  //     var letters = state["letter_bank"].slice();
  //     for (letter of word_c) {
  //       if (letters.includes(letter)) {
  //         const index = letters.indexOf(letter);
  //         letters.splice(index,1);
  //       } else {
  //         socket.emit('alert',"added letters not in the bank");
  //         valid = false;
  //         break;
  //       }
  //     }
  //   }
  //   if (valid==false){
  //     end_steal();
  //   } else {
  //     var p_from = data["player_from"];
  //     var p_to = data["player_to"];
  //     io.sockets.emit('approval',{
  //       "p_to": p_to,
  //       "msg": p_to +" wants to steal "+word+" from "+old_word+" ("+p_from+")"
  //     });
  //     var timer_list = [];
  //     for (i=0;i<61;i++){
  //       (function(i) {
  //         timer_list.push(setTimeout(function(){ 
  //           var all_approve = true;
  //           var all_disapprove = true;
  //           var apprv = "";
  //           var disapprv = "";
  //           for (player in approval) {
  //             if (player != p_to && active_players[player]==true) {
  //               if (approval[player] == null){
  //                 all_approve = false;
  //                 all_disapprove = false;
  //               }
  //               else if (approval[player] == false){
  //                 disapprv += " " + player;
  //                 all_approve = false;
  //               }
  //               else if (approval[player]==true){
  //                 apprv += " " + player;
  //                 all_disapprove = false;
  //               }
  //             }
  //           }
  //           if (all_approve == true){
  //             for (timer of timer_list) {
  //               clearTimeout(timer);
  //             }
  //             for (letter of extra_letters) {
  //               const index = state["letter_bank"].indexOf(letter);
  //               state["letter_bank"].splice(index,1);
  //             }
  //             state["players"][p_to].push(word);
  //             const index = state["players"][p_from].indexOf(old_word);
  //             state["players"][p_from].splice(index,1);
  //             io.sockets.emit('verdict',p_to+" steals "+word+" from "+old_word+" ("+p_from+")");
  //             end_steal();
  //           }
  //           else if (all_disapprove == true){
  //             for (timer of timer_list) {
  //               clearTimeout(timer);
  //             }
  //             io.sockets.emit('verdict',"all active players disapproved");
  //             end_steal();
  //           }
  //           else if (i==5 || (i>1 && i%10==0 && i<60)) {
  //             var waiting = "Waiting for Unanimous Decision</p> <p class='msg'>&ensp; Approves:"+apprv+"</p><p class='msg'>&ensp; Disapproves:"+disapprv;
  //             io.sockets.emit('msg',waiting);
  //           }
  //           else if (i==60) {
  //             io.sockets.emit('verdict',"Took too long, moving on")
  //             end_steal();            }
  //         }, 1500*i));
  //       })(i);
  //     }
  //   }
  // });



          //Method 2 for moving item to end of queue:
        let index;
        for (var i=0; i<typing_queue.length; i++) {
          if (typing_queue[i][0]==socket.id) {
            index = i;
          }
        }
        //will have error here if not on queue but timer still going
        typing_queue.push(typing_queue.splice(index,1)[0]);
        socket.emit("alert","took too long to type, moved to end of queue");


            //Method 2 for removing from queue
        // let index;
        // for (var i=0; i<typing_queue.length; i++) {
        //   if (typing_queue[i][0]==socket.id) {
        //     index = i;
        //   }
        // }
        // clearInterval(typing_queue[index][1]);
        // typing_queue.splice(index,1);
        // emit_queue();


//more old remove from queue function
  for (const [id,timer,word_start] of typing_queue) {
    if (id==socket_id && word_start==word) {
      clearInterval(timer);
    }
  }
  typing_queue = typing_queue.filter(function(item){
    return item[0] !== socket_id;
  });