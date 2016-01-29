/**
 * Event Service
 *
 * Opens a WebSocket to multiRemote so it can be notified about
 * changes made by other devices/remotes.
 */

MultiRemoteEventService = function(serverAddress, remoteId, funcEvents) {
  this.cfgAddress = "ws://" + serverAddress + ":5000/events/" + remoteId;
  this.cfgResultFunc = funcEvents;
  this.socket = null;
  this.retryCount = 0;
  this.retryDelay = 0;
  this.retryEnabled = true;

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
    if (this.isConnected())
      this.socket.send("DEBUG");
  }

  this.onOpen = function() {
    this.retryCount = 0;
    this.retryDelay = 0;
    this.socket.send("SUBSCRIBE *");
  }

  this.onMessage = function(event) {
    var data = JSON.parse(event.data);
    console.log("EventService: " + event.data);
    this.cfgResultFunc(data.type, data.source, data.data);
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
}