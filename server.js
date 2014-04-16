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


/* these need to be routed to redis */
function setPattern(patId, cb) {
  ion.setPattern(patId, function(err) {
    if (!err) {
      console.log('set pattern ' + patId);
      if (cb)
        cb();
    }
  });
}

function setPatternConfig(patternId, configId, configVal, cb) {
  ion.setPatternConfig(patternId, configId, configVal, function(err) {
    if (!err) {
      console.log('set pattern config for pattern ' + patternId);
      if (cb)
        cb();
    }
  });
}




// lookup for pattern names -----> ids
function patternIdForName(patternName) {
  if (patternName === 'off')
    return 3;
  else if (patternName === 'light')
    return 2;
  else if (patternName === 'digitalrain')
    return 1;
  else if (patternName === 'flame')
    return 4;
  else if (patternName === 'halo')
    return 5;
  else if (patternName === 'spiral')
    return 6;
  else if (patternName === 'rave')
    return 7;
  else if (patternName === 'weather')
    return 8;
  else if (patternName === 'spin')
    return 9;
  else if (patternName === 'strobe')
    return 10;
  else if (patternName === 'lava')
    return 11;
  else if (patternName === 'rainbow')
    return 12;
  else if (patternName === 'lines')
    return 13;
  else if (patternName === 'sparkle')
    return 14;
  else if (patternName === 'binaryclock')
    return 15;
  else if (patternName === 'hourglass')
    return 16;
  else if (patternName === 'fireworks')
    return 17;
  else if (patternName === 'plasma')
    return 18;
  else if (patternName === 'glow')
    return 22;
  else if (patternName === 'pulse')
    return 23;
  else
    return -1;
}


// sanity checking for pattern configs
function setConfigForPattern(patternName, configName, configVal) {
  var patternId = patternIdForName(patternName);
  var configId = -1;

  if (patternName === 'off') {
    return;
  } else if (patternName === 'light') {
    if (configName === 'type') {
      if (configVal < 1 || configVal > 6)
        return;
      configId = 1;
    } else if (configName === 'brightness') {
      if (configVal < 0 || configVal > 255)
        return;
      configId = 2;
    } else if (configName === 'hue') {
      if (configVal < 0 || configVal > 360)
        return;

      // enable color since hue is being set
      setPatternConfig(patternId, 1, 7);

      configId = 3;
    } else {
      return;
    }
  } else if (patternName === 'digitalrain') {
    if (configName === 'speed') {
      if (configVal < 0 || configVal > 25)
        return;
      configId = 2;
    } else if (configName === 'hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 1;
    } else {
      return;
    }
  } else if (patternName === 'flame') {
    if (configName === 'hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 1;
    } else {
      return;
    }
  } else if (patternName === 'halo') {
    if (configName === 'speed') {
      if (configVal < 0 || configVal > 255)
        return;
      configId = 2;
    } else if (configName === 'hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 1;
    } else {
      return;
    }
  } else if (patternName === 'spiral') {
    if (configName === 'speed') {
      if (configVal < 0 || configVal > 255)
        return;
      configId = 2;
    } else if (configName === 'brightness') {
      if (configVal < 0 || configVal > 255)
        return;
      configId = 3;
    } else if (configName === 'hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 1;
    } else {
      return;
    }
  } else if (patternName === 'rave') {
    if (configName === 'speed') {
      if (configVal < 0 || configVal > 25)
        return;
      configId = 1;
    } else if (configName === 'low-strength') {
      if (configVal < 0 || configVal > 100)
        return;
      configId = 3;
    } else if (configName === 'mid-strength') {
      if (configVal < 0 || configVal > 100)
        return;
      configId = 5;
    } else if (configName === 'high-strength') {
      if (configVal < 0 || configVal > 100)
        return;
      configId = 7;
    } else if (configName === 'low-hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 2;
    } else if (configName === 'mid-hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 4;
    } else if (configName === 'high-hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 6;
    } else if (configName === 'bass') {
      if (configVal !== 0 && configVal !== 1)
        return;
      configId = 8;
    } else if (configName === 'kick-threshold') {
      if (configVal < 0 || configVal > 1024)
        return;
      configId = 9;
    } else {
      return;
    }
  } else if (patternName === 'weather') {
    return;
  } else if (patternName === 'spin') {
    if (configName === 'speed') {
      if (configVal < 0 || configVal > 90)
        return;
      configId = 1;
    } else if (configName === 'brightness') {
      if (configVal < 0 || configVal > 255)
        return;
      configId = 2;
    } else if (configName === 'hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 3;
    } else {
      return;
    }
  } else if (patternName === 'strobe') {
    if (configName === 'speed') {
      if (configVal < 0 || configVal > 25)
        return;
      configId = 1;
    } else if (configName === 'colorEnabled') {
      if (configVal !== 0)
        return;
      configId = 3;
    } else if (configName === 'hue') {
      if (configVal < 0 || configVal > 360)
        return;

      // enable color since hue is being set
      setPatternConfig(patternId, 3, 1);

      configId = 2;
    } else {
      return;
    }
  } else if (patternName === 'lava') {
    if (configName === 'speed') {
      if (configVal < 0 || configVal > 255)
        return;
      configId = 1;
    } else if (configName === 'hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 2;
    } else {
      return;
    }
  } else if (patternName === 'rainbow') {
    if (configName === 'speed') {
      if (configVal < 0 || configVal > 36)
        return;
      configId = 1;
    } else if (configName === 'brightness') {
      if (configVal < 0 || configVal > 255)
        return;
      configId = 2;
    } else {
      return;
    }
  } else if (patternName === 'lines') {
    if (configName === 'hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 1;
    } else {
      return;
    }
  } else if (patternName === 'sparkle') {
    if (configName === 'hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 1;
    } else {
      return;
    }
  } else if (patternName === 'binaryclock') {
    return;
  } else if (patternName === 'hourglass') {
    if (configName === 'hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 2;
    } else if (configName === 'time') {
      if (configVal !== 60)
        return;
      configId = 1;
    } else {
      return;
    }
  } else if (patternName === 'fireworks') {
    if (configName === 'speed') {
      if (configVal < 0 || configVal > 255)
        return;
      configId = 2;
    } else {
      return;
    }
  } else if (patternName === 'plasma') {
    if (configName === 'hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 1;
    } else if (configName === 'speed') {
      if (configVal < 0 || configVal > 25)
        return;
      configId = 2;
    } else {
      return;
    }
  } else if (patternName === 'glow') {
    if (configName === 'speed') {
      if (configVal < 0 || configVal > 120)
        return;
      configId = 1;
    } else if (configName === 'brightness') {
      if (configVal < 0 || configVal > 255)
        return;
      configId = 2;
    } else if (configName === 'hue') {
      if (configVal < 0 || configVal > 360)
        return;
      configId = 4;
    } else {
      return;
    }
  } else if (patternName === 'pulse') {
    if (configName === 'speed') {
      if (configVal < 0 || configVal > 255)
        return;
      configId = 1;
    } else {
      return;
    }
  }

  // send the command
  setPatternConfig(patternId, configId, configVal);

  // success code
  return 4;
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
        var patId = parseInt(patternIdForName(data.pattern));

        // invalid pattern name, abort
        if (patId === -1)
          return;

        // rate limiting
        if ((new Date()).getTime() - lastPacket < 250)
          return;

        // set the pattern config
        lastPacket = (new Date()).getTime();
        var returnCode = setConfigForPattern(data.pattern, data.configName, data.configVal);

        // send event to everyone if successful
        if (returnCode === 4) {
          io.sockets.emit('pattern_config_set', {'nickname': socket.nickname, 'pattern': data.pattern, 'config': data.configName, 'value': data.configVal});
        }

      // user is setting a pattern
      } else if (data.controlType == 'pattern') {
        var patId = parseInt(patternIdForName(data.pattern));

        // invalid pattern name, abort
        if (patId === -1)
          return;

        // rate limiting
        if ((new Date()).getTime() - lastPacket < 250)
          return;

        // send event to everyone
        io.sockets.emit('pattern_set', {'nickname': socket.nickname, 'pattern': data.pattern});

        lastPacket = (new Date()).getTime();
        setPattern(patId);
      } else if (data.controlType == 'debug' && config.enableDebug) {
        var patId = parseInt(data.pattern);
        var configId = parseInt(data.configId);
        var configVal = parseInt(data.configVal);

        // set pattern and then config
        setPattern(patId, function() {
          setPatternConfig(patId, configId, configVal);
        });
      }
    } catch (e) {}
  });
});

// catch the uncaught errors that weren't wrapped in a domain or try catch statement
// do not use this in modules, but only in applications, as otherwise we could have multiple of these bound
process.on('uncaughtException', function(err) {
    // handle the error safely
    console.log(err);
});


// let's get this started
server.listen(3000);