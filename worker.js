const { parentPort } = require('worker_threads');
const sqlite3 = require('sqlite3').verbose();
const SpotifyWebApi = require('spotify-web-api-node');
const skmeans = require("skmeans");

const k = 3;
const threshold = 0.3;

let spotify = new SpotifyWebApi();
let seedSongs, clusters;

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
  const tracks = await retrieveUserTopTracks();

  // perform clustering
  let vectors = [];
  for (const [id, data] of Object.entries(tracks)) {
    vectors.push([ data.valence, data.energy, data.danceability ]);
  }
  clusters = skmeans(vectors, k, 'kmpp');
  
  // determine target cluster
  const seedSongsFeatures = await getAudioFeatures(seedSongs);
  for (const [id, data] of Object.entries(seedSongsFeatures)) {
    console.log(`${id}: ${JSON.stringify(clusters.test([ data.valence, data.energy, data.danceability ]))}`);
  }
}

// Retrieve the user's top tracks (limit of 50 tracks)
async function retrieveUserTopTracks() {
  const topTracks = await spotify.getMyTopTracks()
    .then(function(data) {
      return getAudioFeatures(data.body.items);
    });
  return topTracks;
}

// Given a list of objects with an 'id' property, generate a dictionary of audio features for each one
async function getAudioFeatures(tracks) {
  let features = {};
  for (let track of tracks) {
    await spotify.getAudioFeaturesForTrack(track.id)
      .then(function(data) {
        features[track.id] = data.body;
        features[track.id].name = track.name;
      });
  }
  return features;
}

// Find songs from database in target cluster
function findSongs() {
  const maxSongSuggestions = 10;
  let generatedSongs = [];

  let db = new sqlite3.Database('./data/SpotifyFeatures.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Connected to database');
  });

  const sql = `SELECT * FROM SpotifyFeatures WHERE genre = '${selectGenre}' ORDER BY RANDOM() LIMIT ${maxSongSuggestions}`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      throw err;
    }
    generatedSongs = rows;
    parentPort.postMessage(rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Closed database');
  });
}