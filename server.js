var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);


// use ionode to connect locally
var ion = require('./ion-local');

// make sure someone isn't spamming the server with commands
var lastPacket = (new Date()).getTime();

// serve static files via express
app.use(express.static(__dirname + '/public'));

// configure express w/ ejs
app.set('views', __dirname + '/views');     // specifying template path
app.set('view engine', 'ejs');              // specifying template engine

// index page
app.get('/', function(req, res) {
    res.render('index');
});


// set a mood
function setMood(moodName, cb) {
  ion.setMood(moodName, function(err) {
    if (!err) {
      console.log('set mood ' + moodName);
      if (cb)
        cb();
    }
  });
}

// set a mood config
function setConfigForMood(moodName, configName, configVal, cb) {
  ion.setMoodConfig(moodName, configName, configVal, function(err) {
    if (!err) {
      // color requires hue and saturation. for simplicity, we always set saturation to 255
      if (configName === 'color') {
        ion.setMoodConfig(moodName, configName.replace('color', 'saturation'), 255);
      }

      if (typeof configVal !== 'undefined')
        console.log('set ' + configName + ' to ' + configVal + ' for mood ' + moodName);
      else
        console.log('set ' + configName + ' for mood ' + moodName);
      if (cb)
        cb();
    }
  });
}


// reduce logging
io.set('log level', 1);


// handle socket.io connections
io.sockets.on('connection', function (socket) {
  // handle control packets from users
  socket.on('control', function (data) {
    // no crashes, please
    try {
      // user is configuring a mood
      if (data.controlType == 'moodConfig') {
        // rate limiting
        if ((new Date()).getTime() - lastPacket < 250)
          return;

        // set the mood config
        lastPacket = (new Date()).getTime();
        setConfigForMood(data.mood, data.configName, data.configVal);

        // alert the web browser
        io.sockets.emit('mood_config_set', {'nickname': socket.nickname, 'mood': data.mood, 'config': data.configName, 'value': data.configVal});

      // user is setting a mood
      } else if (data.controlType == 'mood') {
        // rate limiting
        if ((new Date()).getTime() - lastPacket < 250)
          return;

        // set the mood
        lastPacket = (new Date()).getTime();
        setMood(data.mood);

        // alert the web browser
        io.sockets.emit('mood_set', {'nickname': socket.nickname, 'mood': data.mood});
      }
    } catch (e) {}
  });
});


// catch the uncaught errors that weren't wrapped in a domain or try catch statement
process.on('uncaughtException', function(err) {
  // "handle" the error
  console.log(err);
});


// let's get this started
server.listen(3000);