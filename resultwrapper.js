/**
 * This class allow for easy handling of async calls
 */

var ResultWrapper = function(ux, timeout) {
  this.cmdmap = {};
  this.ux = ux;
  this.timeout = timeout;

  /**
   * Handles the results generated by functions in MultiRemoteClient.
   * If there is a mapping between ID and function, it's carried out,
   * otherwise nothing happens.
   *
   * @param id The ID of the command which finished
   * @param success true/false
   * @param data Any resulting data (or null)
   */
  this.handler = function(id, success, data) {
    if (id in this.cmdmap) {
      state = this.cmdmap[id];
      if (state.blocking) {
        //console.log(state);
        clearTimeout(state.timerid);
        this.ux.showBusyIndicator(false);
        this.ux.blockUI(false);
      }
      delete this.cmdmap[id];
      state.handler(success, data);
    }
  }

  /**
   * Takes any MultiRemoteCommand and maps a function to be called
   * once the function returns. This is necessary since a lot of
   * functions are async and will return before they're done.
   * This simplifies the use of these functions.
   *
   * @param funcCommand Must return a multiremoteclient async id
   * @param funcFollowUp The function which should be called when command finishes
   * @param blockUI Wether or not to show the visual indicator when things take too long
   */
  this.wrap = function(funcCommand, funcFollowUp, blockUI) {
    id = funcCommand();
    self2 = this;
    this.cmdmap[id] = {handler: funcFollowUp, blocking: blockUI, timerid: 0};

    if (blockUI) {
      this.cmdmap[id].timerid = setTimeout(function(){console.log("Timeout!"); self2.ux.showBusyIndicator(true);}, this.timeout);
      this.ux.blockUI(true);
    }
  }
}
