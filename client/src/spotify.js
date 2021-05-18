import SpotifyWebApi from 'spotify-web-api-js';

let currentSong, queue, preferences;

let sessionId = null;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

export const authEndpoint = 'https://accounts.spotify.com/authorize';

const clientId = "62598dfbbefd46eeb90783eb0b6d0ad9";
const clientSecret = "660c17961ea5435a9efaada516d3f528";
const redirectUri = "http://localhost:3000/authorized";
const scopes = ['user-top-read', 'playlist-read-private', 'user-modify-playback-state', "streaming", "user-read-email", "user-read-private"];

let accessToken, refreshToken;

let spotify = new SpotifyWebApi({
  redirectUri: redirectUri,
  clientId: clientId
});

export const checkServerStatusIntervalMs = 10000;

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
export function setSeedSongs() {
  const response = fetch(`http://localhost:3000/setSeedSongs?id=${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify({
      songs: [...[currentSong], ...queue]
    }
    )
  });
  return response;
}

// checks status and returns queue and preferences if there is an updated one waiting
export async function checkStatus() {
  const statusResponse = await fetch(`http://localhost:3000/status?id=${sessionId}`, {
    method: 'GET',
    mode: 'cors'
  });
  const statusBody = await statusResponse.json();

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

    queue = queueBody.queue;
    preferences = preferencesBody.preferences;
    return { queue: queue, preferences: preferences };
  }

  return null;
}

// for demo purposes - add three seed songs to simulate searching and adding them manually
export function testPopulateQueueSeedSongs() {
  let songs = [
    {
      track_name: "Faded",
      artist_name: "Alan Walker",
      id: "7gHs73wELdeycvS48JfIos",
      track_id: "7gHs73wELdeycvS48JfIos"
    },
    {
      track_name: "Come & Go",
      artist_name: "Juice WRLD",
      id: "6ltMvd6CjoydQZ4UzAQaqh",
      track_id: "6ltMvd6CjoydQZ4UzAQaqh"
    },
    {
      track_name: "In Your Arms",
      artist_name: "ILLENIUM",
      id: "70YPzqSEwJvAIQ6nMs1cjY",
      track_id: "70YPzqSEwJvAIQ6nMs1cjY"
    }
  ];

  currentSong = songs[0];
  songs.shift();
  queue = [...songs];
  playSong(currentSong.track_id);
  setSeedSongs();
}

// SONG CONTROLS

export function playNextSong() {
  currentSong = queue[0];
  queue.shift();
  playSong(currentSong.track_id);
  // update currentSong and queue in React
}

export async function playSong(songId) {
  return await spotify.play({ uris: [`spotify:track:${songId}`] });
}

export async function pauseSong() {
  return await spotify.pause();
}

export async function resumeSong() {
  return await spotify.play();
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
  playNextSong();
}

export async function finishSong(songId) {
  const response = await fetch(`http://localhost:3000/finish?id=${sessionId}`, {
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
  playNextSong();
}

export async function restartSong() {
  return await spotify.seek(0);
}

document.addEventListener('keydown', function (event) {
  if (event.key == 'Enter') {
    // ideally there would be a button in the queue page or some way to fill the queue with
    // predefined seed songs for demo purposes
    testPopulateQueueSeedSongs();
  }
});