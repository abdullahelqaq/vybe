import SpotifyWebApi from 'spotify-web-api-js';

let currentSong, queue = [];
let preferences;

let sessionId = null;
let deviceId = null;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const url = 'https://vybemusic.herokuapp.com';
// const url = 'http://localhost:3000';

export const authEndpoint = 'https://accounts.spotify.com/authorize';

const clientId = "62598dfbbefd46eeb90783eb0b6d0ad9";
const redirectUri = `${url}/authorized`;
const scopes = ['user-top-read', 'playlist-read-private', 'user-modify-playback-state', "streaming", "user-read-email", "user-read-private"];

let spotify = new SpotifyWebApi({
  redirectUri: redirectUri,
  clientId: clientId
});

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

export async function addSong(songId, name, artist_names) {
  const song = {
    track_id: songId,
    track_name: name,
    track_artist: artist_names.join(' & ')
  };
  await fetch(`${url}/addSong?id=${sessionId}`, {
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

export function processUpdate(data) {
  const updatedQueue = data.queue;
  const updatedPreferences = data.preferences;
  currentSong = updatedQueue[0];
  updatedQueue.shift();
  queue = updatedQueue;
  return { currentSong: currentSong, queue: updatedQueue, preferences: updatedPreferences };
}

export function setDeviceId(id) {
  deviceId = id;
}

export async function setQueueMode(queueMode) {
  await fetch(`${url}/suggestionMode?id=${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify({
      mode: queueMode
    }
    )
  });
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

export async function skipSong(songId, feedback) {
  await fetch(`${url}/skip?id=${sessionId}`, {
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

export async function finishSong(songId, liked) {
  await fetch(`${url}/finish?id=${sessionId}`, {
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
