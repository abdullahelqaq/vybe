const { Worker } = require('worker_threads');

class Session {
  constructor(id) {
    this.sessionId = id;
    this.accessToken = '';
    this.refreshToken = '';

    this.generatedSongs = [];

    this.seedSongs = [];

    // background worker init
    this.worker = new Worker('./worker.js');
    this.worker.on('message', function (msg) {
      switch (msg.type) {
        case 'generatedSongs':
          this.generatedSongs = msg.data;
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
}

module.exports = Session;