import SpotifyWebApi from 'spotify-web-api-js';

let currentSong, queue = [];
let preferences;

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

export const checkServerStatusIntervalMs = 5000;

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

export function addSong(songId, name, artist_names) {
  const song = {
    track_id: songId,
    track_name: name,
    track_artist: artist_names.join(' & ')
  };
  fetch(`http://localhost:3000/addSong?id=${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify({
      song: song
    }
    )
  });
  if (!currentSong) {
    currentSong = song;
    playSong(currentSong.track_id);
  } else {
    queue.push(song);
  }
    
  return [currentSong, queue]
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

    const updatedQueue = queueBody.queue;
    const updatedPreferences = preferencesBody.preferences;
    currentSong = updatedQueue[0];
    updatedQueue.shift();
    queue = updatedQueue;
    console.log(currentSong);
    console.log(queue);
    return { currentSong: currentSong, queue: queue, preferences: updatedPreferences };
  }

  return null;
}

export function setDeviceId(id) {
  deviceId = id;
}

// SONG CONTROLS

export function playNextSong() {
  currentSong = queue[0];
  queue.shift();
  playSong(currentSong.track_id);
  console.log("Playing next song");

  return [currentSong, queue]
}

export async function playSong(songId) {
  return await spotify.play({ device_id: deviceId, uris: [`spotify:track:${songId}`] });
}

export async function pauseSong() {
  return await spotify.pause({ device_id: deviceId });
}

export async function resumeSong() {
  return await spotify.play({ device_id: deviceId });
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
  return playNextSong();
}

export function finishSong(songId, liked) {
  console.log("Song finished");
  fetch(`http://localhost:3000/finish?id=${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify({
      id: songId,
      liked: liked
    }
    )
  });
  return playNextSong();
}

export async function restartSong() {
  return await spotify.seek(0);
}

export async function search(query) {
  return await spotify.searchTracks(query);
}
