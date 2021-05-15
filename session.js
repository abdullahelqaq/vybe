const { Worker } = require('worker_threads');

class Session {
  constructor(id) {
    this.sessionId = id;
    this.accessToken = '';
    this.refreshToken = '';

    this.songSuggestions = [];
    this.songSuggestionStatus = 0; // 0 for idle, 1 for generating
    this.seedSongs = [];

    // background worker init
    this.worker = new Worker('./worker.js');
    this.worker.on('message', function (msg) {
      switch (msg.type) {
        case 'songSuggestions':
          this.songSuggestions = msg.data;
          break;
        case 'songSuggestionStatus':
          this.songSuggestionStatus = msg.data;
          break;
      }
    });
  }

  setSongs(songIds) {
    this.seedSongs = songIds;
    this.worker.postMessage({type: 'seedSongs', data: songIds});
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.worker.postMessage({type: 'tokens', data: {accessToken: accessToken, refreshToken: refreshToken}});
  }

  getSongSuggestions() {
    if (this.songSuggestionStatus == 1)
      return null;
    return this.songSuggestions;
  }
}

module.exports = Session;