# stagecoach: host multiple Node apps on your Linux servers

Stagecoach is a simple framework for deploying node.js web applications to your own servers. It is useful for both staging and production environments. It can run multiple apps on the same server, keep them running with `forever`, and restart them gracefully at reboot time.

## Requirements

Your servers will need `node` of course, and also the `forever` utility:

```
npm install -g forever
```

## Configuration

Stagecoach lives in `/opt/stagecoach` and your individual apps live in subdirectories of `/opt/stagecoach/apps`.

```
[create a user called "nodeapps"]
[log in as root]
cd /opt
git clone https://github.com/punkave/stagecoach
cd stagecoach
cp settings.example settings
[edit the settings file]
mkdir apps
chown nodeapps apps
```

You will carry out all of your deployments via the `nodeapps` user, never the root user.

You can use a different non-root account if you change the `USER` setting in `/opt/stagecoach/settings`.

## sc-deploy

`sc-deploy` is a simple bash script that handles web app deployment with automatic rollback on failure.

`sc-deploy` is meant to be run on your **development** system, and deploys code to your servers.

### Installing sc-deploy

```
[on your development machine]
cd
mkdir -p src
cd src
git clone https://github.com/punkave/stagecoach
cd stagecoach
subl ~/.profile
[add /User/MYUSERNAME/src/stagecoach/bin to your PATH]
```

### Setting up your application to be deployed

1. Make sure your application listens on the port specified by the `PORT` environment variable, if available:

```
// Let's assume `app` is an Express app object
var port = process.env.PORT || 3000;
app.listen(port);
```

As seen here, it's OK to fall back to port `3000` or whatever pleases you for development work.

2. Copy the `deployment` folder from our example app to your application:

```
cp -r src/stagecoach/example/deployment src/YOURAPPHERE/deployment
```

3. Review the `deployment` scripts, especially `migrate`, which should take care of adding symlinks to any folders that contain persistent files that should *not* be wiped out by every new deployment. The example application has two shared folders, `data` and `uploads`. The `migrate` script ensures that the `data` folder is symbolically linked into each new deployment as `data`, and the `uploads` folder is symbolically linked as `public/uploads`.

*The shared `data` folder is required.* Stagecoach uses it to remember this app's assigned port number in `data/port`. You may also store other persistent files there.

4. Make sure your app's main `.js` file is `app.js`, or edit `deployment/start` and `deployment/stop`.

5. Edit `deployment/settings` and set `PROJECT` to the shortname of your project (usually, the directory name).

6. Edit `deployment/settings.production`. Make sure `USER` matches the non-root username on the server and `SERVER` is the hostname of your server. Create additional `settings.*` files if you have additional servers to deploy to, such as `staging`.

7. Deploy to production for the first time:

```
sc-deploy production
```

When the script finishes, your app will be up and running. On the first startup, a unique port number is assigned automatically and stored in `data/port`.

8. Configure `nginx` or another server as a reverse proxy to forward traffic to your app. The easiest way to set up nginx is to use [mechanic](https://github.com/punkave/mechanic). Manual nginx configuration examples are also included below.

### Updating your app

Just use `sc-deploy production` at any time to deploy again. **The previous deployment is not shut down until after the new one is completely ready to start up, so there is very little downtime.** Stagecoach does this:

1. Deploys the new version
2. Installs dependencies by running `deployment/dependencies`
3. Stops the old app with `deployment/stop`
4. Migrates with `deployment/migrate`
5. Symbolically links the new deployment to `/current`
6. Starts up with `deployment/start`

Notice that your old deployment stays up and running until the really slow stuff is already finished. That's why there is almost no downtime.

**By default, 5 old deployments are kept on the server.** This is useful if you need to roll back. You can change this number by setting `KEEP` in your `deployment/settings` file.

### Excluding files from deployment

If an `rsync_exclude.txt` file is present in `deployment`, files mentioned there are not included in the deployment and are left alone if they exist on the server (see the `rsync` manpage). Shared folders like `data` and `public/uploads` folders are very important to include here.

### Avoiding passwords

`sc-deploy` does make several ssh connections. Entering a password for each one is painful. You should definitely [set up a trusted ssh public key that allows you to ssh to your server without entering your password over and over.](http://archive.oreilly.com/pub/h/66) Passwords are error-prone, annoying and insecure. Friends don't let friends use passwords.

## sc-rollback

`sc-rollback` is meant to be run on your **development** system, and rolls back deployments on other systems.

If you regret a deployment to `production`, type:

sc-rollback production

For a list of previous deployments, named by the date and time. For instance:

```
Available deployments:
2014-12-04-18-40-26
2014-12-05-08-46-33
```

To roll back to one of these, type:

```
sc-rollback production 2014-12-04-18-40-26
```

**Warning:** if you have performed database migrations that are not backwards-compatible with older versions of your code, such as removing a column from a SQL table, you should not roll back beyond that point.

## `example` app

In the `example` folder you'll find an example of node app deployment, with all the important bits already set up (be sure to look in `example/deployment`). The `start` script reads `data/port` and sets the `PORT` environment variable before starting the example app, which honors the environment variable.

## Warnings and Limitations

`sc-deploy` expects that you will not have spaces in your target deployment folder name or your project name. If you like making things difficult for shell scripts, this is not the tool for you.

The provided sample `start` and `stop` scripts do not attempt to use `chroot` jails to prevent apps from seeing each other's files. If you need that, you might be happier with `haibu`.

This isn't for Windows.

The `sc-proxy` folder also contains an `upstart` script that can start and stop the proxy and the associated apps on an Ubuntu system. By copying this script to `/etc/init` on your Ubuntu system you can arrange for your proxy and web apps to be running at all times. You can also `start stagecoach` and `stop stagecoach` at any time (as root).

## Restarting Sites on Reboot

Drop this in `/etc/rc.local` (on Ubuntu), `/etc/rc.d/rc.local` (on CentOS) or otherwise execute it on reboot:

    cd /opt/stagecoach
    bash bin/sc-start-all

## Configuring nginx yourself

We use [nginx](http://nginx.org) as a reverse proxy to forward traffic for specific domain names to specific apps, each of which is listening on a particular port. The easiest way to do this is to use our [mechanic](https://github.com/punkave/mechanic) tool to set up nginx.

If you don't want to use mechanic, it's not hard to set up nginx yourself. Here's a sample configuration:

```
server {
    listen       www.example.com:80;
    server_name  www.example.com;

    access_log  /var/log/nginx/example.access.log;
    error_log  /var/log/nginx/example.error.log;
    client_max_body_size 32M;

    location / {
     proxy_pass  http://localhost:3000;
     proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
     proxy_redirect off;
     proxy_buffering off;
     proxy_set_header        Host            $host;
     proxy_set_header        X-Real-IP       $remote_addr;
     proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
   }
}
```

You can get better performance by allowing nginx to serve static files directly. That's all included in our standard configuration with [mechanic](https://github.com/punkave/mechanic).

## sc-proxy (deprecated)

`sc-proxy` is a node.js-based frontend proxy server solution for web apps that listen on independent ports, built on top of the `node-http-proxy` module. It picks up port numbers directly from the Stagecoach `data/port` files. It's a neat proof of concept, but we've found that performance is much better with nginx (see above). If you're still interested in sc-proxy, check out the `README.md` in that subdirectory for more information.

## Changelog

09/25/2015: deprecated `sc-proxy` in favor of nginx, managed by `mechanic`. Moved things that have nothing to do with `sc-proxy` out of that subdirectory. Rewrote the documentation to reflect our own best practices.

12/11/2014: `sc-rollback` introduced.

06/18/2013: `sc-deploy` overhauled. Now keeps 5 deployments on the server by default rather than keeping them forever. You can adjust this number via the `KEEP` variable in `deployment/settings`. Also, `sc-deploy` does a better job of recognizing problems at the end of the deployment process and will flip the symbolic link back to the previous deployment and attempt to restart that version of the code if deployment fails.

## Contact

[tom@punkave.com](tom@punkave.com) mostly maintains this. You can also [open issues on github](http://github.com/punkave/stagecoach). We welcome pull requests.
