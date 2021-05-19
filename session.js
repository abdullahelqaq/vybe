const { Worker } = require('worker_threads');
const fetch = require('node-fetch');

const clientId = "62598dfbbefd46eeb90783eb0b6d0ad9";
const clientSecret = "660c17961ea5435a9efaada516d3f528";
const redirectUri = "http://localhost:3000/authorized";

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
    this.worker.on('message', this.processWorkerUpdate.bind(this));
  }

  processWorkerUpdate(msg) {
    switch (msg.type) {
      case 'queue':
        this.queue = msg.data;
        console.log("Updated Queue: ");
        console.log(this.queue);
        break;
      case 'preferences':
        this.preferences = msg.data;
        console.log("Updated Preferences: ");
        console.log(this.preferences);
        break;
      case 'status':
        console.log("Session status update to " + msg.data);
        this.status = msg.data;
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

  setSeedSongs(songIds) {
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

  finishSong(songId) {
    this.worker.postMessage({type: 'finish', data: {id: songId}});
  }
}

module.exports = Session;