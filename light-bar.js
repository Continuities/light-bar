(function() {

  /** Constants **/
  var WIDTH = 30
  ,   HEIGHT = 7 // MUST BE ODD
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
  var sinHeight = function(x, harmonic) {
    var xPos = (x / (WIDTH - 1)) * Math.PI * harmonic;
    var yPos = (Math.sin(xPos) + 1) / 2;
    yPos *= HEIGHT - 1;
    return Math.round(yPos);
  };
  var colourSum = function(a, b) {
    var colour = a + b;
    if (a > 0 && b > 0) {
      //colour /= 2;
    }
    return cap(Math.round(colour), 0, 255);
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
      return new Colour(colourSum(this.r, r), colourSum(this.g, g), colourSum(this.b, b));
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
      model.leds.forEach(function(rowArray, row) {
        rowArray.forEach(function(colour, col) {
          model.leds[row][col] = model.leds[row][col].add(-fade,-fade,-fade);
        });
      });
    }
  };

  function Lighter(transmissionDelay, diffuse) {
    this.diffuse = cap(diffuse || 0, 0, 1);
    this.transmissionDelay = transmissionDelay;
  }
  Lighter.prototype = {
    constructor: Lighter,
    go: function(model, delta) {
      var luminosity = cap(delta / this.transmissionDelay, 0, 1);
      var lighter = this;
      model.lights.forEach(function(light) {
        model.leds[light.row][light.col] = model.leds[light.row][light.col].add(light.colour.dim(luminosity));
        var diffuse = light.colour.dim(lighter.diffuse * luminosity);
        if (light.col > 0) {
          model.leds[light.row][light.col - 1] = model.leds[light.row][light.col - 1].add(diffuse);
        }
        if (light.col < WIDTH - 2) {
          model.leds[light.row][light.col + 1] = model.leds[light.row][light.col + 1].add(diffuse);
        }
        if (light.row > 0) {
          model.leds[light.row - 1][light.col] = model.leds[light.row - 1][light.col].add(diffuse);
        }
        if (light.row < HEIGHT - 2) {
          model.leds[light.row + 1][light.col] = model.leds[light.row + 1][light.col].add(diffuse);
        }
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

  function StandingWave(harmonic, speed, colour, offset, scanSpeed) {
    this.offset = offset || 0;
    this.harmonic = harmonic;
    this.speed = speed;
    this.lights = [];
    this.totalDelta = 0;
    this.scanSpeed = scanSpeed || 0;
    for (var i = 0; i < WIDTH; i++) {
      var light = new LightSource(sinHeight(i + this.offset, this.harmonic), i, colour);
      this.lights.push(light);
      model.lights.push(light);
    }
  }
  StandingWave.prototype = {
    constructor: StandingWave,
    go: function(model, delta) {
      this.totalDelta = (this.totalDelta + delta) % this.speed;
      var wavePos = this.speed ? this.totalDelta / this.speed * Math.PI * 2 : 1;
      var wave = this;
      if (this.scanSpeed) {
        this.offset = (this.offset + (delta / this.scanSpeed) * WIDTH) % (WIDTH * 2);
      }
      this.lights.forEach(function(light) {
        var max = sinHeight(light.col + wave.offset, wave.harmonic) - Math.floor(HEIGHT / 2);
        var current = (max * Math.sin(wavePos)) + Math.floor(HEIGHT / 2);
        light.row = Math.round(current);
      });
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
    processors.push(new Fader(1000));
    processors.push(new Lighter(300, 1));
    processors.push(new StandingWave(1, 3000, new Colour(0, 153, 204).dim(0.4), 4, 20000));
    processors.push(new StandingWave(2, 4000, new Colour(204, 255, 204).dim(0.4), 0, 6000));
    processors.push(new StandingWave(3, 5000, new Colour(102, 204, 255).dim(0.4), 2, 10000));
    //processors.push(new LightShifter(100));
    //processors.push(new Oscillator(0.75, 100, function() { return new Colour(0, 255, 0); }));
    //processors.push(new Oscillator(0.5, 60, function() { return new Colour(255, 0, 0); }));
    //processors.push(new Oscillator(0.25, 100, function() { return new Colour(0, 0, 255); }));
    last = Date.now();
    drawLoop();
  }

  init();

})();
