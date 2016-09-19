(function() {

  /** Constants **/
  var WIDTH = 20
  ,   HEIGHT = 5
  ;

  /** Private functions **/
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

  getBar();

})();
