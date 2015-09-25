# sc-proxy

## Purpose

`sc-proxy` is a node-based reverse proxy server for web applications that are installed like `example`: in subdirectories of /opt/stagecoach/apps, with a `data/port` file that records the port number each web application is listening on. `sc-proxy` accepts requests at nice URLs like `http://projectname.mydomain.com` and proxies them to `http://localhost:3001` and so forth, so that all of the projects can respond to reasonable URLs without wacky port numbers.

## Deprecated

`sc-proxy` is a neat toy, but it just can't match the performance of using nginx as your reverse proxy. So if you want an easy way to configure a reverse proxy and the performance of nginx, just use [mechanic](https://github.com/punkave/mechanic).

## Details

The most convenient way to use `sc-proxy` is to set up a wildcard DNS "A" record for the domain you use to stage your projects. This way you don't need to add a separate "A" record for every project that is ready to test on the staging server. In our office we have a domain name set aside for this purpose.

`sc-proxy` looks at the name of each folder in `/opt/stagecoach/apps` and proxies traffic for that subdomain to the port specified in the `data/port` file in that folder. If you have a folder called `/var/webapps/myproject` that contains a `data/port` file containing the number 3001, then traffic coming to `http://myproject.mydomain.com` will be proxied to `http://localhost:3001`. Note that in the `start` script provided with `example` you can find simple shell script logic to assign a currently unclaimed port number to a new web app on its first deployment.

If `sc-proxy` is asked to access a site that isn't part of its current configuration, it will check whether that site has been added to `/var/webapps`. In addition, once a minute `sc-proxy` scans for any modifications to `/var/webapps`, on the off chance a site has been removed or reconfigured.

## Configuring sc-proxy

To configure `sc-proxy`, copy the file `config-example.js` to `config.js` and change the `domain` setting to match your needs. Also set `ip` to the IP address you want to listen on; you can set `0.0.0.0` to respond on all interfaces. If you want to listen on a specific IP address to avoid a conflict with a second IP address reserved for Apache, you can do that as well. You can also change the port from port 80 for testing purposes, although there is not much point in using `sc-proxy` if you don't plan to eventually configure it to bind on port 80.

Similarly, if Apache is on the same server, you will need to configure Apache to listen on a different IP address, or a different port if you use the `defaultPort` setting of `sc-proxy`.

You can set `defaultPort` to forward traffic to that port if it does not match any of your Stagecoach sites. This allows sc-proxy to act as a front end to Apache, as long as you change Apache's configuration to bind on the port indicated by `defaultPort`. This is one way to avoid a second IP address.

When your configuration is complete, cd to the `sc-proxy` folder and run:

    npm install

Now you can launch `sc-proxy` by typing `node server` as root, or by using the provided `upstart` scripts with Ubuntu.

## Production Hosting

You can do production hosting with `sc-proxy` as well.

Just create a `data/hosts` file for each site. In that site, list the hostnames that the site should respond for, like this:

    myexample.com
    www.myexample.com
    some-alternate-name.com

Note that if `data/hosts` exists, `sc-proxy` will stop responding on the staging subdomain for that site. Which doesn't bother you, because you have separate staging and production servers... I hope!

## Reconfiguration

If you add or remove an app entirely, sc-proxy should spot that right away.

If you add or modify a `hosts` file, there will be a delay of up to a minute. I'm working on changing this by watching these files in the filesystem in an efficient way.
