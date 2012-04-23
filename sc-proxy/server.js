// You should edit config.js (start by copying config-example.js)
var config = require('./config');

var fs = require('fs');
var http = require('http');
var httpProxy = require('http-proxy');

var options = {};

options.router = rebuildRouter(false);

// If a site is added or removed, rebuild the routing table on the spot. Do that by
// watching /var/webapps for changes. It's not recursive but it'll spot the
// important stuff
fs.watch(config.appsDir, { persistent: true }, resetRouter);

// Also rebuild the routing table once per minute in case of a change to a port number 
// (it's a low probability event but we ought to spot it eventually). TODO: consider
// whether the performance of using fs.watch for these would be acceptable
setInterval(resetRouter, 60000);

console.log(options);

var proxyServer = httpProxy.createServer(options).listen(config.port, config.bindIp);

// Reset the routes on the fly

function resetRouter()
{
  var router = rebuildRouter(true);
  if (!router)
  {
    // Try again in a bit, failure to read the port files typically means a deployment is
    // in progress
    setTimeout(resetRouter, 2000);
    return;
  }
  proxyServer.proxy.proxyTable.setRoutes(router);
  proxyServer.proxy.proxyTable.emit('routes', proxyServer.proxy.proxyTable.router);
}

// Rebuild the routes, at startup or in response to a change.
// If failQuickly is true, return false as soon as we hit a port file
// we can't read or parse, so we can retry. If failQuickly is false,
// just keep going and return the best result we can (more appropriate
// at startup).

function rebuildRouter(failQuickly)
{
  console.log("Scanning " + config.appsDir);
  var router = {};
  // Grab the names of the web apps, then read their data/port files to discover the sites we are proxying and to what ports
  var servers = fs.readdirSync(config.appsDir);
  var i;
  for (i = 0; (i < servers.length); i++)
  {
    var site = servers[i];
    try
    {
      var port = fs.readFileSync(config.appsDir + '/' + site + '/data/port', 'UTF-8').replace(/\s+$/, '');
      if (port < 1000)
      {
        throw "Bad port number, probably not a complete write";
      }
    } catch (err)
    {
      if (failQuickly)
      {
        return false;
      }
      continue;
    }
    router[site + '.' + config.domain] = '127.0.0.1:' + port;
  }
  return router;
}
