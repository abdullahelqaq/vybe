const { Worker } = require('worker_threads');

class Session {
  constructor(id) {
    this.sessionId = id;
    this.accessToken = '';
    this.refreshToken = '';

    this.queue = [];
    this.preferences = [];
    this.status = 0; // 0 for idle, 1 for new queue waiting
    this.seedSongs = [];

    // background worker init
    this.worker = new Worker('./worker.js');
    this.worker.on('message', function (msg) {
      switch (msg.type) {
        case 'queue':
          this.queue = msg.data;
          break;
        case 'preferences':
          this.preferences = msg.data;
          break;
        case 'status':
          this.status = msg.data;
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

  skipSong(songId, feedback) {
    this.worker.postMessage({type: 'skip', data: {id: songId, feedback: feedback}});
  }
}

module.exports = Session;