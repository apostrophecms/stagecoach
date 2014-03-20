// You should edit config.js (start by copying config-example.js)
var config = require('./config');

var fs = require('fs');
var http = require('http');
var httpProxy = require('http-proxy');

var options = {};

options = rebuildRouter(false);

fs.watch(config.appsDir, {
  persistent: true
}, resetRouter);

setInterval(resetRouter, 60000);

var proxyServer = httpProxy.createServer();

require('http').createServer(function(req, res) {
  // quick and dirty fix, to be sure its running...
  // implement https, and some switches for new http-proxy functions

  try {
    proxyServer.web(req, res, {
      target: 'http://' + options[req.headers.host]
    }, function(err) {
      console.log("unexpected error: " + err);
    });
  } catch (err) {

  }
}).listen(config.port, config.bindIp);


function resetRouter() {
  var router = rebuildRouter(true);
  if (!router) {
    // Try again in a bit, failure to read the port files typically means a deployment is
    // in progress
    setTimeout(resetRouter, 2000);
    return;
  }

  options = router;
}

// Rebuild the routes, at startup or in response to a change.
// If failQuickly is true, return false as soon as we hit a port file
// we can't read or parse, so we can retry. If failQuickly is false,
// just keep going and return the best result we can (more appropriate
// at startup). We also read an optional hosts file containing hostnames
// that should be routed to this site, which allows production hosting

function rebuildRouter(failQuickly) {
  var router = {};
  // Grab the names of the web apps, then read their data/port files to discover the sites we are proxying and to what ports
  var servers = fs.readdirSync(config.appsDir);
  var i;
  for (i = 0;
    (i < servers.length); i++) {
    var site = servers[i];
    var hosts = [];
    var port;
    // If there is a data/hosts file, read whitespace-separated hostnames from it, and
    // respond on those for the site. This overrides the default "listen on a subdomain for
    // each staging site" behavior for that site. Enables production hosting with stagecoach
    var hostsPath = config.appsDir + '/' + site + '/data/hosts';
    try {
      if (fs.existsSync(hostsPath)) {
        hosts = fs.readFileSync(hostsPath, 'UTF-8').replace(/\s+$/, '');
        hosts = hosts.split(/\s+/);
        // Don't get confused by an empty file returning one string on split
        if ((hosts.length === 1) && hosts[0] === '') {
          hosts = [];
        }
      }
      port = fs.readFileSync(config.appsDir + '/' + site + '/data/port', 'UTF-8').replace(/\s+$/, '');
      if (port < 1000) {
        throw "Bad port number, probably not a complete write";
      }
    } catch (err) {
      // Fail on an unexpected filesystem error or a file we suspect is incomplete
      if (failQuickly) {
        return false;
      }
      continue;
    }
    var local = '127.0.0.1:' + port;
    if (!hosts.length) {
      router[site + '.' + config.domain] = local;
    }
    hosts.forEach(function(host) {
      router[host] = local;
    });
  }
  return router;
}