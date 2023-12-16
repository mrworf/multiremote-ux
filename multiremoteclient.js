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

  /**
   * Initializes the class, making it possible to interact with
   * the server.
   */
  this.init = function() {
    // Load the zone and scene list
    self = this;
    id = this.getId();

    this.remoteId = $.jStorage.get("remote-id");

    this.execServer("/zone", function(data) {
      self.lstZones = data;
      self.execServer("/scene", function(data) {
        console.log(data);
        self.lstScenes = data;
        if (self.remoteId != null) {
          self.execServer("/remotes/" + self.remoteId, function(data) {
            console.log(data);
            if (data.hasOwnProperty("error")) {
              self.remoteId = null;
              $.jStorage.deleteKey("remote-id");
            }
            self.remoteDetails = data;
            self.eventService = new MultiRemoteEventService(self.cfgServerAddress + ':' + self.cfgServerPort, self.remoteId, function(type, source, data) {self.onEvent(type, source, data);});
            self.eventService.connect();

            // Connect event listener
            if (typeof MultiRemoteAPI != 'undefined') {
              console.log('Starting to listen for events by the app');
              MultiRemoteAPI.setEventListener("onApplicationEvent");
            }

            self.returnResult(id, true, null);
          });
        } else {
          // Alright, time to init the event service
          self.returnResult(id, true, null);
        }
      });
    });

    return id;
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

  this.execServer = function(addr, successFunction, errorFunction) {
    if (errorFunction == null) {
      errorFunction = function(a) { console.log(a); };
    }
    if (successFunction == null) {
      successFunction = function(a) { ; };
    }

    finalUrl = "http://" + this.cfgServerAddress + ":" + this.cfgServerPort + addr;

    if (this.eventService != null) {
      this.eventService.execute(addr, successFunction, errorFunction);
    } else {
      console.log("Using non-websocket communication");
      //console.log("execServer(" + finalUrl + ")");
      $.ajax({
        async: true,
        url: finalUrl,
        type: "GET",
        success: function(obj, info, t) {
          successFunction(obj);
        },
        error: function(obj, info, t) {
          errorFunction("execServer(" + finalUrl + ") --> " + obj.statusText);
        }
      });
    }
  }

  this.getId = function() {
    return ++this.cmdCounter;
  }

  this.returnResult = function(id, success, data) {
    this.cfgResultFunc(id, success, data);
  }

  this.selectZone = function(zone) {
    self = this;
    id = this.getId();

    this.execServer("/attach/" + this.remoteId + "/" + zone, function(data) {
      self.currentZone = zone;
      self.execServer("/subzone/" + zone, function(data) {
        if (data.hasOwnProperty("active-subzone"))
          self.currentSubZone = data["active-subzone"];
        else
          self.currentSubZone = null;
        self.returnResult(id, true, null);
      });
    });

    return id;
  }

  this.selectSubZone = function(subzone) {
    self = this;
    id = this.getId();

    this.execServer("/subzone/" + this.currentZone + "/" + subzone, function(data) {
      self.currentSubZone = subzone;
      self.returnResult(id, true, null);
    });

    return id;
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
    id = this.getId();

    if (scene != null) {
      this.execServer("/assign/" + this.currentZone + "/" + this.remoteId + "/" + scene + optOverride, function(data) {
        if (data.hasOwnProperty("conflict")) {
          self.returnResult(id, false, data);
        } else {
          self.currentScene = scene;
          self.returnResult(id, true, data);
        }
      });
    } else {
      this.execServer("/unassign/" + this.currentZone + "/" + this.remoteId , function(data) {
        self.currentScene = null;
        self.execServer("/subzone/" + self.currentZone, function(data) {
          if (data.hasOwnProperty("active-subzone"))
            self.currentSubZone = data["active-subzone"];
          else
            self.currentSubZone = null;
          self.returnResult(id, true, null);
        });
      });
    }

    return id;
  }

  this.getCommands = function() {
    // Load the commands available to us
    self = this;
    id = this.getId();

    this.execServer("/command/" + this.remoteId, function(data) {
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

    this.execServer("/command/" + this.remoteId + "/" + type + "/" + command, function(data) {
      self.returnResult(id, true, data);
    });

    return id;
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
    id = this.getId();

    this.execServer("/register/" + pin + "/" + name + "/" + desc + "/" + zone, function(data) {
      if (data.hasOwnProperty("error") || !data.hasOwnProperty("uuid")) {
        self.returnResult(id, false, null);
      } else {
        $.jStorage.set("remote-id", data["uuid"]);
        self.remoteId = data["uuid"];

        // Reload info from server (to keep us consistent with init)
        self.execServer("/remotes/" + self.remoteId, function(data) {
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
    return id;
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
      return;
    }
    switch (cmd) {
      case "state":
        // See if we have state for the zone
        if (!this.zoneState.hasOwnProperty(data.zone)) {
          this.zoneState[data.zone] = {}
        }

        if (data.hasOwnProperty("volume")) {
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
