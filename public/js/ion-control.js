var setupStates = {};
var lastPattern = 'off';

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

  // called anytime any user sets a pattern
  window.iosocket.on('pattern_set', function(data) {
    if (data.pattern === 'halo' || data.pattern === 'spin' || data.pattern === 'glow')
      logMessage('set notification ' + data.pattern);
    else
      logMessage('set mood ' + data.pattern);
  });

  // called anytime any user sets a pattern config
  window.iosocket.on('pattern_config_set', function(data) {
    if (typeof data.value !== 'undefined') {
      logMessage('set ' + data.pattern + ' ' + data.config + ' to ' + data.value);
    } else {
      logMessage('set ' + data.pattern + ' ' + data.config);
    }
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

  lastPattern = id;
  console.log('activating ' + id);
  if (window.iosocket.socket.connected) {
    window.iosocket.emit('control', {'controlType': 'pattern', 'pattern': id});
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
    if (window.iosocket.socket.connected) {
      console.log('set config ' + configName + ' at ' + configVal + ' for pattern ' + lastPattern);
      if (typeof configVal !== 'undefined') {
        window.iosocket.emit('control', {
          'controlType': 'patternConfig',
          'pattern': lastPattern,
          'configName': configName,
          'configVal': configVal
        });
      } else {
        window.iosocket.emit('control', {
          'controlType': 'patternConfig',
          'pattern': lastPattern,
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
      setPatternConfig('candle');
    });

    $( "#patternLightTungstenBtn" ).click(function() {
      setPatternConfig('tungsten');
    });

    $( "#patternLightIncandescentBtn" ).click(function() {
      setPatternConfig('incandescent');
    });

    $( "#patternLightHalogenBtn" ).click(function() {
      setPatternConfig('halogen');
    });

    $( "#patternLightFluorescentBtn" ).click(function() {
      setPatternConfig('fluorescent');
    });

    $( "#patternLightSunlightBtn" ).click(function() {
      setPatternConfig('sunlight');
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

  YUI().use('dial', 'event-valuechange', 'slider', function(Y){
    var hueWheel = new Y.Dial({
      min: 0,
      max: 360,
      stepsPerRevolution: 360,
      continuous: true,
      centerButtonDiameter: 0.4,
      render: '#music-hue',
      strings: { label:'Hue', resetStr:'Reset', tooltipHandle:'Drag to set value' }
    });

    hueWheel.after('valueChange', function(e) {
      var hue = hueWheel.get('value');
      setPatternConfig('hue', parseInt(hue));
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
      max: 100,
      render: '#music-low-strength'
    });
    
    xSlider.after('valueChange', function(e) {
      var lStrength = e.newVal;
      setPatternConfig('lows', parseInt(lStrength));
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
      setPatternConfig('mids', parseInt(mStrength));
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
      setPatternConfig('highs', parseInt(hStrength));
    });

    // BUTTON SETUP
    $( "#patternMusicBassOffBtn" ).click(function() {
      setPatternConfig('bassboost', 0);
    });

    $( "#patternMusicBassOnBtn" ).click(function() {
      setPatternConfig('bassboost', 1);
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
      setPatternConfig('interval', parseInt(speed));
    });

    $( "#patternStrobeResetColorBtn" ).click(function() {
      setPatternConfig('colorenabled', 0);
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