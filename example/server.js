// A tiny node app that responds on the port numder in the file data/port.
// Note that since we rsync_exclude that folder you can have one in your
// git repository for testing in dev environments

var http = require('http');
var fs = require('fs');

// Get the port number from data/port. Watch out for trailing whitespace
// 'forever' may change the current working directory on us when we use a full path,
// so use __dirname to locate ourselves instead

var port;
try
{
  // In staging and production get the port number from stagecoach
  port = fs.readFileSync(__dirname + '/data/port', 'UTF-8').replace(/\s+$/, '');
} catch (err)
{
  // This is handy in a dev environment
  console.log("I see no data/port file, defaulting to port 3000");
  port = 3000;
}

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end("Hi there! I was deployed with stagecoach.\n");
}).listen(port, '127.0.0.1');
