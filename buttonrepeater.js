/**
 * Creates an object which allows easy repeat handling
 *
 * @param initialDelay Number of milliseconds before repeating
 * @param repeatDelay Once repeating, this is the interval (in ms)
 */
ButtonRepeater = function(initialDelay, repeatDelay) {
  this.repeatTimer = {};
  this.initialDelay = initialDelay;
  this.repeatDelay = repeatDelay;

  this.getTime = function() {
    return new Date().getTime();
  }

  /**
   * Starts the repeat logic for an element
   *
   * @param btn The DOM id of the element that's being repeated
   * @param func The code to execute upon press/repeat
   */
  this.start = function(btn, func) {
    this.stop(btn);
    this.repeatTimer[btn] = {stamp: this.getTime()};
    var copy = this;
    // Call the function and tell it what to call once done
    func(function(){
      // Make sure we don't do the next section if user already released button
      if (btn in copy.repeatTimer) {
        var d = copy.getTime() - copy.repeatTimer[btn]["stamp"];
        var t = Math.max(Math.min(copy.initialDelay - d, copy.initialDelay), 10);
        console.log("Time to execute: " + d + ", need to sleep " + t + " to wait " + copy.initialDelay);
        copy.repeatTimer[btn] = {
          "timer" : setTimeout( function() {
            copy.issueRepeat(copy, btn);
          }, t),
          "func" : func
        };
      }
    });
  }

  /**
   * Stops the repeat logic for an element
   *
   * @param btn The DOM id of the element that's being repeated
   */
  this.stop = function(btn) {
    if (btn in this.repeatTimer) {
      clearTimeout(this.repeatTimer[btn]);
      delete this.repeatTimer[btn];
    }
  }

  this.issueRepeat = function(copy, btn) {
    console.log(">Repeat: " + btn);
    if (btn in copy.repeatTimer) {
      // Make sure to find out when we called
      copy.repeatTimer[btn].stamp = copy.getTime();

      // Call the function
      copy.repeatTimer[btn].func(
        function(){
          // Deal with already destroyed timers
          if (copy.repeatTimer[btn] == undefined)
            return;
          var d = copy.getTime() - copy.repeatTimer[btn].stamp;
          var t = Math.max(Math.min(copy.repeatDelay - d, copy.repeatDelay), 10);
          console.log("Time to execute: " + d + ", need to sleep " + t + " to wait " + copy.repeatDelay);
          copy.repeatTimer[btn].timer = setTimeout(
            function() {
              copy.issueRepeat(copy, btn);
            }, t);
        });
    }
    console.log("<Repeat: " + btn);
  }

  /**
   * Simplifies the use of this class, just provide a DOM ID and
   * it will be repeating.
   *
   * @param btn The DOM ID of the element to wrap
   * @param func The code to execute when clicked and repeated
   */
  this.wrap = function(btn, func) {
    var copy = this;
    $("#" + btn).mouseup( function() {copy.stop(btn); });
    $("#" + btn).mouseout( function() {copy.stop(btn); });
    $("#" + btn).mousedown( function() {copy.start(btn, func); });
  }
}
