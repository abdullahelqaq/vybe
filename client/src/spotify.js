import SpotifyWebApi from 'spotify-web-api-js';

let sessionId = null;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

export const authEndpoint = 'https://accounts.spotify.com/authorize';

const clientId = "62598dfbbefd46eeb90783eb0b6d0ad9";
const clientSecret = "660c17961ea5435a9efaada516d3f528";
const redirectUri = "http://localhost:3000/authorized";
const scopes = ['user-top-read', 'playlist-read-private'];

let accessToken, refreshToken;

let spotify = new SpotifyWebApi({
  redirectUri: redirectUri,
  clientId: clientId
});

const checkServerStatusIntervalMs = 10000;

checkUrlParams();

export const authorizationUrl = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join("%20")}&response_type=code&show_dialog=true`;

export function checkUrlParams() {
  if (urlParams.has('id')) {
    sessionId = urlParams.get('id');
  }
  if (urlParams.has('code')) {
    authenticate(urlParams.get('code'));
    setInterval(checkStatus, checkServerStatusIntervalMs);
  }
}

// Use authorization code to authenticate user
async function authenticate(code) {
  console.log("User authorized, retrieving token");
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
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token;
  spotify.setAccessToken(accessToken);

  console.log("Token retrieved");
  const uploadResponse = await fetch(`http://localhost:3000/token?id=${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
      }
    )
  });
}

// set seed songs
// TODO: Implement search feature instead of hardcoding three song IDs
export function setSongs() {
  const response = fetch(`http://localhost:3000/setSongs?id=${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify({
        songs: [
          {
            track_name: "Faded",
            artist_name: "Alan Walker",
            id: "7gHs73wELdeycvS48JfIos"
          },
          {
            track_name: "Come & Go",
            artist_name: "Juice WRLD",
            id: "6ltMvd6CjoydQZ4UzAQaqh"
          },
          {
            track_name: "In Your Arms",
            artist_name: "ILLENIUM",
            id: "70YPzqSEwJvAIQ6nMs1cjY"
          }
        ]
      }
    )
  });
  return response;
}

export async function checkStatus() {
  const statusResponse = await fetch(`http://localhost:3000/status?id=${sessionId}`, {
    method: 'GET',
    mode: 'cors'
  });
  const statusBody = await tokenResponse.json();
  
  if (statusBody.status == 1) {
    const queueResponse = await fetch(`http://localhost:3000/queue?id=${sessionId}`, {
      method: 'GET',
      mode: 'cors'
    });
    const queueBody = await queueResponse.json();
    const preferencesResponse = await fetch(`http://localhost:3000/preferences?id=${sessionId}`, {
      method: 'GET',
      mode: 'cors'
    });
    const preferencesBody = await preferencesResponse.json();

    console.log("Updated queue: ");
    console.log(queueBody.queue);
    console.log("Updated preferences: ");
    console.log(preferencesBody.preferences);
  }
}


// SONG CONTROLS

export function playSong(songId) {
  //play 
}

export function skipSong(songId, feedback) {
  const response = fetch(`http://localhost:3000/skip?id=${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify({
        id: songId,
        feedback: feedback
      }
    )
  });
  return response;
}

export function finishSong(songId) {
  const response = fetch(`http://localhost:3000/finish?id=${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify({
        id: songId
      }
    )
  });
  return response;
}

export function restartSong(songId) {
  //seek to beginning
}
