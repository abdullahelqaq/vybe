const { Worker } = require('worker_threads');
const fetch = require('node-fetch');

const clientId = "62598dfbbefd46eeb90783eb0b6d0ad9";
const clientSecret = "660c17961ea5435a9efaada516d3f528";
const redirectUri = "https://vybemusic.herokuapp.com/authorized";

class Session {
  constructor(id) {
    this.sessionId = id;
    this.accessToken = '';
    this.refreshToken = '';

    this.sse = null;

    this.skippedSongs = 0;
    this.skippedSongFeedback = [];
    this.finishedSongs = 0;
    this.likedSongs = 0;

    // background worker init
    this.worker = new Worker('./worker.js');
    this.worker.on('message', this.processWorkerUpdate.bind(this));
  }

  processWorkerUpdate(msg) {
    switch (msg.type) {
      case 'update':
        console.log("Updated queue and preferences");
        this.sse.write(`data: ${JSON.stringify(msg.data)}\n\n`);
        break;
    }
  }

  // Use authorization code to authenticate user
  async authenticate(code) {
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
      },
      mode: 'cors',
      body: new URLSearchParams({
        'code': code,
        'redirect_uri': redirectUri,
        'grant_type': 'authorization_code'
      }
      )
    });
    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    console.log("Authorization token retrieved: " + accessToken);
    this.setTokens(accessToken, refreshToken);
  }

  addSong(song) {
    this.worker.postMessage({type: 'song', data: song});
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.worker.postMessage({type: 'tokens', data: {accessToken: accessToken, refreshToken: refreshToken}});
  }

  skipSong(songId, feedback) {
    this.worker.postMessage({type: 'skip', data: {id: songId, feedback: feedback}});
    this.skippedSongs++;
    this.skippedSongFeedback.push(feedback);
  }

  finishSong(songId, liked) {
    this.worker.postMessage({type: 'finish', data: {id: songId, liked: liked}});
    this.finishedSongs++;
    if (liked) this.likedSongs++;
  }

  setMode(mode) {
    this.stats();
    console.log("Switching mode to " + mode);
    this.worker.postMessage({type: 'mode', data: {mode: mode}});
  }

  stats() {
    console.log(`Session stats - ID: ${this.sessionId}), Finished ${this.finishedSongs}, Liked ${this.likedSongs}, Skipped ${this.skippedSongs}, Feedback: ${this.skippedSongFeedback}`);
    this.skippedSongs = 0;
    this.skippedSongFeedback = [];
    this.finishedSongs = 0;
    this.likedSongs = 0;
  }
}

module.exports = Session;