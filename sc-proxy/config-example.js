module.exports = {
  // A domain you have set aside for staging sites, which will respond as example.mystagingdomain.com, etc.
  // You need to set up a wildcard DNS "A" record pointing to this domain
  domain: 'mystagingdomain.com',
  // You might change this for testing, but ultimately the point is to come back to port 80
  port: 80,
  // You will probably need to change this if you are using a VPS that also runs Apache.
  // Use a separate IP with a DNS wildcard "A" record that points to the domain above
  bindIp: '0.0.0.0',
  // Our example start and stop scripts for stagecoach assume this will be /var/webapps, but you
  // can change it if you are consistent. You'll need to edit sc-start-all and sc-stop-all
  appsDir: '/opt/stagecoach/apps'
};
