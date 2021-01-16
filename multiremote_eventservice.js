/**
 * Event Service
 *
 * Opens a WebSocket to multiRemote so it can be notified about
 * changes made by other devices/remotes.
 */

MultiRemoteEventService = function(serverAddress, remoteId, funcEvents) {
  if (serverAddress.substring(0, 7).toLowerCase() == "http://")
    serverAddress = serverAddress.substring(7);
  this.cfgAddress = "ws://" + serverAddress + "/events/" + remoteId;
  this.uuid = remoteId;
  this.cfgResultFunc = funcEvents;
  this.socket = null;
  this.retryCount = 0;
  this.retryDelay = 0;
  this.retryEnabled = true;
  this.execId = 0;
  this.execInFlight = [];
  
  this.connect = function() {
    var self = this;

    if (this.socket != null) {
      console.log("connect() Already connected");
      return;
    }
    this.retryEnabled = true;
    this.socket = new WebSocket(this.cfgAddress);
    this.socket.onopen = function() { self.onOpen(); };
    this.socket.onclose = function() { self.onClose(); };
    this.socket.onmessage = function(evt) { self.onMessage(evt); };
    this.socket.onerror = function(evt) { self.onError(evt); };
  }

  this.close = function() {
    if (this.socket == null)
      return;
    this.retryEnabled = false;
    this.socket.close();
  }

  this.isConnected = function() {
    return (this.socket != null && this.socket.readyState == 1);
  }

  this.test = function() {
    ;
    /*
    if (this.isConnected())
      this.socket.send("DEBUG");
    */
  }

  this.onOpen = function() {
    this.retryCount = 0;
    this.retryDelay = 0;
    this.socket.send("SUBSCRIBE *");
  
    // Make sure all pending commands are sent...
    console.log(this.execInFlight);
    for (exec in this.execInFlight) {
      exec = this.execInFlight[exec];
      console.log(exec);
      if (exec.state == "pending") {
        var msg = "EXECUTE {\"id\":" + exec.execId + ",\"addr\":\"" + exec.path + "\"}";
        this.socket.send(msg);
        exec.state = "sent";
      }
    }
  }

  this.onMessage = function(event) {
    var data = JSON.parse(event.data);
    console.log("EventService: " + event.data);
    // Some things are handled internally here
    switch(data.type) {
      case "result":
        this.handleResult(data);
        break;
      default:
        this.cfgResultFunc(data.type, data.source, data.data);
      }
  }

  this.handleResult = function(event) {
    if (event.source != this.uuid) {
      console.log("Warning, got exec result for other remote, ignoring (us: " + this.uuid + ", them: " + event.source + ")");
      return;
    }

    var result = event.data;
    // Locate the ID for which we have a result
    console.log("Looking for a matching exec");
    for (index in this.execInFlight) {
      var exec = this.execInFlight[index];
      console.log(exec);
      if (exec.execId == result.id) {
        // Remove it, since we now resolved it
        this.execInFlight.splice(index, 1);
        console.log("Found a matching exec in-flight");
        if (exec.success)
          exec.success(result.result);
        else
          console.log("ERROR: No success method defined");
        return;
      }
    }
    console.log("Warning! No matching in-flight exec for " + result.id + ", dropping it");
  }

  this.onError = function(event) {
    console.log("EventService: Connection lost due to error");
  }

  this.onClose = function() {
    var self = this;

    this.socket = null;
    if (this.retryEnabled) {
      this.retryCount++;
      if (this.retryCount > 1 && this.retryDelay == 0)
        this.retryDelay = 5000;
      else if ((this.retryDelay*2) < 60000)
        this.retryDelay *= 2;
      else
        this.retryDelay = 60000;
      console.log("EventService: Reconnecting in %d seconds", this.retryDelay/1000);
      setTimeout(function() { self.connect(); }, this.retryDelay);
    }
  }

  this.execute = function(path, success, error) {
    var data = {
      "execId" : this.execId++,
      "path" : path,
      "success" : success,
      "error" : error,
      "state" : "pending"
    };
    this.execInFlight.push(data)
    var msg = "EXECUTE {\"id\":" + data.execId + ",\"addr\":\"" + data.path + "\"}";
    if (this.isConnected()) {
      console.log('Sending ' + msg);
      this.socket.send(msg);
      data.state = "sent"
    } else {
      console.log('Command queued for connection');
    }
  }
 
}