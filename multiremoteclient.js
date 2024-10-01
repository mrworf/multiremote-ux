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
MultiRemoteClient = function(funcResults) {
  this.getUrlParameter = function(sParam) {
    // See http://www.jquerybyexample.net/2012/06/get-url-parameters-using-jquery.html
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
      sParameterName = sURLVariables[i].split('=');

      if (sParameterName[0] === sParam) {
        return sParameterName[1] === undefined ? true : sParameterName[1];
      }
    }
    return null;
  };

  // Lets see if we can locate the controller, it should have been
  // provided via URL or via the MultiRemoteAPI
  if (typeof MultiRemoteAPI != 'undefined') {
    // We can talk to the native API
    serverAddress = MultiRemoteAPI.getControlServer();
    serverPort = MultiRemoteAPI.getControlServerPort();
  } else {
    // Look in URL for "controller=<some address>"
    serverAddress = this.getUrlParameter("controller");
    // Look in URL for "port=<some port>"
    serverPort = parseInt(this.getUrlParameter("port"));
    if (isNaN(serverPort))
      serverPort = 5000;
  }
  if (serverAddress == null) {
    alert("No controller provided");
    return;
  }

  this.cfgServerAddress = serverAddress;
  this.cfgServerPort = serverPort;
  this.cfgResultFunc = funcResults;
  this.cmdCounter = 0;

  this.lstZones = {};
  this.lstScenes = {};

  this.zoneState = {};

  this.currentZone = null;
  this.currentScene = null;
  this.currentSubZone = null;

  this.remoteId = null;
  this.remoteDetails = null;

  this.eventService = null;

  this.cbSceneListener = null;
  this.cbZoneListener = null;
  this.cbVolumeListener = null;

  function dumpObject(data, base) {
    // Count the depth of the base by the dots
    var depth = base.split('.').length;

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        // Test if it's an object
        if (typeof data[key] === 'object') {
          console.log(base + '.' + key + ":");
          if (depth < 10)
            dumpObject(data[key] , base + '.' + key);
          else
            console.log("Skipping object dump, too deep");
        } else
          console.log(base + '.' + key + ": " + data[key]);
      }
    }        
  }

  /**
   * Initializes the class, making it possible to interact with
   * the server.
   */
  this.init = function() {
    // Load the zone and scene list
    self = this;
    cmdId = this.getId();

    this.remoteId = $.jStorage.get("remote-id");

    this.execServer("/zone", cmdId, function(id, data) {
      self.lstZones = data;
      self.execServer("/scene", id, function(id, data) {
        id = _id;
        console.log('data = ' + JSON.stringify(data, null, 2));
        self.lstScenes = data;
        if (self.remoteId != null) {
          self.execServer("/remotes/" + self.remoteId, id, function(id, data) {
            id = _id;
            console.log('data = ' + JSON.stringify(data, null, 2));
            if (data.hasOwnProperty("error")) {
              self.remoteId = null;
              $.jStorage.deleteKey("remote-id");
            }
            self.remoteDetails = data;
            self.eventService = new MultiRemoteEventService(self.cfgServerAddress + ':' + self.cfgServerPort, self.remoteId, function(type, source, data) {self.onEvent(type, source, data);}, function() {self.onReconnect();});
            self.eventService.connect();

            // Connect event listener
            if (typeof MultiRemoteAPI != 'undefined') {
              console.log('Starting to listen for events by the app');
              if (typeof MultiRemoteAPI.setEventListener != 'undefined') {
                MultiRemoteAPI.setEventListener("onApplicationEvent");
              } else {
                console.log('ERROR: No setEventListener function available');
              }
            }

            self.returnResult(id, true, null);
          });
        } else {
          // Alright, time to init the event service
          self.returnResult(id, true, null);
        }
      });
    });

    return cmdId;
  }

  this.onReconnect = function() {
    console.log('We regained connection, notify server of what zone we are in');
    this.selectZone(this.currentZone);
  }

  this.onApplicationEvent = function(evt, data) {
    console.log("Incoming event from application: " + evt);
    switch(evt) {
      case "EVENT_APP_RESUMED":
        // We must assume that network connections are dead
        self.eventService.refreshConnection();
        break;
    }
  };

  this.getZones = function() {
    var result = {};

    for (var e in this.lstZones) {
      if (this.lstZones.hasOwnProperty(e)) {
        result[e] = this.lstZones[e]["name"];
      }
    }

    return result;
  }

  this.isZoneInUse = function(zone) {
    return this.lstZones[zone].scene != null;
  }

  this.getActiveSubZone = function() {
    return this.currentSubZone;
  }

  this.getZone = function(zone) {
    return this.lstZones[zone];
  }

  this.getActiveZone = function() {
    return this.currentZone;
  }

  this.hasSubZones = function(zone) {
    return (this.lstZones[zone].hasOwnProperty("subzones"));
  }

  this.getSubZones = function (zone) {
    return this.lstZones[zone]["subzones"];
  }

  this.execServer = function(addr, id, successFunction, errorFunction) {
    if (errorFunction == null) {
      errorFunction = function(id, a) { console.log(a); };
    }
    if (successFunction == null) {
      successFunction = function(id, a) { ; };
    }

    finalUrl = "http://" + this.cfgServerAddress + ":" + this.cfgServerPort + addr;

    // Test if id is a number
    if (isNaN(id)) {
      console.log("ERROR: ID is not a number");
      console.log('id = ' +  JSON.stringify(id, null, 2));
      // print callstack
      console.log(new Error().stack);
      return;
    }

    console.log("execServer(" + finalUrl + ")" + " id = " + id);

    if (this.eventService != null) {
      this.eventService.execute(addr, id, successFunction, errorFunction);
    } else {
      console.log("Using non-websocket communication");
      console.log("execServer(" + finalUrl + ")");
      $.ajax({
        async: true,
        url: finalUrl,
        type: "GET",
        success: function(obj, info, t) {
          _id = id;
          successFunction(_id, obj);
        },
        error: function(obj, info, t) {
          _id = id;
          errorFunction(_id, "execServer(" + finalUrl + ") --> " + obj.statusText);
        }
      });
    }
  }

  this.getId = function() {
    /*
    _id = ++this.cmdCounter;
    console.log('New AppId is ' + _id);
    return _id;
    */
   return ++this.cmdCounter;
  }

  this.returnResult = function(id, success, data) {
    this.cfgResultFunc(id, success, data);
  }

  this.selectZone = function(zone) {
    self = this;
    cmdId = this.getId();

    this.execServer("/attach/" + this.remoteId + "/" + zone, cmdId, function(id, data) {
      self.currentZone = zone;
      self.execServer("/subzone/" + zone, id, function(id, data) {
        if (data.hasOwnProperty("active-subzone"))
          self.currentSubZone = data["active-subzone"];
        else
          self.currentSubZone = null;
        self.returnResult(id, true, null);
      });
    });

    return cmdId;
  }

  this.selectSubZone = function(subzone) {
    self = this;
    cmdId = this.getId();

    this.execServer("/subzone/" + this.currentZone + "/" + subzone, cmdId, function(id, data) {
      self.currentSubZone = subzone;
      console.log('My id is ' + id);
      self.returnResult(id, true, null);
    });

    return cmdId;
  }

  /**
   * ASYNC FUNCTION
   *
   * Selects a specific scene, with the option to provide conflict resolution
   * options.
   *
   * @param scene Name of the scene or null if standby
   * @param optOverride Either null or left out to perform normal selection
   *
   * @note Set override to "clone" to run same scene on more than one zone
   *       or set it to unassign to shutdown the other zones.
   */
  this.selectScene = function(scene, optOverride) {
    if (undefined == optOverride || null == optOverride)
      optOverride = "";
    else
      optOverride = "/" + optOverride;

    // Select the scene
    self = this;
    cmdId = this.getId();

    if (scene != null) {
      this.execServer("/assign/" + this.currentZone + "/" + this.remoteId + "/" + scene + optOverride, cmdId, function(id, data) {
        if (data.hasOwnProperty("conflict")) {
          self.returnResult(id, false, data);
        } else {
          self.currentScene = scene;
          self.returnResult(id, true, data);
        }
      });
    } else {
      this.execServer("/unassign/" + this.currentZone + "/" + this.remoteId , cmdId, function(id, data) {
        self.currentScene = null;
        self.execServer("/subzone/" + self.currentZone, id, function(id, data) {
          if (data.hasOwnProperty("active-subzone"))
            self.currentSubZone = data["active-subzone"];
          else
            self.currentSubZone = null;
          self.returnResult(id, true, null);
        });
      });
    }

    return cmdId;
  }

  this.getCommands = function() {
    // Load the commands available to us
    self = this;
    cmdId = this.getId();

    this.execServer("/command/" + this.remoteId, cmdId, function(id, data) {
      self.returnResult(id, true, data["commands"]);
    });

    return cmdId;
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
    cmdId = this.getId();

    this.execServer("/zone/" + this.currentZone, cmdId, function(id, data) {
      self.currentScene = data.scene;
      self.returnResult(id, true, data.scene);
    });

    return cmdId;
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
    cmdId = this.getId();

    this.execServer("/command/" + this.remoteId + "/" + type + "/" + command, cmdId, function(id, data) {
      self.returnResult(id, true, data);
    });

    return cmdId;
  }

  /**
   * Checks if this remote is registered with the backend. This is actually checked on init()
   */
  this.isRegistered = function() {
    return this.remoteId != null;
  }

  /**
   * Registers this remote with the backend and stores the UUID returned.
   *
   * Returns true on success, false on failure
   */
  this.registerRemote = function(pin, name, desc, zone) {
    self = this;
    cmdId = this.getId();

    this.execServer("/register/" + pin + "/" + name + "/" + desc + "/" + zone, cmdId, function(id, data) {
      if (data.hasOwnProperty("error") || !data.hasOwnProperty("uuid")) {
        self.returnResult(id, false, null);
      } else {
        $.jStorage.set("remote-id", data["uuid"]);
        self.remoteId = data["uuid"];

        // Reload info from server (to keep us consistent with init)
        self.execServer("/remotes/" + self.remoteId, id, function(id, data) {
          if (data.hasOwnProperty("error")) {
            self.remoteId = null;
            $.jStorage.deleteKey("remote-id");
          }
          self.remoteDetails = data;
          console.log(data);
          self.returnResult(id, true, null);
        });
      }
    });
    return cmdId;
  }

  this.getDefaultZone = function() {
    if (!this.isRegistered())
      return null;

    return this.remoteDetails["zone"];
  }

  this.updateZoneState = function(zone) {
    // Don't update if we don't have state
    if (!this.zoneState.hasOwnProperty(zone))
      return;

    // Update values as needed
    state = this.zoneState[zone]
    if (state.hasOwnProperty("volume")) {
      volume = state["volume"];

      // Sketchy to just update like this
      if (this.cbVolumeListener) {
        this.cbVolumeListener(volume)
      }
      //$("#volcur").text( (volume / 100.0).toFixed(1) + "%");
    }
  }

  this.onEvent = function(cmd, source, data) {
    if (source == this.remoteId) {
      console.log("Event was caused by us, ignore");
      console.log(data);
      return;
    }
    switch (cmd) {
      case "state":
        // See if we have state for the zone
        if (!this.zoneState.hasOwnProperty(data.zone)) {
          this.zoneState[data.zone] = {}
        }

        if (data.hasOwnProperty("volume")) {
          // Ranges from 0 - 10000 (divided by 100, so 0-100.00)
          nv = data["volume"];
          if (nv < 0 || nv > 10000) {
            console.log("Got insane volume of " + nv + ", will normalize it");
            if (nv < 0)
              nv = 0;
            else if (nv > 10000)
              nv = 10000;
          }
          this.zoneState[data.zone]["volume"] = data["volume"];
        }

        // Don't bother updating if we're not looking at the relevant zone
        if (data.zone != this.getCachedZone()) {
          console.log('State update is unrelated to us (them = ' + data.zone + ', us = ' + this.getCachedZone() + ')')
          break;
        }
        this.updateZoneState(data.zone);
        break;
      case "scene":
        if (data.scene != this.getCachedScene() && this.cbSceneListener) {
          this.currentScene = data.scene;
          this.cbSceneListener(data);
        }
        break;
      case "zone":
        this.lstZones[data.zone]["scene"] = (data.inuse ? "unknown" : null);
        if (this.cbZoneListener) {
          this.cbZoneListener(data);
        }
        break;
    }
  }

  this.setSceneListener = function(callback) {
    this.cbSceneListener = callback;
  }

  this.setZoneListener = function(callback) {
    this.cbZoneListener = callback;
  }

  this.setVolumeListener = function(callback) {
    this.cbVolumeListener = callback;
  }
}
