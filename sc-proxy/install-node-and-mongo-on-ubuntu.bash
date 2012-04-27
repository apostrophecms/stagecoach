#!/bin/bash

# Install the latest official stable versions of Node and MongoDB from 
# their own repositories, not the older stuff in the Ubuntu repositories.

# Configures MongoDB to accept connections on localhost only - a safe default
# configuration. If you don't like this, you should explicitly configure MongoDB
# to allow connections from some safe set of IPs or to require authentication.
# MongoDB's default configuration is insecure.

# Assumes you have at least Ubuntu 10.04 (I haven't tested further back)

echo "Installing Node" &&
apt-get install python-software-properties &&
add-apt-repository ppa:chris-lea/node.js &&
apt-get -y update &&
apt-get -y install nodejs npm &&
echo "Node installed" &&
echo "Installing MongoDB" &&
apt-key adv --keyserver keyserver.ubuntu.com --recv 7F0CEB10 &&
echo "deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen" >> /etc/apt/sources.list &&
apt-get -y update &&
apt-get -y install mongodb-10gen &&
echo "Installed MongoDB" &&
echo "Configuring MongoDB to listen only on localhost" &&
echo "bind_ip = 127.0.0.1" >> /etc/mongodb.conf &&
/usr/sbin/service mongodb restart &&
echo "Success!"
