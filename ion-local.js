var ionode = require('ionode'),
    config = require('./config'),
    ion = ionode.createLamp(config.lampMac);


ion.type = 'local';

// connect to the lamp
ion.setAutoReconnect(true);
ion.connect();



ion.on('discovered', function() {
    console.log('lamp discovered');
});

ion.on('connected', function() {
    console.log('connected');
});

ion.on('disconnected', function() {
    console.log('disconnected');
});

ion.on('reconnecting', function() {
    console.log('reconnecting');
});

ion.on('error', function(err) {
    console.log('error: ' + err);
});

ion.on('ready', function() {
    console.log('lamp ready');
});

module.exports = ion;