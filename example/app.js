// A tiny node app compatible with Stagecoach.

// Use express just to demonstrate that we can install npm modules
// on the remote server

var express = require('express');
var app = express();
var fs = require('fs');

// Get the port number from data/port. Watch out for trailing
// whitespace.

// 'forever' may change the current working directory on us when we
// use a full path, so use __dirname to locate ourselves instead

var port = process.env.PORT;
if (!port) {
  console.log('I see no PORT environment variable, defaulting to 3000');
  port = 3000;
}

app.get('/', function(req, res) {
  res.send("I was deployed with Stagecoach!");
});

app.listen(port);
