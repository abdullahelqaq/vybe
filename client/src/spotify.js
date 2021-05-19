import SpotifyWebApi from 'spotify-web-api-js';

let currentSong, queue, preferences;

let sessionId = null;
let deviceId = null;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

export const authEndpoint = 'https://accounts.spotify.com/authorize';

const clientId = "62598dfbbefd46eeb90783eb0b6d0ad9";
const redirectUri = "http://localhost:3000/authorized";
const scopes = ['user-top-read', 'playlist-read-private', 'user-modify-playback-state', "streaming", "user-read-email", "user-read-private"];

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
  if (urlParams.has('token')) {
    spotify.setAccessToken(urlParams.get('token'));
  }
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

export function setDeviceId(id) {
  deviceId = id;
}

// for demo purposes - add three seed songs to simulate searching and adding them manually
export function testPopulateQueueSeedSongs() {
  let songs = [
    {
      track_name: "Faded",
      artist_name: "Alan Walker",
      track_id: "7gHs73wELdeycvS48JfIos"
    },
    {
      track_name: "Come & Go",
      artist_name: "Juice WRLD",
      track_id: "6ltMvd6CjoydQZ4UzAQaqh"
    },
    {
      track_name: "In Your Arms",
      artist_name: "ILLENIUM",
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
  console.log("Playing next song");
  // update currentSong and queue in React
}

export async function playSong(songId) {
  return await spotify.play({ device_id: deviceId, uris: [`spotify:track:${songId}`] });
}

export async function pauseSong() {
  return await spotify.pause({device_id: deviceId});
}

export async function resumeSong() {
  return await spotify.play({device_id: deviceId});
}

export function skipSong(songId, feedback) {
  console.log("Song skipped");
  fetch(`http://localhost:3000/skip?id=${sessionId}`, {
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

export function finishSong(songId) {
  console.log("Song finished");
  fetch(`http://localhost:3000/finish?id=${sessionId}`, {
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