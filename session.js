const { Worker, workerData } = require('worker_threads');

class Session {
  constructor(id, token) {
    this.sessionId = id;
    this.accessToken = token;

    this.workerStatus = 0;
    this.generatedSongs = [];

    this.userSongs = [];
  }

  setSongs(songIds) {
    this.userSongs = songIds;

    this.worker = new Worker('./worker.js', { workerData: { songs: songIds } });
    this.worker.on('message', (msg) => {
        this.workerStatus = 1;
        this.generatedSongs = msg;
    });

  }

}

module.exports = Session;