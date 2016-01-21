/**
 * This class contains all the graphical elements that are used by
 * the multiREMOTE user interface.
 *
 * The reason for this split-up is to make it easy to maintain and
 * avoid one massive HTML file and/or Javascript file
 */

var UXObjects = function() {
  this.zonecount = 0;
  this.cmdCounter = 0;
  this.counterBlockUI = 0;
  this.uiBlocked = false;
  this.nativeClient = (typeof MultiRemoteAPI != 'undefined');
  this.mapZones = {};
  this.currentZone = null;
  this.repeater = new ButtonRepeater(500, 250);

  this.VIBRATE_BTN = 50;

  this.busyTransition = false;
  this.busyVisible = false;
  this.busyPendingVisible = false;

  this.checkBusyTransition = function(visible) {
    this.busyVisible = visible;
    if (this.busyPendingVisible != this.busyVisible) {
      // Change state again!
      this.busyTransition = true;
      $("#busyIndicator").modal( this.busyPendingVisible ? "" : "hide" );
    } else {
      this.busyTransition = false;
    }
  }

  {
    var self = this;
    $('#busyIndicator').on('shown.bs.modal', function() { self.checkBusyTransition(true); });
    $('#busyIndicator').on('hidden.bs.modal', function() { self.checkBusyTransition(false); });
  }

  this.getId = function() {
    return ++this.cmdCounter;
  }

  this.optimize = function() {
    // Remove hover functionality since it seems to slow down Android devices
    for (var i = 0; i != document.styleSheets.length; i++) {
      var rulesToLoose = [];
      for (var ii = 0; ii != document.styleSheets[i].cssRules.length; ++ii) {
        if (document.styleSheets[i].cssRules[ii].selectorText && document.styleSheets[i].cssRules[ii].selectorText.indexOf(':hover') > 0) {
          rulesToLoose.push(ii);
        }
      }
      for (var ii = rulesToLoose.length-1; ii != -1; --ii) {
        if (document.styleSheets[i].deleteRule) {
          document.styleSheets[i].deleteRule(rulesToLoose[ii]);
        } else if (document.styleSheets[i].removeRule) {
          document.styleSheets[i].removeRule(rulesToLoose[ii]);
        }
      }
    }
  }

  this.showBusyIndicator = function(visible) {
    if (visible == this.busyPendingVisible)
      return;
    this.busyPendingVisible = visible;
    if (!this.busyTransition) {
      this.busyTransition = true;
      if (visible) {
        $("#busyIndicator").modal();
      } else {
        $("#busyIndicator").modal("hide");
      }
    } else
      console.log("showBusyIndicator() was transitioning");
  }

  this.blockUI = function(block) {
    if (block)
      this.counterBlockUI++;
    else {
      if (this.counterBlockUI == 0) {
        console.log("WARNING: Unmatched blockUI call");
      } else {
        this.counterBlockUI--;
      }
    }

    if (this.counterBlockUI > 0) {
      if (!this.uiBlocked) {
        this.uiBlocked = true;
        $("#blockui").show();
      }
    } else if (this.uiBlocked) {
        this.uiBlocked = false;
      $("#blockui").hide();
    }
  }

  this.addZone = function(strName, strId, handlerZone) {
    $("#zone-list").append('<li><a href="#" id="zone' + (this.zonecount++) + '">' + strName + '</a></li>');
    $("#zone" + (this.zonecount-1)).bind('click', {zone: strId, subzone: null}, function(event) {handlerZone(event.data.zone, event.data.subzone);});
    this.mapZones[strId] = "zone" + (this.zonecount-1);
  }

  this.addSubZone = function(strName, strId, lstSubZones, strActiveSub, handlerZone) {
    var start = this.zonecount;

    var element = '<li class="dropdown">';
    element += '<a href="#" style="display: inline-block; padding-right: 0px" id="zone' + (this.zonecount++) + '">' + strName + '</a>';
    element += '<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false" style="display: inline-block"><span class="caret"></span></a>';
    element += '<ul class="dropdown-menu" role="menu">';
    element += '<li class="dropdown-header">Configuration</li>';

    for (e in lstSubZones) {
      if (lstSubZones.hasOwnProperty(e)) {
        console.log("Active sub: " + strActiveSub);
        console.log("Current sub: " + e);
        element += '<li><a href="#"  id="zone' + (this.zonecount++) + '"><span class="glyphicon glyphicon-ok' + (strActiveSub == e ? "" : " hidden") + '"" aria-hidden="true"></span> ' + lstSubZones[e] + '</a></li>'
      }
    }

    element +=  '</ul></li>';

    $("#zone-list").append(element);
    this.mapZones[strId] = "zone" + start;
    $("#zone" + (start++)).bind('click', {zone: strId, subzone: null}, function(event) {handlerZone(event.data.zone, event.data.subzone);});
    for (e in lstSubZones) {
      if (lstSubZones.hasOwnProperty(e)) {
        $("#zone" + (start++)).bind('click', {zone: strId, subzone: e}, function(event) {handlerZone(event.data.zone, event.data.subzone);});
      }
    }

  }

  /**
   * Takes the ux-hint field and breaks it down into key-value pairs
   *
   * @param hint ux-hint string
   * @return key-value pair
   *
   * @note Should be moved into the app instead and done ONCE.
   * @todo Not very clever, doesn't deal with quotes and commas
   *       inside the value.
   */
  this.decodeHinting = function(hint) {
    var tmp = hint.split(",");
    var result = {};
    for (var t in tmp) {
      t = tmp[t].split("=");
      result[t[0]] = t[1];
    }
    return result;
  }

  /**
   * Generate a scene selector based on the provided scene list, also highlights
   * the currently active scene.
   *
   * @param scenelst The list of scenes
   * @param active The active scene or null
   * @param handleSelection The function to be called when user selects a scene
   * @param szList If set, provides a list of sub-zones available
   * @param szActive If set, indicates currently active subzone
   * @param handleSubzone The function to be called when user switches subzone
   */
  this.createSceneSelector = function(scenelst, active, handleSelection, szList, szActive, handleSubzone) {
    var count = 0;

    var element = "";

    element += '<div style="text-align: center; display: inline-block; float: left; width: 100%;">'; // <h1 style="margin-top: 0px">Choose activity</h1>';
    if (szList != undefined) {
      element += '<div class="btn-group btn-group-lg" role="group" aria-label="...">';
      var i = 0;
      for (var sz in szList) {
        var t = "default";
        if (sz == szActive)
          t = "primary";
        element += '<button id="subzone' + i + '" type="button" style="width: 200px" class="btn btn-' + t + '">' + szList[sz] + '</button>';
        i++;
      }
      element += '</div><br>';
    }

    // By default, all zones have a standby scene
    element += '<a id="scene' + (count++) + '" class="btn btn-default activity ' + (active == null ? "active" : "") + '" href="#" role="button"><div class="activity-icon"><img src="/multiremote-ux/img/standby.png" /></div><div style="margin-top: 15px">Standby</div></a>';

    for (var e in scenelst) {
      var icon = "unknown";
      var name = scenelst[e]["name"];
      var id = e;

      // Decode what we need
      var hint = this.decodeHinting(scenelst[e]["ux-hint"]);

      if (hint["icon"] != null) {
        icon = hint["icon"];
      }

      element += '<a id="scene' + (count++) + '" class="btn btn-default activity ' + (active == id ? "active" : "") + '" href="#" role="button"><div class="activity-icon">';
      element += '<img src="img/' + icon + '.png" />';
      element += '</div>';
      element += '<div style="margin-top: 15px">' + name + '</div>';
      element += '</a>';
    }

    element += "</div>"

    $('#canvas').append(element);

    // Assign a button handler for all our scenes
    count = 0;
    $('#scene' + (count++)).bind('click', {scene: null}, function(event) {handleSelection(event.data.scene);});
    for (var e in scenelst) {
      $('#scene' + (count++)).bind('click', {scene: e}, function(event) {handleSelection(event.data.scene);});
    }

    // If we have subzones, also handle that
    if (szList != undefined) {
      var i = 0;
      for (var sz in szList) {
        if (sz != szActive)
          $('#subzone' + (i++)).bind('click', {subzone: sz}, function(event) {handleSubzone(event.data.subzone);});
        i++;
      }
    }
  }

  this.vibrate = function(millisec) {
    if (!this.nativeClient) return;

    MultiRemoteAPI.vibrate(millisec);
  }

  this.launchPackage = function(packagename) {
    if (!this.nativeClient) return;

    MultiRemoteAPI.launchPackage(packagename, true);
  }

  this.containsType = function(lstCommands, type) {
    for(var c in lstCommands) {
      if (lstCommands[c].type == type) {
        return c;
      }
    }
    return null;
  }

  this.highlightZone = function(zone) {
    if (this.currentZone != null) {
      $("#" + this.currentZone).removeClass("active-zone");
      this.currentZone = null;
    }

    if (this.mapZones.hasOwnProperty(zone)) {
     this.currentZone = this.mapZones[zone];
     $("#" + this.currentZone).addClass("active-zone");
    }
  }

  this.clearCanvas = function() {
    $('#canvas').html("");
  }

  /**
   * Maps the controls to actual calls. Also allows for repeating buttons.
   *
   * NOTE! Repeating buttons will NOT work if blocking UI is used
   *
   * @param lstCommands A dictionary of commands, may be less than the controller
   * @param handler The function which can handle it
   * @param html The HTML layout holding the controls
   * @param mapping How to map MRTypes to HTML5 id
   * @param repeat Array of HTML5 id which shall repeat (DO NOT USE BLOCKING UI)
   */
  this.createControls = function(lstCommands, handler, html, mapping, repeat) {
    // First, see if this should be used at-all (maybe not mappable)
    var found = false;
    for(var m in mapping) {
      if (this.containsType(lstCommands, mapping[m]) != null) {
        found = true;
        break;
      }
    }
    if (!found)
      return;

    $('#canvas').append(html);

    // Time to map the commands...
    for(var m in mapping) {
      $('#' + m).unbind()
      var c = this.containsType(lstCommands, mapping[m]);
      if (c != null) {
        if (repeat != undefined && repeat.indexOf(m) != -1) {
          var copy = this.repeater;
          var btn = m;
          $("#" + btn).bind('mouseout',  {btn: m, command: c, rep: copy}, function(event) {event.data.rep.stop(event.data.btn); });
          $("#" + btn).bind('mouseup',   {btn: m, command: c, rep: copy}, function(event) {event.data.rep.stop(event.data.btn); });
          $("#" + btn).bind('touchend',   {btn: m, command: c, rep: copy}, function(event) {event.data.rep.stop(event.data.btn); });
          $("#" + btn).bind('touchcancel',   {btn: m, command: c, rep: copy}, function(event) {event.data.rep.stop(event.data.btn); });
          $("#" + btn).bind('mousedown', {btn: m, command: c, rep: copy}, function(event) {var e = event.data.command; event.data.rep.start(event.data.btn, function(done){handler(e, done);}); });
        } else {
          $('#' + m).bind('click', {command: c}, function(event){handler(event.data.command);});
        }
      } else {
        $('#' + m).hide();
      }
    }
  }

  this.createPlaybackControls = function(lstCommands, handler) {
    var mapping = {
      pbplay:      MRTypes.PLAYBACK_PLAY,
      pbplaypause: MRTypes.PLAYBACK_PLAYPAUSE,
      pbpause:     MRTypes.PLAYBACK_PAUSE,
      pbstop:      MRTypes.PLAYBACK_STOP,
      pbnskip:     MRTypes.PLAYBACK_SKIP_FORWARD,
      pbpskip:     MRTypes.PLAYBACK_SKIP_BACKWARD,
      pbnchapter:  MRTypes.PLAYBACK_CNEXT,
      pbpchapter:  MRTypes.PLAYBACK_CPREVIOUS,
      pbforw:      MRTypes.PLAYBACK_FASTFORWARD,
      pbrew:       MRTypes.PLAYBACK_REWIND,
      pbeject:     MRTypes.PLAYBACK_EJECT,
    };

    var element = "";
    element += '<div class="well well-sm" style="text-align: center; display: inline-block; float: left; margin: 5px">';
    element += '  <div class="btn-group btn-group-lg" role="group" aria-label="...">';
    element += '    <button id="pbpchapter" type="button" class="btn btn-default" style="width: 100px"><span class="glyphicon glyphicon-step-backward" aria-hidden="true"></span></button>';
    element += '    <button id="pbnchapter" type="button" class="btn btn-default" style="width: 100px"><span class="glyphicon glyphicon-step-forward" aria-hidden="true"></span></button>';
    element += '  </div>';
    element += '  <br/>';
    element += '  <div class="btn-group btn-group-lg" role="group" aria-label="..." style="padding-top: 10px;">';
    element += '    <button id="pbplay" type="button" class="btn btn-default" style="width: 100px"><span class="glyphicon glyphicon-play" aria-hidden="true"></span></button>';
    element += '    <button id="pbpause" type="button" class="btn btn-default" style="width: 100px"><span class="glyphicon glyphicon-pause" aria-hidden="true"></span></button>';
    element += '    <button id="pbplaypause" type="button" class="btn btn-default" style="width: 100px"><span class="glyphicon glyphicon-play" aria-hidden="true"></span> / <span class="glyphicon glyphicon-pause" aria-hidden="true"></span></button>';
    element += '    <button id="pbstop" type="button" class="btn btn-default" style="width: 100px"><span class="glyphicon glyphicon-stop" aria-hidden="true"></span></button>';
    element += '  </div>';
    element += '  <br/>';
    element += '  <div class="btn-group btn-group-lg" role="group" aria-label="..." style="padding-top: 10px;">';
    element += '    <button id="pbpskip" type="button" class="btn btn-default" style="width: 100px"><span class="glyphicon glyphicon-fast-backward" aria-hidden="true"></span></button>';
    element += '    <button id="pbrew" type="button" class="btn btn-default" style="width: 100px"><span class="glyphicon glyphicon-backward" aria-hidden="true"></span></button>';
    element += '    <button id="pbforw" type="button" class="btn btn-default" style="width: 100px"><span class="glyphicon glyphicon-forward" aria-hidden="true"></span></button>';
    element += '    <button id="pbnskip" type="button" class="btn btn-default" style="width: 100px"><span class="glyphicon glyphicon-fast-forward" aria-hidden="true"></span></button>';
    element += '  </div>';
    element += '  <br/>';
    element += '  <div class="btn-group btn-group" role="group" aria-label="..." style="padding-top: 10px; width: 100%; padding-left: 10px; padding-right: 10px">';
    element += '    <button id="pbeject" type="button" style="width: 100%;" class="btn btn-default"><span class="glyphicon glyphicon-eject" aria-hidden="true"></span></button>';
    element += '  </div>';
    element += '</div>';

    this.createControls(lstCommands, handler, element, mapping);
  }

  this.createNavigationControls = function(lstCommands, handler) {
    var mapping = {
      navup: MRTypes.NAVIGATE_UP,
      navdown: MRTypes.NAVIGATE_DOWN,
      navleft: MRTypes.NAVIGATE_LEFT,
      navright: MRTypes.NAVIGATE_RIGHT,
      naventer: MRTypes.NAVIGATE_ENTER,
      navback: MRTypes.NAVIGATE_BACK,
      navhome: MRTypes.NAVIGATE_HOME,
      navmenu: MRTypes.NAVIGATE_MENU,
      navtop: MRTypes.NAVIGATE_TOPMENU,
      navpageup: MRTypes.NAVIGATE_PAGEUP,
      navpagedn: MRTypes.NAVIGATE_PAGEDOWN,
    };

    var element = "";
    element += '<div class="well well-sm" style="text-align: center; display: inline-block; float: left; margin: 5px">';
    element += '  <table style="float: left">';
    element += '    <tr>';
    element += '      <td rowspan="3" style="border-right: 0px solid #b2b2b2; padding: 3px; padding-right: 10px">';
    element += '        <button id="navpageup" type="button" style="float: left; height: 4em; margin-bottom: 3px;" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-arrow-up" aria-hidden="true"></span></button>';
    element += '        <br>';
    element += '        <button id="navpagedn" type="button" style="float: left; height: 4em; margin-top: 3px;" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-arrow-down" aria-hidden="true"></span></button>';
    element += '      </td>';
    element += '      <td style="padding: 3px; padding-left: 10px">';
    element += '          <button id="navhome" type="button"  style="width: 100px; height: 75px" class="btn btn-info">Home</button>';
    element += '      </td>';
    element += '      <td style="padding: 3px; vertical-align: bottom">';
    element += '          <button id="navup" type="button" style="width: 100px; height: 75px" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-menu-up" aria-hidden="true"></span></button>';
    element += '      </td>';
    element += '      <td style="padding: 3px; padding-right: 10px">';
    element += '          <button id="navtop" type="button" style="width: 100px; height: 75px" class="btn btn-info">Top menu</button>';
    element += '      </td>';
    element += '    </tr>';

    element += '    <tr>';
    element += '      <td style="padding: 3px; padding-left: 10px">';
    element += '        <button id="navleft" type="button"  style="width: 100px; height: 75px" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span></button>';
    element += '      </td>';
    element += '      <td style="padding: 3px">';
    element += '        <button id="naventer" type="button" style="width: 100px; height: 75px" class="btn btn-default btn-lg">OK</button>';
    element += '      </td>';
    element += '      <td style="padding: 3px; padding-right: 10px">';
    element += '        <button id="navright" type="button" style="width: 100px; height: 75px" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span></button>';
    element += '      </td>';
    element += '    </tr>';

    element += '    <tr>';
    element += '      <td style="padding: 3px; padding-left: 10px">';
    element += '          <button id="navback" type="button" style="width: 100px; height: 75px" class="btn btn-info">Back</button>';
    element += '      </td>';
    element += '      <td style="padding: 3px; vertical-align: top">';
    element += '        <button id="navdown" type="button" style="width: 100px; height: 75px" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-menu-down" aria-hidden="true"></span></button>';
    element += '      </td>';
    element += '      <td style="padding: 3px; padding-right: 10px">';
    element += '          <button id="navmenu" type="button" style="width: 100px; height: 75px" class="btn btn-info">Menu</button>';
    element += '      </td>';
    element += '    </tr>';
    element += '  </table>';
    element += '</div>';

    this.createControls(lstCommands, handler, element, mapping);
  }

  this.createVolumeControls = function(lstCommands, handler) {
    var mapping = {
      volup: MRTypes.VOLUME_UP,
      voldown: MRTypes.VOLUME_DOWN,
      volmute: MRTypes.VOLUME_MUTE,
    };

    var repeat = ["volup", "voldown"];

    var element = "";
    element += '<div class="well well-sm" style="text-align: center; display: inline-block; float: left; margin: 5px">';
    element += '  <div class="btn-group-vertical btn-group-lg" role="group" aria-label="...">';
    element += '    <button id="volup" type="button" style="height: 6em; width: 100px;" class="btn btn-default"><span class="glyphicon glyphicon-volume-up" aria-hidden="true"></span></button>';
    element += '    <button id="voldown" type="button" style="height: 6em; width: 100px" class="btn btn-default"><span class="glyphicon glyphicon-volume-down" aria-hidden="true"></span></button>';
    element += '    <button id="volmute" type="button" style="height: 4em; width: 100px" class="btn btn-default"><span class="glyphicon glyphicon-volume-off" aria-hidden="true"></span></button>';
    element += '  </div>';
    element += '</div>';

    this.createControls(lstCommands, handler, element, mapping, repeat);
  }

  this.renderSceneInfo = function(sceneInfo, handleStandby, handleScene) {
    var element = "";

    element += '<div class="well well-sm" style="text-align: center; display: inline-block; float: left; margin: 5px; width: 100%">';
    element += '  <button id="shortcut-standby" type="button" style="font-size: 12pt; width: 100px; float:left; height: 4em" class="btn btn-default"><span class="glyphicon glyphicon-off"></span><br>Standby</button>';
    element += '<div style="display:inline-block">' + sceneInfo.name + "<br><small>" + sceneInfo.description + "</small></div>";
    element += '  <button id="shortcut-scenes" type="button" style="font-size: 12pt; width: 100px; float:right; height: 4em" class="btn btn-default">Change<br>Activity</button>';
    element += '</div>';

    $('#canvas').append(element);

    $('#shortcut-scenes').click(handleScene);
    $('#shortcut-standby').click(handleStandby);
  }

  this.createApplicationLink = function(sceneInfo, handler) {
    var hint = this.decodeHinting(sceneInfo["ux-hint"]);
    if (!hint.hasOwnProperty("android-app")) {
      return;
    }

    var element = "";
    if (this.nativeClient) {
      element += '<div class="alert alert-info" style="text-align: center; display: inline-block; margin: 5px">';
      element += '  <h3>This activity is controlled from a separate screen.</h3>';
      element += '  <br/>';
      element += '  <button id="appbtn" type="button" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-new-window" aria-hidden="true"></span> Take me there</button>';
      element += '</div>';
      $('#canvas').append(element);

      $('#appbtn').bind('click', {app: hint["android-app"]}, function(event){handler(event.data.app);});
    } else {
      element += '<div class="alert alert-warning" style="text-align: center; display: inline-block; float: left; margin: 5px">';
      element += '  <h3>This activity uses a separate application to control playback</h3>';
      element += '</div>';
      $('#canvas').append(element);
    }
  }

  this.showMessage = function(sceneInfo, handler) {
    var hint = this.decodeHinting(sceneInfo["ux-hint"]);
    if (!hint.hasOwnProperty("message")) {
      return;
    }

    var element = "";
    element += '<div class="alert alert-info" style="text-align: center; display: inline-block; margin: 5px">';
    element += '  <h3>' + hint["message"] + '</h3>';
    element += '</div>';
    $('#canvas').append(element);
  }

  this.showConflict = function(scene, question, nbrConflicts, handler) {
    $('#resolve-question').text(question);
    if (nbrConflicts > 1) {
      $('#resolve-clone').text("Play on all")
    } else {
      $('#resolve-clone').text("Play on both")
    }

    $('#resolve-clone').unbind();
    $('#resolve-unassign').unbind();
    $('#resolve-cancel').unbind();

    $('#resolve-clone').bind('click', {choice: "clone", scene: scene}, function(event){$('#conflictResolution').modal('hide'); handler(event.data.scene, event.data.choice);});
    $('#resolve-unassign').bind('click', {choice: "unassign", scene: scene}, function(event){$('#conflictResolution').modal('hide'); handler(event.data.scene, event.data.choice);});
    $('#resolve-cancel').bind('click', {choice: "cancel", scene: scene}, function(event){$('#conflictResolution').modal('hide'); handler(event.data.scene, event.data.choice);});

    $('#conflictResolution').modal();
  }

  this.renderSceneIcon = function(scene) {
    hint = this.decodeHinting(scene["ux-hint"]);
    var element = '<div style="position: absolute; z-order: -9999; bottom: 0px; right: 0px; width: 136px; height: 136px; background-image: url(img/' + hint.icon + '.png);  background-repeat: no-repeat; opacity: 0.3"></div>';
    $('#canvas').append(element);
  }

  this.showConfiguration = function(zones, handler, showError) {
    element = '<option value="">Select one</option>';
    for (var z in zones) {
      element += '<option value="' + z + '">' + zones[z] + '</option>'
    }
    $('#config-zone').html(element);

    $('#config-add').unbind();
    $('#config-add').bind('click', null, function(event) {
      var name = $('#config-name').val().trim();
      var desc = $('#config-desc').val().trim();
      var zone = $('#config-zone').val().trim();
      var pin  = $('#config-pin').val().trim();
      if (name.length == 0 || desc.length == 0 || zone.length == 0 || pin.length == 0)
        alert('None of the fields may be empty');
      else {
        $('#configDialog').modal('hide');
        handler(pin, name, desc, zone);
      }
    });

    $("#configDialog").modal();
    if (showError) {
      alert("Failed to add remote");
    }
  }

}


/*
      <!-- Audio/Video settings -->
      <div class="well well-sm" style="text-align: center; display: inline-block; float: left; margin: 5px">
        <div class="btn-group btn-group-lg" role="group" aria-label="...">
          <button type="button" class="btn btn-default"><span class="glyphicon glyphicon-comment" aria-hidden="true"></span> Subtitle</button>
          <button type="button" class="btn btn-default"><span class="glyphicon glyphicon-music" aria-hidden="true"></span> Audio</button>
          <button type="button" class="btn btn-default"><span class="glyphicon glyphicon-facetime-video" aria-hidden="true"></span> Angle</button>
          <button type="button" class="btn btn-default"><span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span> Info</button>
        </div>
      </div>

      <!-- Playback settings -->
      <div class="well well-sm" style="text-align: center; display: inline-block; float: left; margin: 5px">
        <div class="btn-group btn-group-lg" role="group" aria-label="...">
          <button type="button" class="btn btn-default"><span class="glyphicon glyphicon-random" aria-hidden="true"></span> Shuffle</button>
          <button type="button" class="btn btn-default"><span class="glyphicon glyphicon-retweet" aria-hidden="true"></span> Repeat</button>
        </div>
      </div>

      <!-- Text input -->
      <div class="well well-sm" style="text-align: center; display: inline-block; float: left; margin: 5px">
        <div class="input-group">
          <input type="text" class="form-control" placeholder="Text input" aria-describedby="basic-addon2">
          <span class="input-group-btn">
            <button class="btn btn-default" type="button">Send</button>
          </span>
        </div>
      </div>

      <!-- App redirect -->
      <div class="alert alert-info" style="text-align: center; display: inline-block; float: left; margin: 5px">
        <h3>This activity is controlled from a separate screen.</h3>
        <br/>
        <button type="button" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-new-window" aria-hidden="true"></span> Take me there</button>
      </div>

      <!-- No options redirect -->
*/