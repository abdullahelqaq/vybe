const { parentPort } = require('worker_threads');
const sqlite3 = require('sqlite3').verbose();
const SpotifyWebApi = require('spotify-web-api-node');
const skmeans = require("skmeans");

const k = 3;
const threshold = 0.3;
const maxSongSuggestions = 10;
const topSongsPlaylistYears = ['2020']

let spotify = new SpotifyWebApi();
let seedSongs, playedSongs = [];
let clusters, targetCluster;

// for the identified cluster, determine thresholds to prevent outliers
let thresholds = new Array(k).fill([threshold, threshold]).flat();

// receive messages from main thread
parentPort.on("message", function (msg) {
  switch (msg.type) {
    case 'tokens':
      console.log(`Access token received`);
      spotify.setAccessToken(msg.data.accessToken);
      break;
    case 'seedSongs':
      console.log(`Seed songs received`);
      seedSongs = msg.data;
      processTracks();
      break;
    case 'like':
      break;
    case 'skip':
      break;
  }
});

// Retrieve top tracks for the user and apply k-means clustering
// Then use the seed songs to identify the target cluster for song suggestions
async function processTracks() {
  setStatus(1);

  const tracks = await retrieveUserTopTracks();
  
  // perform clustering
  let vectors = [];
  for (const [id, data] of Object.entries(tracks)) {
    vectors.push([data.valence, data.energy, data.danceability]);
  }
  clusters = skmeans(vectors, k, 'kmpp');

  // determine target cluster
  const seedSongsFeatures = await getAudioFeatures(seedSongs);
  for (const [id, data] of Object.entries(seedSongsFeatures)) {
    console.log(`${id}: ${JSON.stringify(clusters.test([data.valence, data.energy, data.danceability]))}`);
  }
}

// Retrieve the user's top tracks (limit of 50 tracks)
async function retrieveUserTopTracks() {
  const topTracks = await spotify.getMyTopTracks()
    .then(function (data) {
      return getAudioFeatures(data.body.items);
    });
  const playlistTracks = await spotify.searchPlaylists('Your Top Songs')
    .then(async function (data) {
      userPlaylistTracks = {};
      for (const playlist of data.body.playlists.items) {
        for (const year of topSongsPlaylistYears) {
          if (playlist.name.startsWith('Your Top Songs') && playlist.name.includes(year) && playlist.owner.id == 'spotify') {
            const tracks = await spotify.getPlaylist(playlist.id)
              .then(function (data) {
                const filteredTracks = [];
                for (const playlistTrack of data.body.tracks.items)
                  filteredTracks.push(playlistTrack.track);
                return getAudioFeatures(filteredTracks);
              });

              userPlaylistTracks = { ...userPlaylistTracks, ...tracks };
          }
        }
      }
      return userPlaylistTracks;
    });

  return {...topTracks, ...userPlaylistTracks};
}

// Given a list of objects with an 'id' property, generate a dictionary of audio features for each one
async function getAudioFeatures(tracks) {
  let features = {};
  for (let track of tracks) {
    await spotify.getAudioFeaturesForTrack(track.id)
      .then(function (data) {
        features[track.id] = data.body;
        features[track.id].name = track.name;
      });
  }
  return features;
}

// Skip the song and use user feedback to adjust cluster centers
async function skipSong(feedback) {

}

// Adjust cluster center
async function likeSong() {

}

// Find songs from database in target cluster
function findSongSuggestions() {
  setStatus(1);

  let db = new sqlite3.Database('./data/SpotifySongs.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to database');
  });

  const sql = `SELECT * FROM SpotifySongs WHERE NOT id IN (${playedSongs.join()}) AND  ORDER BY RANDOM() LIMIT ${maxSongSuggestions}`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      throw err;
    }

    parentPort.postMessage({ type: 'songSuggestions', data: rows });
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Closed database');
  });

  setStatus(0);
}

function setStatus(status) {
  parentPort.postMessage({ type: 'songSuggestionStatus', data: status });
}