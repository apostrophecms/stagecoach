stagecoach
==========

Stagecoach is a framework for deploying node.js web applications and testing them on a staging server, then deploying them to production servers. It includes a complete mechanism for running many such node applications on a single staging or production server, restarting them gracefully on reboot, and accessing them at nice URLs without port numbers. 

Stagecoach also includes `sc-deploy`, a minimalist deployment tool based on rsync that understands multiple deployment targets and makes pretty much no assumptions about your project. It is suitable for pretty much any site or web app you wish to deploy, although the examples provided are node-oriented.

We also threw in a nice installer script for node, forever and mongodb on Ubuntu which installs the recommended versions from Joyent and the MongoDB team.

`sc-proxy` is a node.js-based frontend proxy server solution for web apps that listen on independent ports, built on top of the amazing node-http-proxy by nodejitsu. It's great for testing lots of node projects on the same staging server while giving them all reasonable hostnames and allowing them to respond on port 80. With a little tweaking it may also be suitable for production deployment of clusters of small sites that don't need a VPS unto themselves.

We chose to create these tools because we wanted a solution that didn't contain a lot of implicit assumptions about the sites being deployed (such as Capistrano, which really wants to deploy a Rails project, although you can convince it to deploy other things). 

Simplicity is a major goal here. If your needs are more complex you might be happier with Haibu (for Node) or Capistrano (for Rails).

Requirements
============

The provided start and stop scripts require that `forever` be installed globally:

    npm install -g forever

`forever` is a great node utility for ensuring that a process is restarted if it should fail.

Although `sc-deploy` doesn't care where you install things, for easiest use of `sc-proxy` Stagecoach should be installed to `/opt/stagecoach`. Apps will run from `/opt/stagecoach/apps/appname/current`. If that is not an option for you, you'll need to make modifications.

Configuration
=============

Copy stagecoach to `/opt/stagecoach` on your staging server. Edit `/opt/stagecoach/settings` and make sure `USER` is set to the non-root user that web apps should run as. Then create the `/opt/stagecoach/apps` folder and `chown` that folder to that same non-root user.

Additional configuration steps are covered under `sc-proxy`, below.

sc-deploy
=========

`sc-deploy` is a short bash script that handles web app deployment with automatic rollback on failure. You'll find it in `/opt/stagecoach/bin`.

Like other deployment tools, sc-deploy deploys to a new folder on the target server each time you deploy, and switches a symlink at the last possible minute only if everything went smoothly. The server is stopped, migrated and started only after the rsync is complete. So depending on how long your database migrations take, your deployment downtime can be very short indeed.

`sc-deploy` creates a symbolic link from `/opt/stagecoach/apps/example/current` to the latest deployment folder if everything happens successfully (assuming that your project is called `myproject` and you base your paths on those in `example`). If you're deploying traditional web languages like PHP, you'll want to make sure your web document root is configured accordingly.

`sc-deploy` relies on bash scripts in a subdirectory of your project called `deployment` to carry out the work of starting (`start`), stopping (`stop`) and migrating (`migrate`) your project. If any of these exit with a nonzero status, the deployment process stops and the previous version of the site stays live. Currently any failed deployment folders are left on the server for your debugging convenience.

Settings that apply to all deployment targets for this project, such as the project's name and (usually) the deployment directory, reside in `deployment/settings`. You'll want to edit the `PROJECT` setting, and possibly the `DIR` setting as well. The project name should be a reasonable Unix shortname; it's the folder name you'll be deploying to. If you use `sc-proxy` it is also the subdomain you'll use to access the staging site.

Settings for a specific target, such as `staging`, go in `deployment/settings.staging`. The `USER` and `HOST` settings (for ssh and rsync) typically appear here because they are different for each server.

Most apps have folders that contain data rather than code and should not be replaced in a deployment. Check out the provided `migrate` script to see how we provide a shared `data` folder. A symlink to this folder is created from each new deployment folder.

If an `rsync_exclude.txt` file is present in `deployment`, files mentioned there are not included in the deployment and are left alone if they exist on the server (see the `rsync` manpage).

Run sc-deploy like this (after setting up your deployment folder correctly):

    sc-deploy staging

You'll want to make sure `sc-deploy` is in your `PATH`.

`sc-deploy` deploys straightforwardly from the current directory to the target via rsync. This is a deliberate choice: the code you just QA'd on the box in front of you is the code you want to deploy, not something that might be juuuust a little different in fun and surprising ways. However you can easily wrap `sc-deploy` in a script that updates from git, svn or whatever yoou may prefer and then runs tests before agreeing to carry out a deployment. As long as you have a test script that returns a nonzero exit code on failure, that can be as simple as:

    git pull && ./tests && sc-deploy staging

So `sc-deploy` plays well with jenkins and other shells for running deployment and testing tools.

Tip: you should definitely set up a trusted ssh public key that allows you to ssh to your server without entering your password over and over.

`example` app
=============

In the `example` folder you'll find an example of ndoe app deployment, with all the important bits already set up (be sure to look in `example/deployment`). The `start` script integrates with `sc-proxy` by registering a port number for the project to listen on via the data/port file, and the provided example node app consults that file as well at startup.

Production Hosting
==================

You can do production hosting with `sc-proxy` as well.

Just create a `data/hosts` file for each site. In that site, list the hostnames that the site should respond for, like this:

    myexample.com
    www.myexample.com
    some-alternate-name.com

Note that if `data/hosts` exists, `sc-proxy` will stop responding on the staging subdomain for that site. Which doesn't bother you, because you have separate staging and production servers... I hope!

Reconfiguration
===============

If you add or remove an app entirely, sc-proxy should spot that right away.

If you add or modify a `hosts` file, there will be a delay of up to a minute. I'm working on changing this by watching these files in the filesystem in an efficient way.

Warnings and Limitations
========================

`sc-deploy` expects that you will not have spaces in your target deployment folder name or your project name. If you like making things difficult for shell scripts, this is not the tool for you. 

The provided sample `start` and `stop` scripts do not attempt to use `chroot` jails to prevent apps from seeing each other's files. If you need that, you might be happier with `haibu`.

This isn't for Windows.

sc-proxy
========

`sc-proxy` is a simple reverse proxy server for web applications that are installed like `example`: in subdirectories of /opt/stagecoach/apps, with a `data/port` file that records the port number each web application is listening on. `sc-proxy` accepts requests at nice URLs like `http://projectname.mydomain.com` and proxies them to `http://localhost:3001` and so forth, so that all of the projects can respond to reasonable URLs without wacky port numbers. `sc-proxy` itself is just a handful of lines of JavaScript because it is built on Nodejitsu's `node-http-proxy`, which is terrific because it handles websockets and all those other neat things that node apps do, but is also a perfectly valid proxy for any plain vanilla HTTP web application.

The most convenient way to use `sc-proxy` is to set up a wildcard DNS "A" record for the domain you use to stage your projects. This way you don't need to add a separate "A" record for every project that is ready to test on the staging server. In our office we have a domain name set aside for this purpose.

`sc-proxy` looks at the name of each folder in `/opt/stagecoach/apps` and proxies traffic for that subdomain to the port specified in the `data/port` file in that folder. If you have a folder called `/var/webapps/myproject` that contains a `data/port` file containing the number 3001, then traffic coming to `http://myproject.mydomain.com` will be proxied to `http://localhost:3001`. Note that in the `start` script provided with `example` you can find simple shell script logic to assign a currently unclaimed port number to a new web app on its first deployment.

If `sc-proxy` is asked to access a site that isn't part of its current configuration, it will check whether that site has been added to `/var/webapps`. In addition, once a minute `sc-proxy` scans for any modifications to `/var/webapps`, on the off chance a site has been removed or reconfigured.

Configuring sc-proxy
====================
To configure `sc-proxy`, copy the file `config-example.js` to `config.js` and change the `domain` setting to match your needs. Also set `ip` to the IP address you want to listen on; you can set `0.0.0.0` to respond on all interfaces. If you want to listen on a specific IP address to avoid a conflict with a second IP address reserved for Apache, you can do that as well. You can also change the port from port 80 for testing purposes, although there is not much point in using `sc-proxy` if you don't plan to eventually configure it to bind on port 80.

Similarly, if Apache is on the same server, you will need to configure Apache to listen on a different IP address, or a different port if you use the `defaultPort` setting of `sc-proxy`.

You can set `defaultPort` to forward traffic to that port if it does not match any of your Stagecoach sites. This allows sc-proxy to act as a front end to Apache, as long as you change Apache's configuration to bind on the port indicated by `defaultPort`. This is one way to avoid a second IP address.

When your configuration is complete, cd to the `sc-proxy` folder and run:

    npm install

The `sc-proxy` folder also contains an `upstart` script that can start and stop the proxy and the associated apps on an Ubuntu system. By copying this script to `/etc/init` on your Ubuntu system you can arrange for your proxy and web apps to be running at all times. You can also `start stagecoach` and `stop stagecoach` at any time (as root).

install-node-and-mongo-on-ubuntu.bash
=====================================

This shell script is provided in the `sc-proxy` folder. It does what it says: it installs Node and MongoDB correctly on Ubuntu, using the recommended repositories for the latest stable releases, not the older stuff in Ubuntu's official repositories. It also configures MongoDB to run safely, accepting connections only on localhost. You can change that if you like, just please consider the security implications. MongoDB's default configuration has no security of any kind.

TODO
====

* `start` script has to be able to tell if the job is already running via 'forever', otherwise forever will keep trying to run two copies

* Write `sc-rollback`, which will roll back one or more deployments. (You can already do that by changing the symbolic link, and `sc-deploy` doesn't make a new deployment live if anything went obviously wrong, but a tool for doing this manually with less effort would be nice.)

* Write `sc-cleanup`, which will purge old deployment folders.

* `start` runs after the symlink is changed so that the current working directory name is consistent. But if `start` fails, we should flip the symlink back again if there is a previous deployment available and run `start` again.

* Clean up the way `stop` is run so that we can skip it if there is no existing deployment. Right now this spews warnings on the first deploy (but still works just fine). This is tied to the task of making the remote commands in `sc-deploy` more readable and maintainable. But this turns out to be a really minor annoyance
