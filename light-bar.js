(function() {

  /** Constants **/
  var WIDTH = 20
  ,   HEIGHT = 5 // MUST BE ODD
  ;

  /** Private variables **/
  var model = {
    leds: [],
    lights: []
  }
  ,   processors = []
  ,   last
  ;

  /** Private functions **/
  var cap = function(val, min, max) {
    if (val > max) { return max; }
    if (val < min) { return min; }
    return val;
  };
  var getBar = (function() {
    var bar;

    return function() { 
      var i, j, row, led;
      if (!bar) {
        bar = document.createElement('div');
        bar.className="light-bar";
        for (i = 0; i < HEIGHT; i++) {
          row = document.createElement('div');
          row.className="row";
          for (j = 0; j < WIDTH; j++) {
            led = document.createElement('div');
            led.className = "led";
            led.setAttribute('id', 'led-' + i + '_' + j);
            row.appendChild(led);
          }
          bar.appendChild(row);
        }
        document.body.appendChild(bar);
      }
      return bar;
    };
  })();
  var led = (function() {
    var cache = {};
    return function(row, col) {
      var key = row + '_' + col;
      if (!cache[key]) {
        cache[key] = getBar().querySelector('#led-' + key);
      }
      return cache[key];
    };
  })();
  var eachLed = function(cb) {
    var row, col;
    for (row = 0; row < HEIGHT; row++) {
      for (col = 0; col < WIDTH; col++) {
        cb(led(row, col), row, col);
      }
    }
  };

  /** Private classes **/
  function Colour(r, g, b) {
    this.r = cap(r, 0, 255);
    this.g = cap(g, 0, 255);
    this.b = cap(b, 0, 255);
  }
  Colour.prototype = {
    constructor: Colour,
    add: function(r, g, b) {
      if (arguments.length === 1 && r instanceof Colour) {
        b = r.b;
        g = r.g;
        r = r.r;
      }
      return new Colour(cap(this.r + r, 0, 255), cap(this.g + g, 0, 255), cap(this.b + b, 0, 255));
    },
    dim: function(intensity) {
      intensity = cap(intensity, 0, 1);
      return new Colour(Math.round(this.r * intensity), Math.round(this.g * intensity), Math.round(this.b * intensity));
    },
    toCss: function() {
      return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',1)';
    }
  };

  function LightSource(row, col, colour) {
    this.row = row;
    this.col = col;
    this.colour = colour;
  }

  function Fader(delay) {
    this.delay = delay;
  }
  Fader.prototype = {
    constructor: Fader,
    go: function(model, delta) {
      var fade = cap(Math.round((delta / this.delay) * 255), 0, 255);
      //console.log(fade);
      model.leds.forEach(function(rowArray, row) {
        rowArray.forEach(function(colour, col) {
          model.leds[row][col] = model.leds[row][col].add(-fade,-fade,-fade);
        });
      });
    }
  };

  function Lighter(transmissionDelay) {
    this.transmissionDelay = transmissionDelay;
  }
  Lighter.prototype = {
    constructor: Lighter,
    go: function(model, delta) {
      var luminosity = cap(delta / this.transmissionDelay, 0, 1);
      model.lights.forEach(function(light) {
        model.leds[light.row][light.col] = model.leds[light.row][light.col].add(light.colour.dim(luminosity));
      });
    }
  };

  function Oscillator(speed, delay, colourGenerator) {
    this.speed = speed;
    this.generator = colourGenerator;
    this.y = 0;
    this.time = 0;
    this.totalDelta = 0;
    this.delay = delay;
  }
  Oscillator.prototype = {
    constructor: Oscillator,
    go: function(model, delta) {
      this.time = (this.time + (delta * this.speed)) % 1000;
      this.totalDelta += delta;
      var x = (this.time / 999) * (Math.PI * 2);
      this.y = Math.round(Math.sin(x) * Math.floor((HEIGHT / 2))) + Math.floor(HEIGHT / 2);

      if (this.totalDelta > this.delay) {
        this.totalDelta = 0;
        model.lights.push(new LightSource(this.y, 0, this.generator()));
      }
    }
  };

  function LightShifter(shiftDelay) {
    this.shiftDelay = shiftDelay;
    this.totalDelta = 0;
  }
  LightShifter.prototype = {
    constructor: LightShifter,
    go: function(model, delta) {
      this.totalDelta += delta;
      if (this.totalDelta < this.shiftDelay) { return; }
      this.totalDelta = 0;
      model.lights = model.lights.filter(function(light) {
        return ++light.col < WIDTH;
      });
    }
  };

  function drawLoop() {
    requestAnimationFrame(drawLoop);

    var delta = Date.now() - last;
    // Process the model
    processors.forEach(function(processor) {
      processor.go(model, delta);
    });

    // Update the display
    eachLed(function(led, row, col) {
      led.style.backgroundColor = model.leds[row][col].toCss();
    });
    last = Date.now();
  }

  function init() {
    var i, j;
    for (i = 0; i < HEIGHT; i++) {
      model.leds[i] = [];
      for (j = 0; j < WIDTH; j++) {
        model.leds[i][j] = new Colour(0, 0, 0);
      }
    }
    processors.push(new Fader(2000));
    processors.push(new Lighter(200));
    processors.push(new LightShifter(100));
    processors.push(new Oscillator(0.75, 100, function() { return new Colour(0, 255, 0); }));
    processors.push(new Oscillator(0.5, 60, function() { return new Colour(255, 0, 0); }));
    processors.push(new Oscillator(0.25, 100, function() { return new Colour(0, 0, 255); }));
    last = Date.now();
    drawLoop();
  }

  init();

})();
