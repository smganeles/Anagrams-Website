var http = require('http');
var dt = require('./firstmodule');
var url = require('url');
var fs = require('fs'); //files
var uc = require('upper-case');
var events = require('events');
var formidable = require('formidable');

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  // res.write("the date and time are currently: " + dt.myDateTime());
  // res.write(req.url);
  var q = url.parse(req.url, true).query;
  var txt = q.year + " " + q.month;
  res.end(txt);
}).listen(8080);


http.createServer(function (req, res) {
	// fs.readFile('demofile.html', function(err,data){
	// 	res.writeHead(200, {"Content-Type": "text/html"});
	// 	res.write(data);
	// 	res.end();
	// });
	// res.writeHead(200, {"Content-Type": "text/html"});
	// res.write("THIS FILE");
	// res.end();

	// fs.appendFile("newfile1.txt", "hello content!", function (err) {
	// 	if (err) throw err;
	// 	console.log('file saved!');
	// });

	// fs.open('newfile2.txt', 'w', function (err,file) {
	// 	if (err) throw err;
	// 	console.log("open saved!");
	// });

	// fs.writeFile('newfile3.txt', "Hello Content!!!!", function (err) {
	// 	if (err) throw err;
	// 	console.log("saved num 3");
	// });

	// fs.unlink('newfile1.txt', function (err) {
	// 	if (err) throw err;
	// 	console.log("FILE DELETED!!!");
	// });

	console.log(req.url);

	var q = url.parse(req.url, true);
	var filename = "." + q.pathname;
	fs.readFile(filename, function(err,data) {
		if (err) {
			res.writeHead(404, {"Content-Type": "text/html"});
			return res.end("404 Not Found")
		}
		res.writeHead(200, {"Content-Type": "text/html"});
		res.write(data);
		res.write(uc.upperCase("hello"));
		return res.end();
	})

}).listen(8090);


var eventEmitter = new events.EventEmitter();


http.createServer(function (req, res){
	if (req.url == "/fileupload") {
		var form = new formidable.IncomingForm();
		form.parse(req, function (err, fields, files) {
			var oldpath = files.filetoupload.path;
			var newpath = 'C:/Users/smgan/Google Drive/College (freshman - senior)/Projects' + files.filetoupload.name;
			fs.rename(oldpath, newpath, function (err) {
				if (err) throw err;
				res.write('File uploaded and moved!');
				res.end();
			});
		});
	} else {
		// res.writeHead(200, {"Content-Type": "text/html"});
		// res.write(uc.upperCase("Hello World!"));
		// res.end();

		// var readStream = fs.createReadStream('./demofile.html');
		// readStream.on('open', function() {
		// 	console.log('The file is open');
		// });

		// var myEventHandler = function() {
		// 	console.log("i hear a scream!");
		// }
		// eventEmitter.on("scream", myEventHandler);
		// eventEmitter.emit('scream');

		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write('<form action="fileupload" method="post" enctype="multipart/form-data">');
		res.write('<input type="file" name="filetoupload"><br>');
		res.write('<input type="submit">');
		res.write('</form>');
		return res.end();
	}

}).listen(8100);

