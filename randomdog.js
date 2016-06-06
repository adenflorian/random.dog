const http = require('http');
const fs = require('fs');
const url = require('url');

const hostname = 'random.dog';
const port = 80;

const server = http.createServer((req, res) => {
	var request = url.parse(req.url, true);
	var action = request.pathname;
	console.log('NEW REQUEST: ' + getDateTime() + ' EST - NYC')
	console.log('requestor IP: ' + req.connection.remoteAddress);
	console.log('action: ' + action);

	if (action == '/robots.txt') {
		console.log('robots');
		try {
			var robots = fs.readFileSync('robots.txt');
			res.writeHead(200, {'Content-Type': 'text/plain' });
			res.end(robots);
		} catch(err) {
			res.writeHead(200, {'Content-Type': 'text/plain' });
			res.end('something borked');
		}
	} else if (action == '/woof') {
		try {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');

			var fileNames = fs.readdirSync('img');

			var randNum = Math.floor((Math.random() * fileNames.length));
			var fileName = fileNames[randNum];
			console.log('randNum: ' + randNum);
			console.log('fileName: ' + fileName);

			res.end(fileName);
		} catch(err) {
			res.writeHead(200, {'Content-Type': 'text/plain' });
			res.end('something borked');
		}
	} else if (action != '/') {
		try {
			var img = fs.readFileSync('img' + action);
			res.writeHead(200, {'Content-Type': 'image/jpg' });
			res.end(img, 'binary');
		} catch(err) {
			res.writeHead(200, {'Content-Type': 'text/plain' });
			res.end('something borked');
		}
	} else { 
		res.statusCode = 200;
		res.setHeader('Content-Type', 'text/html');

		var fileNames = fs.readdirSync('img');

		var randNum = Math.floor((Math.random() * fileNames.length));
		var fileName = fileNames[randNum];
		console.log('randNum: ' + randNum);
		console.log('fileName: ' + fileName);

		res.end('<html><p>Hello World, This Is Dog</p><p><img src=\'' + fileName + '\'></img></p><footer>@AdenFlorian</footer>');
	}
});

server.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;

}
