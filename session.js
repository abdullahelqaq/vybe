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

    this.sse = null;

    this.queue = [];
    this.preferences = [];
    this.status = 0; // 0 for idle, 1 for new queue waiting

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
  }

  finishSong(songId, liked) {
    this.worker.postMessage({type: 'finish', data: {id: songId, liked: liked}});
  }
}

module.exports = Session;