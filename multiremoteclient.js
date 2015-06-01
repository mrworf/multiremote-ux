/**
 * MultiRemoteClient - Contains all logic to talk to the server
 *
 * @param serverAddress Who to talk to
 * @param funcResults The function to call when a call has results
 *
 * @note All async functions will return results through the callback
 *       using the ID which was returned by the function call in the
 *       first place.
 */
MultiRemoteClient = function(serverAddress, funcResults) {
  this.cfgAddress = "http://" + serverAddress + ":5000";
  this.cfgResultFunc = funcResults;
  this.cmdCounter = 0;

  this.lstZones = {};
  this.lstScenes = {};

  /**
   * Initializes the class, making it possible to interact with
   * the server.
   *
   */
  this.init = function() {
    // Load the zone and scene list
    self = this;
    id = this.getId();

    this.execServer("/zone", function(data) {
      self.lstZones = data;
      self.execServer("/scene", function(data) {
        self.lstScenes = data;
        self.returnResult(id, true, null);
      });
    });

    return id;
  }

  this.getZones = function() {
    var result = {};

    for (var e in this.lstZones) {
      if (this.lstZones.hasOwnProperty(e)) {
        result[e] = this.lstZones[e]["name"];
      }
    }

    return result;
  }

  this.hasSubZones = function(zone) {
    return (this.lstZones[zone].hasOwnProperty("subzones"));
  }

  this.getSubZones = function (zone) {
    return this.lstZones[zone]["subzones"];
  }

  this.execServer = function(addr, successFunction, errorFunction) {
    console.log("execServer(" + addr + ")");
    $.ajax({
      url: this.cfgAddress + addr,
      type: "GET",
      success: function(obj, info, t) {
        console.log("Result OK: " + info);
        successFunction(obj);
      },
      error: function(obj, info, t) {
        console.log("ResultERR: " + info);
        errorFuncion(info);
      }
    });
  }

  this.getId = function() {
    return ++this.cmdCounter;
  }

  this.returnResult = function(id, success, data) {
    this.cfgResultFunc(id, success, data);
  }
}
