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