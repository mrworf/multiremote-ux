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

  /**
   * Starts the repeat logic for an element
   *
   * @param btn The DOM id of the element that's being repeated
   * @param func The code to execute upon press/repeat
   */
  this.start = function(btn, func) {
    var copy = this;
    copy.stop(btn);
    func(function(){copy.repeatTimer[btn] = {"timer" : setTimeout( function() {copy.issueRepeat(copy, btn);}, copy.initialDelay), "func" : func};});
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
      copy.repeatTimer[btn].func(
        function(){
          if (copy.repeatTimer[btn] == undefined)
            return;
          copy.repeatTimer[btn].timer = setTimeout(
            function() {
              copy.issueRepeat(copy, btn);
            }, copy.repeatDelay);
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
