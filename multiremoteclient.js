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
  this.cfgRemoteId = "livingroom"; // Should not be hardcoded
  this.cfgResultFunc = funcResults;
  this.cmdCounter = 0;

  this.lstZones = {};
  this.lstScenes = {};

  this.currentZone = null;
  this.currentScene = null;

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
    //console.log("execServer(" + addr + ")");
    $.ajax({
      url: this.cfgAddress + addr,
      type: "GET",
      success: function(obj, info, t) {
        //console.log("Result OK: " + info);
        successFunction(obj);
      },
      error: function(obj, info, t) {
        console.log("ResultERR: " + info + " from calling " + addr);
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

  this.selectZone = function(zone) {
    // Load the zone and scene list
    self = this;
    id = this.getId();

    this.execServer("/attach/" + this.cfgRemoteId + "/" + zone, function(data) {
      self.currentZone = zone;
      self.returnResult(id, true, null);
    });

    return id;
  }

  this.selectScene = function(scene) {
    // Select the scene
    self = this;
    id = this.getId();

    if (scene != null) {
      this.execServer("/assign/" + this.currentZone + "/" + scene, function(data) {
        self.currentScene = scene;
        self.returnResult(id, true, null);
      });
    } else {
      this.execServer("/unassign/" + this.currentZone, function(data) {
        self.currentScene = null;
        self.returnResult(id, true, null);
      });
    }

    return id;
  }

  this.getCommands = function() {
    // Load the commands available to us
    self = this;
    id = this.getId();

    this.execServer("/command/" + this.cfgRemoteId, function(data) {
      self.returnResult(id, true, data["commands"]);
    });

    return id;
  }

  this.getScenesForZone = function(zone) {
    var result = {};
    var scenes = this.lstZones[zone]["compatible"];
    for (var s in scenes) {
      s = scenes[s];
      result[s] = this.lstScenes[s];
    }
    return result;
  }

  this.getActiveScene = function() {
    // Load the zone and scene list
    self = this;
    id = this.getId();

    this.execServer("/zone/" + this.currentZone, function(data) {
      self.currentScene = data.scene;
      self.returnResult(id, true, data.scene);
    });

    return id;
  }

  this.getCachedScene = function() {
    return this.currentScene;
  }

  this.getCachedZone = function() {
    return this.currentZone;
  }

  this.getScene = function(scene) {
    return this.lstScenes[scene];
  }


  this.issueCommand = function(type, command) {
    // Send command to active scene and zone
    self = this;
    id = this.getId();

    this.execServer("/command/" + this.cfgRemoteId + "/" + type + "/" + command, function(data) {
      self.returnResult(id, true, null);
    });

    return id;
  }
}
