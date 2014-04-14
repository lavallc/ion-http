var setupStates = {};
var lastPattern = 'off';

window.magicKey = '';
window.lastPacket = (new Date()).getTime();
window.userTimeLeft = 0;
window.userTimer = undefined;
window.nickname = '';
var lastUser = '';
var queuedPacket;
var queuedTimer;
window.videoTimeoutTimer = undefined;



function pauseStream() {
  // if the tab loses focus, kill the video stream
  if (window.webcam_socket.readyState == WebSocket.OPEN) {
    window.webcam_socket.onclose = function(evt) {
      // short delay for lingering frame decoding
      setTimeout(function(){
        // display pause state
        var ctx = window.canvas.getContext('2d');
        ctx.rect(0,0,window.canvas.width,window.canvas.height);
        ctx.fillStyle="white";
        ctx.fill();
        ctx.fillStyle = '#444';
        ctx.font="20px Arial";

        var textString = "click here to resume video";
        var textWidth = ctx.measureText(textString).width;
        ctx.fillText(textString , (window.canvas.width/2) - (textWidth / 2), 200);
      }, 300);
    };

    window.webcam_socket.close();
  }
}


function resetTimeout() {
  if (window.videoTimeoutTimer !== undefined)
    clearTimeout(window.videoTimeoutTimer);

  // put 10 minutes on the clock
  window.videoTimeoutTimer = setTimeout(function(){
    window.videoTimeoutTimer = undefined;
    pauseStream();
  }, 1000 * 60 * 10);
}



function resumeStream() {
  // when the tab regains focus, restart video stream
  if (window.webcam_socket.readyState == WebSocket.CLOSED) {
    // reset video timeout
    resetTimeout();

    window.webcam_socket.onclose = function(evt) {};

    window.webcam_socket.connect();
  }
}





// set a video timeout so idlers don't eat up all our bandwidth
resetTimeout();


// restart the stream when the video canvas is clicked
$('#videoCanvas').click(function() {
  resumeStream();
});


// handle the tab becoming active/inactive
$(window).on("blur focus", function(e) {
    var prevType = $(this).data("prevType");

    if (prevType != e.type) {   //  reduce double fire issues
        switch (e.type) {
            case "blur":
                pauseStream();
                break;
            case "focus":
                resumeStream();
                break;
        }
    }

    $(this).data("prevType", e.type);
})



function ISODateString(d){
    function pad(n){return n<10 ? '0'+n : n}
    return d.getUTCFullYear()+'-'
      + pad(d.getUTCMonth()+1)+'-'
      + pad(d.getUTCDate())+'T'
      + pad(d.getUTCHours())+':'
      + pad(d.getUTCMinutes())+':'
      + pad(d.getUTCSeconds())+'Z';
}

function getDateString(d) {
  var hour = d.getHours();
  var minute = d.getMinutes();
  var ap = "am";
  if (hour > 11) { ap = "pm"; }
  if (hour > 12) { hour = hour - 12; }
  if (hour == 0) { hour = 12; }
  if (minute < 10) { minute = "0" + minute; }

  var dString =  hour+":"+minute+ap + " " + (d.getMonth()+1)+"/"+d.getDate()+"/"+d.getFullYear();

  return dString;
}


function countDown() {
  if (window.userTimeLeft > 0)
    window.userTimeLeft--;
  $('#secondsCountdown').html(window.userTimeLeft);
}


function logMessage(m) {
  var d = new Date();
  var newMsg = $('<p>' + m + '<br /><span class="label label-info"><abbr class="timeago" title="' + ISODateString(d) + '">' + getDateString(d) + '</abbr></span></p>').hide();
  $('#log').prepend(newMsg);
  newMsg.show(200);

  // get rid of old entries
  if ($('#log p').length > 8) {
      $('#log p').last().hide(200).remove();
  }

  //jQuery("abbr.timeago").timeago();
}


function setupSocket() {
  window.iosocket = io.connect('/');

  window.iosocket.on('connect', function() {
    logMessage('<b>connected</b>');
  });

  window.iosocket.on('disconnect', function() {
    logMessage('<b>disconnected</b>');

    if (window.userTimer !== undefined)
      clearInterval(window.userTimer);

    $('#viewerCount').html('?');
    $('#lineCount').html('?');
    $('#secondsCountdown').html('?');
    $('#currentUser').html('?');
    $('#currentNickname').html('?');

    $('#usersAhead').hide();
    $('#inLineLabel').hide();
    $('#getInLineBtn').show();
    $('#inControlLabel').hide();
  });

  // called anytime any user sets a pattern
  window.iosocket.on('pattern_set', function(data) {
    if (data.pattern === 'halo' || data.pattern === 'spin' || data.pattern === 'glow')
      logMessage('<b>' + data.nickname + '</b><br /> set notification ' + data.pattern);
    else
      logMessage('<b>' + data.nickname + '</b><br /> set mood ' + data.pattern);
  });

  // called anytime any user sets a pattern config
  window.iosocket.on('pattern_config_set', function(data) {
    logMessage('<b>' + data.nickname + '</b><br /> set ' + data.pattern + ' ' + data.config + ' to ' + data.value);
  });

  window.iosocket.on('queue_state', function(data) {
    $('#currentUser').html(data.current_user);
    $('#viewerCount').html(data.viewers);
    $('#lineCount').html(data.current_queue.length);

    if (data.current_queue.indexOf(window.nickname) == -1 && data.current_user != window.nickname) {
      $('#inLineLabel').hide();
      $('#getInLineBtn').show();
      $('#inControlLabel').hide();
      $('#usersAhead').hide();

      $('#controlPanel').hide();
      $('#waitingPanel').show();
    }

    var totalUserCount = data.current_queue.length;

    if (data.current_queue.indexOf(window.nickname) !== -1) {
      $('#usersAhead').show();
      $('#usersAheadCount').html(data.current_queue.indexOf(window.nickname));
    } else if (data.current_user === window.nickname) {
      $('#usersAheadCount').html('0');
    }

    // send current user to action log if it has changed
    if (lastUser !== data.current_user)
      logMessage('<b>' + data.current_user + '</b><br />is in control');

    lastUser = data.current_user;

    // clear out the magicKey so events are not sent over the wire
    if (data.current_user !== window.nickname)
      window.magicKey = '';

    // setup countdown timer
    if (window.userTimer !== undefined)
      clearInterval(window.userTimer);

    window.userTimeLeft = parseInt(Math.round(data.seconds_until_next_user));
    $('#secondsCountdown').html(window.userTimeLeft);

    // tick down every second
    window.userTimer = setInterval(countDown, 1000);
  });

  window.iosocket.on('entered_queue', function(data) {
    window.nickname = data.nickname;
    $('#currentNickname').html(window.nickname);
    $('#inLineLabel').show();
    $('#getInLineBtn').hide();
    $('#inControlLabel').hide();
  });

  window.iosocket.on('assigned_username', function(data) {
    window.nickname = data.nickname;
    $('#currentNickname').html(window.nickname);
  });

  window.iosocket.on('in_control', function(data) {
    // reset video timeout
    resetTimeout();

    window.magicKey = data.magicKey;

    $('#usersAhead').hide();

    $('#controlPanel').show();
    $('#waitingPanel').hide();
    $('#inLineLabel').hide();
    $('#getInLineBtn').hide();
    $('#inControlLabel').show();
  });

  // setup queue button listener
  $('#getInLineBtn').click(function() {
    // reset video timeout
    resetTimeout();

    if (window.iosocket.socket.connected)
      window.iosocket.emit('enter_queue');
  });
}


/* ROUTED TO SOCKET.IO */
function activatePattern(id) {
  // make all nav items inactive
  $(".nav-item").removeClass('active');
  // make selected item active
  $("#" + id + "Nav").addClass('active');

  // hide all control panels
  $(".control-panel").hide();
  // show the selected panel
  $("#" + id).show();

  if (id === 'debug')
    return;

  lastPattern = id;
  console.log('activating ' + id);
  if (window.iosocket.socket.connected && window.magicKey !== '') {
    window.iosocket.emit('control', {'magicKey': window.magicKey, 'controlType': 'pattern', 'pattern': id});
  }
}


function sendQueuedPacket() {
  if (queuedPacket !== undefined) {
    window.lastPacket = (new Date()).getTime();
    queuedTimer = undefined;
    queuedPacket();
    queuedPacket = undefined;
  }
}



function setPatternConfig(configName, configVal) {
  var command = function() {
    if (window.iosocket.socket.connected && window.magicKey !== '') {
      console.log('set config ' + configName + ' at ' + configVal + ' for pattern ' + lastPattern);
      window.iosocket.emit('control', {
        'magicKey': window.magicKey,
        'controlType': 'patternConfig',
        'pattern': lastPattern,
        'configName': configName,
        'configVal': configVal
      });
    }
  };

  if ((new Date()).getTime() - window.lastPacket < 500) {
    // clear any timer currently set
    if (queuedTimer !== undefined) {
      clearTimeout(queuedTimer);
      queuedTimer = undefined;
    }

    // queue packet
    queuedPacket = command;
    queuedTimer = setTimeout(sendQueuedPacket, 500);
  } else {
    // we've waited long enough, send command immediately
    window.lastPacket = (new Date()).getTime();
    command();
  }
}

function setDebugConfig(patId, configId, configVal) {
  if ((new Date()).getTime() - window.lastPacket < 500)
    return;

  window.lastPacket = (new Date()).getTime();

  console.log('set config ' + configId + ' at ' + configVal + ' for pattern ' + patId);
  window.iosocket.emit('control', {
    'magicKey': window.magicKey,
    'controlType': 'debug',
    'pattern': patId,
    'configId': configId,
    'configVal': configVal
  });
}




/* off pattern */
function setupOffPanel() {
  activatePattern('off');

  if (setupStates.off)
    return;
  setupStates['off'] = true;

  // no config needed
}


/* light pattern */
function setupLightPanel() {
  activatePattern('light');

  if (setupStates.light)
    return;
  setupStates['light'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#light-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setPatternConfig('hue', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 255,
      min: 0,
      max: 255,
      render: '#light-brightness'
    });
    
    xSlider.after('valueChange', function(e) {
      var brightness = e.newVal;
      setPatternConfig('brightness', parseInt(brightness));
    });

    // BUTTON SETUP
    $( "#patternLightCandleBtn" ).click(function() {
      setPatternConfig('type', 1);
    });

    $( "#patternLightTungstenBtn" ).click(function() {
      setPatternConfig('type', 2);
    });

    $( "#patternLightIncandescentBtn" ).click(function() {
      setPatternConfig('type', 3);
    });

    $( "#patternLightHalogenBtn" ).click(function() {
      setPatternConfig('type', 4);
    });

    $( "#patternLightFluorescentBtn" ).click(function() {
      setPatternConfig('type', 5);
    });

    $( "#patternLightSunlightBtn" ).click(function() {
      setPatternConfig('type', 6);
    });
  });
}


/* digital rain pattern */
function setupDigitalRainPanel() {
  activatePattern('digitalrain');

  if (setupStates.digitalRain)
    return;
  setupStates['digitalRain'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#digitalrain-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setPatternConfig('hue', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 6,
      min: 0,
      max: 25,
      render: '#digitalrain-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setPatternConfig('speed', parseInt(speed));
    });
  });
}


/* flame pattern */
function setupFlamePanel() {
  activatePattern('flame');

  if (setupStates.flame)
    return;
  setupStates['flame'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#flame-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setPatternConfig('hue', parseInt(hue));
    });
  });
}


/* halo pattern */
function setupHaloPanel() {
  activatePattern('halo');

  if (setupStates.halo)
    return;
  setupStates['halo'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#halo-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setPatternConfig('hue', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 30,
      min: 0,
      max: 255,
      render: '#halo-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setPatternConfig('speed', parseInt(speed));
    });
  });
}


/* spiral pattern */
function setupSpiralPanel() {
  activatePattern('spiral');

  if (setupStates.spiral)
    return;
  setupStates['spiral'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#spiral-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setPatternConfig('hue', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 26,
      min: 0,
      max: 255,
      render: '#spiral-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setPatternConfig('speed', parseInt(speed));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 255,
      min: 0,
      max: 255,
      render: '#spiral-brightness'
    });
    
    xSlider.after('valueChange', function(e) {
      var brightness = e.newVal;
      setPatternConfig('brightness', parseInt(brightness));
    });
  });
}


/* music pattern */
function setupRavePanel() {
  activatePattern('rave');

  if (setupStates.rave)
    return;
  setupStates['rave'] = true;

  if (!window.debugMode)
    return;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheelL = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#music-low-hue',
      strings: { label:'Low Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheelL.after('valueChange', function(e) {
      var hue = hueWheelL.get('value');
      setPatternConfig('low-hue', parseInt(hue));
    });

    var hueWheelM = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#music-mid-hue',
      strings: { label:'Mid Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheelM.after('valueChange', function(e) {
      var hue = hueWheelM.get('value');
      setPatternConfig('mid-hue', parseInt(hue));
    });

    var hueWheelH = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#music-high-hue',
      strings: { label:'High Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheelH.after('valueChange', function(e) {
      var hue = hueWheelH.get('value');
      setPatternConfig('high-hue', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 21,
      min: 0,
      max: 25,
      render: '#music-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setPatternConfig('speed', parseInt(speed));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 0,
      min: 0,
      max: 1024,
      render: '#music-kick-threshold'
    });
    
    xSlider.after('valueChange', function(e) {
      var kt = e.newVal;
      setPatternConfig('kick-threshold', parseInt(kt));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 0,
      min: 0,
      max: 100,
      render: '#music-low-strength'
    });
    
    xSlider.after('valueChange', function(e) {
      var lStrength = e.newVal;
      setPatternConfig('low-strength', parseInt(lStrength));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 0,
      min: 0,
      max: 100,
      render: '#music-mid-strength'
    });
    
    xSlider.after('valueChange', function(e) {
      var mStrength = e.newVal;
      setPatternConfig('mid-strength', parseInt(mStrength));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 0,
      min: 0,
      max: 100,
      render: '#music-high-strength'
    });
    
    xSlider.after('valueChange', function(e) {
      var hStrength = e.newVal;
      setPatternConfig('high-strength', parseInt(hStrength));
    });

    // BUTTON SETUP
    $( "#patternMusicBassOffBtn" ).click(function() {
      setPatternConfig('bass', 0);
    });

    $( "#patternMusicBassOnBtn" ).click(function() {
      setPatternConfig('bass', 1);
    });
  });
}


/* weather pattern */
function setupWeatherPanel() {
  activatePattern('weather');

  if (setupStates.weather)
    return;
  setupStates['weather'] = true;

  // no config needed
}


/* spin pattern */
function setupSpinPanel() {
  activatePattern('spin');

  if (setupStates.spin)
    return;
  setupStates['spin'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#lighthouse-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setPatternConfig('hue', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 3,
      min: 0,
      max: 90,
      render: '#lighthouse-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setPatternConfig('speed', parseInt(speed));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 255,
      min: 0,
      max: 255,
      render: '#lighthouse-brightness'
    });
    
    xSlider.after('valueChange', function(e) {
      var brightness = e.newVal;
      setPatternConfig('brightness', parseInt(brightness));
    });
  });
}


/* strobe pattern */
function setupStrobePanel() {
  activatePattern('strobe');

  if (setupStates.strobe)
    return;
  setupStates['strobe'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
  var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#strobe-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setPatternConfig('hue', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 7,
      min: 0,
      max: 25,
      render: '#strobe-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setPatternConfig('speed', parseInt(speed));
    });

    $( "#patternStrobeResetColorBtn" ).click(function() {
      setPatternConfig('colorEnabled', 0);
    });
  });
}


/* lava pattern */
function setupLavaPanel() {
  activatePattern('lava');

  if (setupStates.lava)
    return;
  setupStates['lava'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
  var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#lava-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setPatternConfig('hue', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 1,
      min: 0,
      max: 255,
      render: '#lava-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setPatternConfig('speed', parseInt(speed));
    });
  });
}


/* rainbow pattern */
function setupRainbowPanel() {
  activatePattern('rainbow');

  if (setupStates.rainbow)
    return;
  setupStates['rainbow'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 1,
      min: 0,
      max: 36,
      render: '#rainbow-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setPatternConfig('speed', parseInt(speed));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 255,
      min: 0,
      max: 255,
      render: '#rainbow-brightness'
    });
    
    xSlider.after('valueChange', function(e) {
      var brightness = e.newVal;
      setPatternConfig('brightness', parseInt(brightness));
    });
  });
}


/* lines pattern */
function setupLinesPanel() {
  activatePattern('lines');

  if (setupStates.lines)
    return;
  setupStates['lines'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
  var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#lines-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setPatternConfig('hue', parseInt(hue));
    });
  });
}


/* sparkle pattern */
function setupSparklePanel() {
  activatePattern('sparkle');

  if (setupStates.sparkle)
    return;
  setupStates['sparkle'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
  var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#pulse-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setPatternConfig('hue', parseInt(hue));
    });
  });
}




/* fireworks pattern */
function setupFireworksPanel() {
  activatePattern('fireworks');

  if (setupStates.fireworks)
    return;
  setupStates['fireworks'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 75,
      min: 0,
      max: 255,
      render: '#fireworks-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setPatternConfig('speed', parseInt(speed));
    });
  });
}


/* plasma pattern */
function setupPlasmaPanel() {
  activatePattern('plasma');

  if (setupStates.plasma)
    return;
  setupStates['plasma'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#boost-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setPatternConfig('hue', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 4,
      min: 0,
      max: 25,
      render: '#boost-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setPatternConfig('speed', parseInt(speed));
    });
  });
}





/* glow pattern */
function setupGlowPanel() {
  activatePattern('glow');

  if (setupStates.glow)
    return;
  setupStates['glow'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#glow-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setPatternConfig('hue', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 10,
      min: 0,
      max: 120,
      render: '#glow-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setPatternConfig('speed', parseInt(speed));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 255,
      min: 0,
      max: 255,
      render: '#glow-brightness'
    });
    
    xSlider.after('valueChange', function(e) {
      var brightness = e.newVal;
      setPatternConfig('brightness', parseInt(brightness));
    });
  });
}


/* pulse pattern */
function setupPulsePanel() {
  activatePattern('pulse');

  if (setupStates.pulse)
    return;
  setupStates['pulse'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 128,
      min: 0,
      max: 255,
      render: '#smokestack-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setPatternConfig('speed', parseInt(speed));
    });
  });
}


/* debug panel */
function setupDebugPanel() {
  activatePattern('debug');

  if (setupStates.debug)
    return;
  setupStates['debug'] = true;

  // setup submit action
  $('#patternDebugBtn').click(function() {
    setDebugConfig($('#debugPatternId').val(), $('#debugConfigId').val(), $('#debugConfigVal').val())
  });
}