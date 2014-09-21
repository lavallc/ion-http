var setupStates = {};
var lastMood = 'off';

window.lastPacket = (new Date()).getTime();
var queuedPacket;
var queuedTimer;




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



function logMessage(m) {
  var d = new Date();
  var newMsg = $('<p>' + m + '<br /><span class="label label-info"><abbr class="timeago" title="' + ISODateString(d) + '">' + getDateString(d) + '</abbr></span></p>').hide();
  $('#log').prepend(newMsg);
  newMsg.show(200);

  // get rid of old entries
  if ($('#log p').length > 8) {
      $('#log p').last().hide(200).remove();
  }
}


function setupSocket() {
  window.iosocket = io.connect('/');

  window.iosocket.on('connect', function() {
    logMessage('<b>connected</b>');
  });

  window.iosocket.on('disconnect', function() {
    logMessage('<b>disconnected</b>');
  });

  // called anytime any user sets a mood
  window.iosocket.on('mood_set', function(data) {
    logMessage('set mood ' + data.mood);
  });

  // called anytime any user sets a mood config
  window.iosocket.on('mood_config_set', function(data) {
    if (typeof data.value !== 'undefined') {
      logMessage('set ' + data.mood + ' ' + data.config + ' to ' + data.value);
    } else {
      logMessage('set ' + data.mood + ' ' + data.config);
    }
  });
}


/* ROUTED TO SOCKET.IO */
function activateMood(id) {
  // make all nav items inactive
  $(".nav-item").removeClass('active');
  // make selected item active
  $("#" + id + "Nav").addClass('active');

  // hide all control panels
  $(".control-panel").hide();
  // show the selected panel
  $("#" + id).show();

  lastMood = id;
  console.log('activating ' + id);
  if (window.iosocket.socket.connected) {
    window.iosocket.emit('control', {'controlType': 'mood', 'mood': id});
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



function setMoodConfig(configName, configVal) {
  var command = function() {
    if (window.iosocket.socket.connected) {
      console.log('set config ' + configName + ' at ' + configVal + ' for mood ' + lastMood);
      if (typeof configVal !== 'undefined') {
        window.iosocket.emit('control', {
          'controlType': 'moodConfig',
          'mood': lastMood,
          'configName': configName,
          'configVal': configVal
        });
      } else {
        window.iosocket.emit('control', {
          'controlType': 'moodConfig',
          'mood': lastMood,
          'configName': configName
        });
      }
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



/* off mood */
function setupOffPanel() {
  activateMood('off');

  if (setupStates.off)
    return;
  setupStates['off'] = true;

  // no config needed
}


/* light mood */
function setupLightPanel() {
  activateMood('light');

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
      setMoodConfig('color', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 190,
      min: 0,
      max: 255,
      render: '#light-brightness'
    });
    
    xSlider.after('valueChange', function(e) {
      var brightness = e.newVal;
      setMoodConfig('brightness', parseInt(brightness));
    });

    // BUTTON SETUP
    $( "#moodLightCandleBtn" ).click(function() {
      setMoodConfig('candle');
    });

    $( "#moodLightIncandescentBtn" ).click(function() {
      setMoodConfig('incandescent');
    });

    $( "#moodLightFluorescentBtn" ).click(function() {
      setMoodConfig('fluorescent');
    });

    $( "#moodLightBlueSkyBtn" ).click(function() {
      setMoodConfig('bluesky');
    });

    $( "#moodLightSunlightBtn" ).click(function() {
      setMoodConfig('sunlight');
    });

    $( "#moodLightLowGlowOffBtn" ).click(function() {
      setMoodConfig('lowglow', 0);
    });

    $( "#moodLightLowGlowOnBtn" ).click(function() {
      setMoodConfig('lowglow', 1);
    });
  });
}


/* flame mood */
function setupFlamePanel() {
  activateMood('flame');

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
      setMoodConfig('color', parseInt(hue));
    });
  });

  $( "#moodFlameInfernoOffBtn" ).click(function() {
    setMoodConfig('inferno', 0);
  });

  $( "#moodFlameInfernoOnBtn" ).click(function() {
    setMoodConfig('inferno', 1);
  });

  $( "#moodFlameSoundEnabledOffBtn" ).click(function() {
    setMoodConfig('enablesound', 0);
  });

  $( "#moodFlameSoundEnabledOnBtn" ).click(function() {
    setMoodConfig('enablesound', 1);
  });
}


/* digital rain mood */
function setupDigitalRainPanel() {
  activateMood('digitalrain');

  if (setupStates.digitalRain)
    return;
  setupStates['digitalRain'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      value: 120,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#digitalrain-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setMoodConfig('color', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 153,
      min: 0,
      max: 255,
      render: '#digitalrain-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setMoodConfig('speed', parseInt(speed));
    });
  });
}


/* rainbow mood */
function setupRainbowPanel() {
  activateMood('rainbow');

  if (setupStates.rainbow)
    return;
  setupStates['rainbow'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 10,
      min: 0,
      max: 150,
      render: '#rainbow-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setMoodConfig('speed', parseInt(speed));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 153,
      min: 0,
      max: 255,
      render: '#rainbow-brightness'
    });
    
    xSlider.after('valueChange', function(e) {
      var brightness = e.newVal;
      setMoodConfig('brightness', parseInt(brightness));
    });
  });

  $( "#moodRainbowReverseOffBtn" ).click(function() {
    setMoodConfig('reverse', 0);
  });

  $( "#moodRainbowReverseOnBtn" ).click(function() {
    setMoodConfig('reverse', 1);
  });
}


/* weather mood */
function setupWeatherPanel() {
  activateMood('weather');

  if (setupStates.weather)
    return;
  setupStates['weather'] = true;

  // forecast
  $( "#moodWeatherForecastOffBtn" ).click(function() {
    setMoodConfig('forecast', 0);
  });

  $( "#moodWeatherForecastOnBtn" ).click(function() {
    setMoodConfig('forecast', 1);
  });
}


/* thermometer mood */
function setupThermometerPanel() {
  activateMood('thermometer');

  if (setupStates.thermometer)
    return;
  setupStates['thermometer'] = true;

  // forecast
  $( "#moodThermometerForecastOffBtn" ).click(function() {
    setMoodConfig('forecast', 0);
  });

  $( "#moodThermometerForecastOnBtn" ).click(function() {
    setMoodConfig('forecast', 1);
  });
}


/* hourglass mood */
function setupHourglassPanel() {
  activateMood('hourglass');

  if (setupStates.hourglass)
    return;
  setupStates['hourglass'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      value: 44,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#hourglass-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setMoodConfig('color', parseInt(hue));
    });
  });

  $( "#moodHourglassSetTimeBtn" ).click(function() {
    var time = prompt("Enter time (seconds)", "");

    if (time != null && isPositiveInteger(time)) {
      setMoodConfig('time', parseInt(time));
    }
  });
}
function isPositiveInteger(n) {
  return n >>> 0 === parseFloat(n);
}


/* lava mood */
function setupLavaPanel() {
  activateMood('lava');

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
      setMoodConfig('color', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 10,
      min: 0,
      max: 255,
      render: '#lava-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setMoodConfig('speed', parseInt(speed));
    });
  });
}


/* lines mood */
function setupLinesPanel() {
  activateMood('lines');

  if (setupStates.lines)
    return;
  setupStates['lines'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      value: 240,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#lines-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setMoodConfig('color', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 50,
      min: 0,
      max: 255,
      render: '#lines-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setMoodConfig('speed', parseInt(speed));
    });
  });
}


/* plasma mood */
function setupPlasmaPanel() {
  activateMood('plasma');

  if (setupStates.plasma)
    return;
  setupStates['plasma'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      value: 30,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#plasma-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setMoodConfig('color', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 20,
      min: 0,
      max: 150,
      render: '#plasma-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setMoodConfig('speed', parseInt(speed));
    });
  });

  $( "#moodPlasmaSoundEnabledOffBtn" ).click(function() {
    setMoodConfig('soundenabled', 0);
  });

  $( "#moodPlasmaSoundEnabledOnBtn" ).click(function() {
    setMoodConfig('soundenabled', 1);
  });
}


/* sparkle mood */
function setupSparklePanel() {
  activateMood('sparkle');

  if (setupStates.sparkle)
    return;
  setupStates['sparkle'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      value: 200,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#sparkle-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setMoodConfig('color', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 10,
      min: 0,
      max: 150,
      render: '#sparkle-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setMoodConfig('speed', parseInt(speed));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 166,
      min: 0,
      max: 255,
      render: '#sparkle-brightness'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setMoodConfig('sparklebrightness', parseInt(speed));
    });
  });
}


/* spiral mood */
function setupSpiralPanel() {
  activateMood('spiral');

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
      setMoodConfig('color', parseInt(hue));
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
      setMoodConfig('speed', parseInt(speed));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 190,
      min: 0,
      max: 255,
      render: '#spiral-brightness'
    });
    
    xSlider.after('valueChange', function(e) {
      var brightness = e.newVal;
      setMoodConfig('brightness', parseInt(brightness));
    });
  });
}


/* fireworks mood */
function setupFireworksPanel() {
  activateMood('fireworks');

  if (setupStates.fireworks)
    return;
  setupStates['fireworks'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#fireworks-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setMoodConfig('dominantcolor', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 60,
      min: 0,
      max: 255,
      render: '#fireworks-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setMoodConfig('speed', parseInt(speed));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 215,
      min: 0,
      max: 255,
      render: '#fireworks-frequency'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setMoodConfig('frequency', parseInt(speed));
    });
  });

  $( "#moodFireworksColorOffBtn" ).click(function() {
    setMoodConfig('enablecolor', 0);
  });

  $( "#moodFireworksColorOnBtn" ).click(function() {
    setMoodConfig('enablecolor', 1);
  });

  $( "#moodFireworksSoundEnabledOffBtn" ).click(function() {
    setMoodConfig('soundenabled', 0);
  });

  $( "#moodFireworksSoundEnabledOnBtn" ).click(function() {
    setMoodConfig('soundenabled', 1);
  });
}


/* strobe mood */
function setupStrobePanel() {
  activateMood('strobe');

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
      setMoodConfig('color', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 150,
      min: 0,
      max: 255,
      render: '#strobe-interval'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setMoodConfig('interval', parseInt(speed));
    });
  });

  $( "#moodStrobeColorOffBtn" ).click(function() {
    setMoodConfig('colorenabled', 0);
  });

  $( "#moodStrobeColorOnBtn" ).click(function() {
    setMoodConfig('colorenabled', 1);
  });
}


/* pulse mood */
function setupPulsePanel() {
  activateMood('pulse');

  if (setupStates.pulse)
    return;
  setupStates['pulse'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 255,
      min: 0,
      max: 255,
      render: '#pulse-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setMoodConfig('speed', parseInt(speed));
    });
  });

  $( "#moodPulseSoundEnabledOffBtn" ).click(function() {
    setMoodConfig('soundenabled', 0);
  });

  $( "#moodPulseSoundEnabledOnBtn" ).click(function() {
    setMoodConfig('soundenabled', 1);
  });
}


/* rave mood */
function setupRavePanel() {
  activateMood('rave');

  if (setupStates.rave)
    return;
  setupStates['rave'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#rave-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setMoodConfig('dominantcolor', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 156,
      min: 0,
      max: 255,
      render: '#rave-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setMoodConfig('speed', parseInt(speed));
    });

    // BUTTON SETUP
    $( "#moodRaveBassOffBtn" ).click(function() {
      setMoodConfig('bassboost', 0);
    });

    $( "#moodRaveBassOnBtn" ).click(function() {
      setMoodConfig('bassboost', 1);
    });
  });
}


/* whirlpool mood */
function setupWhirlpoolPanel() {
  activateMood('whirlpool');

  if (setupStates.whirlpool)
    return;
  setupStates['whirlpool'] = true;

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#whirlpool-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setMoodConfig('dominantcolor', parseInt(hue));
    });

    // Create a horizontal Slider using all defaults
    var xSlider = new Y.Slider({
      value: 125,
      min: 0,
      max: 255,
      render: '#whirlpool-speed'
    });
    
    xSlider.after('valueChange', function(e) {
      var speed = e.newVal;
      setMoodConfig('speed', parseInt(speed));
    });

    // BUTTON SETUP
    $( "#moodRaveBassOffBtn" ).click(function() {
      setMoodConfig('bassboost', 0);
    });

    $( "#moodRaveBassOnBtn" ).click(function() {
      setMoodConfig('bassboost', 1);
    });
  });
}


/* volume mood */
function setupVolumePanel() {
  activateMood('volume');

  if (setupStates.volume)
    return;
  setupStates['volume'] = true;

  // no config needed
}