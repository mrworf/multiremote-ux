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
  this.nativeClient = (typeof MultiRemoteAPI != 'undefined');

  this.VIBRATE_BTN = 100;

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
    if (visible) {
      $("#busyIndicator").modal();
    } else {
      $("#busyIndicator").modal("hide");
    }
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
      $("#blockui").show();
    } else {
      $("#blockui").hide();
    }
  }

  this.addZone = function(strName, strId, handlerZone) {
    $("#zone-list").append('<li><a href="#" id="zone' + (this.zonecount++) + '">' + strName + '</a></li>');
    $("#zone" + (this.zonecount-1)).bind('click', {zone: strId, subzone: null}, function(event) {handlerZone(event.data.zone, event.data.subzone);});
  }

  this.addSubZone = function(strName, strId, lstSubZones, handlerZone) {
    var start = this.zonecount;

    var element = '<li class="dropdown">';
    element += '<a href="#" style="display: inline-block; padding-right: 0px" id="zone' + (this.zonecount++) + '">' + strName + '</a>';
    element += '<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false" style="display: inline-block"><span class="caret"></span></a>';
    element += '<ul class="dropdown-menu" role="menu">';
    element += '<li class="dropdown-header">Pick activity</li>';

    for (e in lstSubZones) {
      if (lstSubZones.hasOwnProperty(e)) {
        element += '<li><a href="#"  id="zone' + (this.zonecount++) + '">' + lstSubZones[e] + '</a></li>'
      }
    }

    element +=  '</ul></li>';

    $("#zone-list").append(element);
    $("#zone" + (start++)).bind('click', {zone: strId, subzone: null}, function(event) {handlerZone(event.data.zone, event.data.subzone);});
    for (e in lstSubZones) {
      if (lstSubZones.hasOwnProperty(e)) {
        $("#zone" + (start++)).bind('click', {zone: strId, subzone: e}, function(event) {handlerZone(event.data.zone, event.data.subzone);});
      }
    }

  }

  /**
   * Generate a scene selector based on the provided scene list, also highlights
   * the currently active scene.
   *
   * @param scenelst The list of scenes
   * @param active The active scene or null
   * @param handleSelection The function to be called when user selects a scene
   */
  this.createSceneSelector = function(scenelst, active, handleSelection) {
    var count = 0;

    var element = '<div class="well well-sm" style="text-align: center; display: inline-block; float: left; width: 100%;"><h1>Choose activity</h1>';

    // By default, all zones have a standby scene
    element += '<a id="scene' + (count++) + '" class="btn btn-default activity ' + (active == null ? "active" : "") + '" href="#" role="button"><div class="activity-icon"><img src="img/standby.png" /></div><h3>Standby</h3></a>';

    for (var e in scenelst) {
      var icon = "unknown";
      var name = scenelst[e]["name"];
      var id = e;

      // Decode what we need
      var tmp = scenelst[e]["ux-hint"].split(",");
      var hint = {};
      for (var t in tmp) {
        t = tmp[t].split("=");
        hint[t[0]] = t[1];
      }

      if (hint["icon"] != null) {
        icon = hint["icon"];
      }

      element += '<a id="scene' + (count++) + '" class="btn btn-default activity ' + (active == id ? "active" : "") + '" href="#" role="button"><div class="activity-icon">';
      element += '<img src="img/' + icon + '.png" />';
      element += '</div>';
      element += '<h3>' + name + '</h3>';
      element += '</a>';
    }

    element += "</div>"

    $('#canvas').html(element);

    // Assign a button handler for all our scenes
    count = 0;
    $('#scene' + (count++)).bind('click', {scene: null}, function(event) {handleSelection(event.data.scene);});
    for (var e in scenelst) {
      $('#scene' + (count++)).bind('click', {scene: e}, function(event) {handleSelection(event.data.scene);});
    }
  }

  this.vibrate = function(millisec) {
    if (!this.nativeClient) return;

    MultiRemoteAPI.vibrate(100);
  }

  this.containsType = function(lstCommands, type) {
    for(var c in lstCommands) {
      if (lstCommands[c].type == type) {
        return c;
      }
    }
    return null;
  }

  this.clearCanvas = function() {
    $('#canvas').html("");
  }

  this.hasPlaybackControls = function(lstCommands) {
    // These types are supported
    var supported = [
      MRTypes.PLAYBACK_PLAY,
      MRTypes.PLAYBACK_PAUSE,
      MRTypes.PLAYBACK_STOP,
      MRTypes.PLAYBACK_NEXT,
      MRTypes.PLAYBACK_PREVIOUS,
      MRTypes.PLAYBACK_CNEXT,
      MRTypes.PLAYBACK_CPREVIOUS,
      MRTypes.PLAYBACK_FASTFORWARD,
      MRTypes.PLAYBACK_REWIND,
      MRTypes.PLAYBACK_EJECT,
    ];

    for(var c in lstCommands) {
      if (supported.indexOf(lstCommands[c]["type"]))
        return true;
    }
    return false;
  }

  this.createPlaybackControls = function(lstCommands, handler) {
    if (!this.hasPlaybackControls(lstCommands))
      return;

    var mapping = {
      pbplay:      MRTypes.PLAYBACK_PLAY,
      pbpause:     MRTypes.PLAYBACK_PAUSE,
      pbstop:      MRTypes.PLAYBACK_STOP,
      pbnskip:     MRTypes.PLAYBACK_NEXT,
      pbpskip:     MRTypes.PLAYBACK_PREVIOUS,
      pbnchapter:  MRTypes.PLAYBACK_CNEXT,
      pbpchapter:  MRTypes.PLAYBACK_CPREVIOUS,
      pbforw:      MRTypes.PLAYBACK_FASTFORWARD,
      pbrew:       MRTypes.PLAYBACK_REWIND,
      pbeject:     MRTypes.PLAYBACK_EJECT,
    };

    var element = "";
    element += '<div class="well well-sm" style="text-align: center; display: inline-block; float: left; margin: 5px">';
    element += '  <div class="btn-group btn-group-lg" role="group" aria-label="...">';
    element += '    <button id="pbpchapter" type="button" class="btn btn-default" style="width: 80px"><span class="glyphicon glyphicon-step-backward" aria-hidden="true"></span></button>';
    element += '    <button id="pbplay" type="button" class="btn btn-default" style="width: 80px"><span class="glyphicon glyphicon-play" aria-hidden="true"></span></button>';
    element += '    <button id="pbpause" type="button" class="btn btn-default" style="width: 80px"><span class="glyphicon glyphicon-pause" aria-hidden="true"></span></button>';
    element += '    <button id="pbnchapter" type="button" class="btn btn-default" style="width: 80px"><span class="glyphicon glyphicon-step-forward" aria-hidden="true"></span></button>';
    element += '  </div>';
    element += '  <br/>';
    element += '  <div class="btn-group btn-group-lg" role="group" aria-label="..." style="padding-top: 10px;">';
    element += '    <button id="pbpskip" type="button" class="btn btn-default" style="width: 80px"><span class="glyphicon glyphicon-fast-backward" aria-hidden="true"></span></button>';
    element += '    <button id="pbrew" type="button" class="btn btn-default" style="width: 80px"><span class="glyphicon glyphicon-backward" aria-hidden="true"></span></button>';
    element += '    <button id="pbstop" type="button" class="btn btn-default" style="width: 80px"><span class="glyphicon glyphicon-stop" aria-hidden="true"></span></button>';
    element += '    <button id="pbforw" type="button" class="btn btn-default" style="width: 80px"><span class="glyphicon glyphicon-forward" aria-hidden="true"></span></button>';
    element += '    <button id="pbnskip" type="button" class="btn btn-default" style="width: 80px"><span class="glyphicon glyphicon-fast-forward" aria-hidden="true"></span></button>';
    element += '  </div>';
    element += '  <br/>';
    element += '  <div class="btn-group btn-group" role="group" aria-label="..." style="padding-top: 10px; width: 100%; padding-left: 10px; padding-right: 10px">';
    element += '    <button id="pbeject" type="button" style="width: 100%;" class="btn btn-default"><span class="glyphicon glyphicon-eject" aria-hidden="true"></span></button>';
    element += '  </div>';
    element += '</div>';

    $('#canvas').append(element);

    // Time to map the commands...
    for(var m in mapping) {
      var c = this.containsType(lstCommands, mapping[m]);
      if (c != null) {
        $('#' + m).bind('click', {command: c}, function(event){handler(event.data.command);});
      } else {
        $('#' + m).hide();
      }
    }
  }

  this.hasNavigationControls = function(lstCommands) {
    // These types are supported
    var supported = [
      MRTypes.NAVIGATE_UP,
      MRTypes.NAVIGATE_DOWN,
      MRTypes.NAVIGATE_LEFT,
      MRTypes.NAVIGATE_RIGHT,
      MRTypes.NAVIGATE_ENTER,
      MRTypes.NAVIGATE_BACK,
      MRTypes.NAVIGATE_HOME,
      MRTypes.NAVIGATE_MENU,
      MRTypes.NAVIGATE_TOPMENU,
      MRTypes.NAVIGATE_PAGEUP,
      MRTypes.NAVIGATE_PAGEDOWN,
    ];

    for(var c in lstCommands) {
      if (supported.indexOf(lstCommands[c]["type"]))
        return true;
    }
    return false;
  }

  this.createNavigationControls = function(lstCommands, handler) {
    if (!this.hasNavigationControls(lstCommands))
      return;

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
    element += '      <td rowspan="3" style="border-right: 1px solid #b2b2b2; padding: 3px; padding-right: 10px">';
    element += '        <button id="navpageup" type="button" style="float: left; height: 4em; margin-bottom: 3px;" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-arrow-up" aria-hidden="true"></span></button>';
    element += '        <br>';
    element += '        <button id="navpagedn" type="button" style="float: left; height: 4em; margin-top: 3px;" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-arrow-down" aria-hidden="true"></span></button>';
    element += '      </td>';
    element += '      <td style="padding: 3px; padding-left: 10px">';
    element += '      </td>';
    element += '      <td style="padding: 3px; vertical-align: bottom">';
    element += '          <button id="navup" type="button" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-menu-up" aria-hidden="true"></span></button>';
    element += '      </td>';
    element += '      <td style="padding: 3px; padding-right: 10px">';
    element += '      </td>';
    element += '      <td rowspan="3" style="border-left: 1px solid #b2b2b2; padding-left: 10px">';
    element += '        <div class="btn-group-vertical btn-group-lg" role="group" aria-label="...">';
    element += '          <button id="navhome" type="button" class="btn btn-default">Home</button>';
    element += '          <button id="navtop" type="button" class="btn btn-default">Top menu</button>';
    element += '          <button id="navmenu" type="button" class="btn btn-default">Menu</button>';
    element += '          <button id="navback" type="button" class="btn btn-default">Back</button>';
    element += '        </div>';
    element += '      </td>';
    element += '    </tr>';

    element += '    <tr>';
    element += '      <td style="padding: 3px; padding-left: 10px">';
    element += '        <button id="navleft" type="button" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span></button>';
    element += '      </td>';
    element += '      <td style="padding: 3px">';
    element += '        <button id="naventer" type="button" class="btn btn-default btn-lg">OK</button>';
    element += '      </td>';
    element += '      <td style="padding: 3px; padding-right: 10px">';
    element += '        <button id="navright" type="button" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span></button>';
    element += '      </td>';
    element += '    </tr>';

    element += '    <tr>';
    element += '      <td style="padding: 3px; padding-left: 10px">';
    element += '      </td>';
    element += '      <td style="padding: 3px; vertical-align: top">';
    element += '        <button id="navdown" type="button" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-menu-down" aria-hidden="true"></span></button>';
    element += '      </td>';
    element += '      <td style="padding: 3px; padding-right: 10px">';
    element += '      </td>';
    element += '    </tr>';
    element += '  </table>';
    element += '</div>';

    $('#canvas').append(element);

    // Time to map the commands...
    for(var m in mapping) {
      var c = this.containsType(lstCommands, mapping[m]);
      if (c != null) {
        $('#' + m).bind('click', {command: c}, function(event){handler(event.data.command);});
      } else {
        $('#' + m).hide();
      }
    }
  }
}


/*
      <!-- Navigation Control -->
      <div class="well well-sm" style="text-align: center; display: inline-block; float: left; margin: 5px">
        <table style="float: left">
          <tr>
            <td rowspan="3" style="border-right: 1px solid #b2b2b2; padding: 3px; padding-right: 10px">
              <button type="button" style="float: left; height: 4em; margin-bottom: 3px;" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-arrow-up" aria-hidden="true"></span></button>
              <br>
              <button type="button" style="float: left; height: 4em; margin-top: 3px;" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-arrow-down" aria-hidden="true"></span></button>
            </td>
            <td style="padding: 3px; padding-left: 10px">
            </td>
            <td style="padding: 3px; vertical-align: bottom">
                <button type="button" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-menu-up" aria-hidden="true"></span></button>
            </td>
            <td style="padding: 3px; padding-right: 10px">
            </td>
            <td rowspan="3" style="border-left: 1px solid #b2b2b2; padding-left: 10px">
              <div class="btn-group-vertical btn-group-lg" role="group" aria-label="...">
                <button type="button" class="btn btn-default">Home</button>
                <button type="button" class="btn btn-default">Top menu</button>
                <button type="button" class="btn btn-default">Menu</button>
                <button type="button" class="btn btn-default">Back</button>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 3px; padding-left: 10px">
              <button type="button" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span></button>
            </td>
            <td style="padding: 3px">
              <button type="button" class="btn btn-default btn-lg">OK</button>
            </td>
            <td style="padding: 3px; padding-right: 10px">
              <button type="button" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span></button>
            </td>
          </tr>

          <tr>
            <td style="padding: 3px; padding-left: 10px">
            </td>
            <td style="padding: 3px; vertical-align: top">
              <button type="button" class="btn btn-default btn-lg"><span class="glyphicon glyphicon-menu-down" aria-hidden="true"></span></button>
            </td>
            <td style="padding: 3px; padding-right: 10px">
            </td>
          </tr>
        </table>
      </div>
      <br clear="all">
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

      <!-- Volume controls -->
      <div class="well well-sm" style="text-align: center; display: inline-block; float: left; margin: 5px">
        <div class="btn-group-vertical btn-group-lg" role="group" aria-label="...">
          <button type="button" style="height: 4em" class="btn btn-default"><span class="glyphicon glyphicon-volume-up" aria-hidden="true"></span></button>
          <button type="button" style="height: 4em" class="btn btn-default"><span class="glyphicon glyphicon-volume-down" aria-hidden="true"></span></button>
          <button type="button" class="btn btn-default"><span class="glyphicon glyphicon-volume-off" aria-hidden="true"></span></button>
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
      <div class="alert alert-warning" style="text-align: center; display: inline-block; float: left; margin: 5px">
        <h3>This activity has no controls</h3>
      </div>
*/