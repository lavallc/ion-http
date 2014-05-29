var config = require('./config'),
    express = require('express'),
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
    res.render('index', {'config': config});
});


// set a mood
function setPattern(moodName, cb) {
  ion.setMood(moodName, function(err) {
    if (!err) {
      console.log('set mood ' + moodName);
      if (cb)
        cb();
    }
  });
}

// set a mood config
function setConfigForPattern(patternName, configName, configVal, cb) {
  ion.setMoodConfig(patternName, configName, configVal, function(err) {
    if (!err) {
      if (typeof configVal !== 'undefined')
        console.log('set ' + configName + ' to ' + configVal + ' for mood ' + patternName);
      else
        console.log('set ' + configName + ' for mood ' + patternName);
      if (cb)
        cb();
    }
  });
}


// reduce logging
io.set('log level', 1);

io.sockets.on('connection', function (socket) {
  // handle control packets from users
  socket.on('control', function (data) {
    // no crashes, please
    try {
      // user is configuring a pattern
      if (data.controlType == 'patternConfig') {
        // rate limiting
        if ((new Date()).getTime() - lastPacket < 250)
          return;

        // set the pattern config
        lastPacket = (new Date()).getTime();
        setConfigForPattern(data.pattern, data.configName, data.configVal);

        // alert the web browser
        io.sockets.emit('pattern_config_set', {'nickname': socket.nickname, 'pattern': data.pattern, 'config': data.configName, 'value': data.configVal});

      // user is setting a pattern
      } else if (data.controlType == 'pattern') {
        // rate limiting
        if ((new Date()).getTime() - lastPacket < 250)
          return;

        // set the pattern
        lastPacket = (new Date()).getTime();
        setPattern(data.pattern);

        // alert the web browser
        io.sockets.emit('pattern_set', {'nickname': socket.nickname, 'pattern': data.pattern});
      }
    } catch (e) {}
  });
});


// catch the uncaught errors that weren't wrapped in a domain or try catch statement
process.on('uncaughtException', function(err) {
    // handle the error safely
    console.log(err);
});


// let's get this started
server.listen(3000);