var MultiRemoteTypes = function() {
  this.VOLUME_UP       = 1;
  this.VOLUME_DOWN     = 2;
  this.VOLUME_MUTE     = 3;
  this.VOLUME_UNMUTE   = 4;
  this.VOLUME_SET      = 5;

  this.PLAYBACK_PLAY           = 100;
  this.PLAYBACK_PAUSE          = 101;
  this.PLAYBACK_STOP           = 102;
  this.PLAYBACK_NEXT           = 103;
  this.PLAYBACK_PREVIOUS       = 104;
  this.PLAYBACK_CNEXT          = 105;
  this.PLAYBACK_CPREVIOUS      = 106;
  this.PLAYBACK_FASTFORWARD    = 107;
  this.PLAYBACK_REWIND         = 108;

  this.PLAYBACK_SKIP_FORWARD   = 109;
  this.PLAYBACK_SKIP_BACKWARD  = 110;
  this.PLAYBACK_LSKIP_FORWARD  = 111;
  this.PLAYBACK_LSKIP_BACKWARD = 112;

  this.PLAYBACK_STREAM         = 113;
  this.PLAYBACK_AUDIO          = 114;
  this.PLAYBACK_SUBTITLE       = 115;

  this.PLAYBACK_SHUFFLE        = 116;
  this.PLAYBACK_REPEAT         = 117;

  this.PLAYBACK_OSD            = 118;
  this.PLAYBACK_ANGLE          = 119;
  this.PLAYBACK_EJECT          = 120;

  this.PLAYBACK_PLAYPAUSE      = 121;

  this.NAVIGATE_UP           = 200;
  this.NAVIGATE_DOWN         = 201;
  this.NAVIGATE_LEFT         = 202;
  this.NAVIGATE_RIGHT        = 203;
  this.NAVIGATE_ENTER        = 204;
  this.NAVIGATE_BACK         = 205;
  this.NAVIGATE_HOME         = 206;
  this.NAVIGATE_MENU         = 207;
  this.NAVIGATE_TOPMENU      = 208;
  this.NAVIGATE_PAGEUP       = 209;
  this.NAVIGATE_PAGEDOWN     = 210;

  this.NAVIGATE_TEXTINPUT    = 211;
}

MRTypes = new MultiRemoteTypes();