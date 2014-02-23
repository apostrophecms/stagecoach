#!/bin/bash

# Install the latest official stable versions of Node and MongoDB from 
# their own repositories, not the older stuff in the Ubuntu repositories.

# Also installs the requirements for building node extensions (i.e. gcc).

# Finally installs the 'forever' npm package globally, because 
# our recommended start and stop scripts rely on it.

# Configures MongoDB to accept connections on localhost only - a safe default
# configuration. If you don't like this, you should explicitly configure MongoDB
# to allow connections from some safe set of IPs or to require authentication.
# MongoDB's default configuration is insecure.

# Assumes you have at least Ubuntu 10.04 (I haven't tested further back).

# npm is now part of the nodejs package, removed failing step to separately install it.

echo "Installing requirements for building node extensions" &&
apt-get -y install build-essential &&
echo "Installing Node" &&
apt-get -y install python-software-properties &&
add-apt-repository ppa:chris-lea/node.js &&
apt-get -y update &&
apt-get -y install nodejs &&
echo "Node installed" &&
echo "Installing MongoDB" &&
apt-key adv --keyserver keyserver.ubuntu.com --recv 7F0CEB10 &&
echo "deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen" >> /etc/apt/sources.list &&
apt-get -y update &&
apt-get -y install mongodb-10gen &&
echo "Installed MongoDB" &&
echo "Configuring MongoDB to listen only on localhost" &&
echo "bind_ip = 127.0.0.1" >> /etc/mongodb.conf &&

# The default configuration for MongoDB assumes taking up 6GB off the bat for every single
# database is cool and also inhales tons of space for journal files. This is overkill for
# most deployments, so we instruct MongoDB to use smaller files
echo "smallfiles = true" >> /etc/mongodb.conf &&

cat <<EOM >> /etc/init/mongodb.conf &&
# Make sure we respawn if the physical server
# momentarily lies about disk space, but also
# make sure we don't respawn too fast

post-stop script
  sleep 5
end script

respawn
EOM

start mongodb &&
npm install -g forever &&
echo "Success!"
