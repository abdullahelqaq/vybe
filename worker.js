// dataset from https://github.com/rfordatascience/tidytuesday/tree/master/data/2020/2020-01-21

const { parentPort } = require('worker_threads');
const SpotifyWebApi = require('spotify-web-api-node');
const skmeans = require('skmeans');
const csv = require('csv-parser');
const fs = require('fs');
const { resolve } = require('path');
var spawn = require("child_process").spawn;

const k = 4;
const clusteringPyPath = './clustering/cluster.py';
const threshold = 0.2;
const queueSize = 10;
const topSongsPlaylistYears = ['2020']
const audioFeatures = ['Valence', 'Energy', 'Danceability', 'Acousticness', 'Loudness', 'Instrumentalness', 'Liveness', 'Speechiness', 'Tempo'];
const clusterFeatures = ['valence', 'energy', 'danceability']; //'acousticness', 'tempo'

const skipSongClusterCentersWeights = [-0.1, -0.25, -0.5];
const likeSongClusterCentersWeight = 0.3;
const finishSongClusterCentersWeight = 0.15;

let songs, keys, queue = [];
let spotify = new SpotifyWebApi();
let seedSongs;
let clusters, targetCluster;

// receive messages from main thread
parentPort.on("message", function (msg) {
  switch (msg.type) {
    case 'tokens':
      spotify.setAccessToken(msg.data.accessToken);
      break;
    case 'seedSongs':
      console.log(`Seed songs received`);
      seedSongs = msg.data;
      processTracks();
      break;
    case 'skip':
      skipSong(msg.data.id, msg.data.feedback);
      break;
    case 'finish':
      finishSong(msg.data.id, msg.data.liked);
      break;
  }
});

// Retrieve top tracks for the user and apply k-means clustering
// Then use the seed songs to identify the target cluster for song suggestions
//
// This is only done once per session at the beginning
async function processTracks() {
  // load song database
  let dbSongs = await loadDatabase();
  // retrieve user's top 50 tracks with corresponding audio features
  let tracks = await retrieveUserTopTracks();

  //normalize the data
  [songs, tracks] = normalizeData(dbSongs, tracks);
  keys = Object.keys(songs);

  // perform clustering
  const features = getClusterFeatures(Object.values(tracks));
  clusters = await cluster(features)
  console.log(clusters);

  // determine target cluster
  const seedSongsFeatures = await getAudioFeatures(seedSongs);
  // add seed songs (except first one because its currently playing) to queue
  for (let i = 0; i < seedSongs.length; i++) {
    const songId = seedSongs[i].track_id;
    seedSongsFeatures[songId].track_name = seedSongs[i].track_name;
    seedSongsFeatures[songId].track_artist = seedSongs[i].track_artist;
    seedSongsFeatures[songId].track_id = seedSongs[i].track_id;
    seedSongsFeatures[songId].seed_song = true;
  }
  queue = [...Object.values(seedSongsFeatures)];
  const seedClusters = await determineClusters(getClusterFeatures(Object.values(seedSongsFeatures)), 1);

  console.log(seedClusters);
  targetCluster = clusters.centroids[mode(seedClusters)];
  console.log('Target Cluster');
  console.log(targetCluster);

  await updateQueue(true);
}

async function cluster(data) {
  const task = new Promise((resolve, reject) => {
    var process = spawn('python', [clusteringPyPath, 'cluster']);
    process.stdin.write(JSON.stringify(data) + '\n');
    process.stdout.on('data', function (data) {
      let lines = data.toString().split("\n");
      for (let s of lines) {
        if (s.startsWith("Result: ") === true) {
          s = s.replace("Result: ", "");
          resolve(JSON.parse(s));
        } else {
          console.log(s);
        }
      }
    });
    process.stderr.on('data', function (data) {
      console.error(data.toString());
      reject(data.toString());
    });
  });
  return task;
}

// Adjust the target cluster center using a specified weight
async function adjustClusterCenter(weight, features) {
  const newCentroid = features.map((x, i) => targetCluster.centroid[i] + ((targetCluster.centroid[i] - x) * weight));
  // clamp value
  targetCluster.centroid = newCentroid.map(x => Math.min(Math.max(x, 0), 1));
  clusters[targetCluster.idx] = targetCluster;
}

// Retrieve the user's top tracks (limit of 50 tracks)
async function retrieveUserTopTracks() {
  // top tracks
  const topTracks = await spotify.getMyTopTracks()
    .then(function (data) {
      return getAudioFeatures(data.body.items);
    });

  return topTracks;
}

function normalizeData(db, tracks) {
  let data = { ...tracks, ...db };
  minmax = {}
  //get min/max values
  for (const featureName of clusterFeatures) {
    let min = Number.MAX_SAFE_INTEGER, max = Number.MIN_SAFE_INTEGER;
    for (const [id, song] of Object.entries(data)) {
      min = Math.min(min, song[featureName]);
      max = Math.max(max, song[featureName]);
    }
    minmax[featureName] = [min, max];
  }

  // normalize data
  for (let [id, song] of Object.entries(db)) {
    for (const featureName of clusterFeatures) {
      const [min, max] = minmax[featureName];
      const val = song[featureName];
      const delta = max - min;
      if (delta == 0)
        song[featureName] = 1;
      else
        song[featureName] = (val - min) / delta;
    }
  }
  for (let [id, song] of Object.entries(tracks)) {
    for (const featureName of clusterFeatures) {
      const [min, max] = minmax[featureName];
      const val = song[featureName];
      const delta = max - min;
      if (delta == 0)
        song[featureName] = 1;
      else
        song[featureName] = (val - min) / delta;
    }
  }

  return [db, tracks];
}

// Given a list of objects with an 'id' property, generate a dictionary of audio features for each one
async function getAudioFeatures(tracks) {
  let features = {};
  for (let track of tracks) {
    const id = 'id' in track ? track.id : track.track_id;
    await spotify.getAudioFeaturesForTrack(id)
      .then(function (data) {
        features[id] = data.body;
        features[id].name = track.name;
      });
  }
  return features;
}

function getClusterFeatures(data) {
  let features = [];
  for (const song of data) {
    let songFeatures = [];
    for (const featureName of clusterFeatures) {
      songFeatures.push(song[featureName]);
    }
    features.push(songFeatures);
  }
  return features;
}

// Skip the song and use user feedback to adjust cluster centers
async function skipSong(songId, feedback) {
  let features = targetCluster.centroid;
  if (songId in songs) {
    songs[songId].played = 1;
    features = getClusterFeatures([songs[songId]])[0];
  }
  console.log("Skipping song: " + songId + ", Feedback: " + feedback);
  adjustClusterCenter(skipSongClusterCentersWeights[feedback], features);
  await updateQueue(true);
}

// Song finished playing
async function finishSong(songId, liked) {
  let features = targetCluster.centroid;
  if (songId in songs) {
    songs[songId].played = 1;
    features = getClusterFeatures([songs[songId]])[0];
  }
  let weight = finishSongClusterCentersWeight;
  if (liked) {
    console.log("User liked song: " + songId);
    weight = likeSongClusterCentersWeight;
  }
  adjustClusterCenter(weight, features);
  await updateQueue(false);
}

// Randomly selects n elements that are in the target cluster for the queue
async function updateQueue(reset) {
  // remove first element of queue
  queue.shift();

  //find candidate songs
  let candidates = [];
  const predClusters = await determineClusters(getClusterFeatures(Object.values(songs)), threshold);
  for (let i = 0; i < predClusters.length; i++) {
    const key = keys[i];
    songs[key].cluster = predClusters[i];
    songs[key].seed_song = false;
    if (songs[key].cluster == targetCluster.idx && songs[key].played == 0)
      candidates.push(songs[key]);
  }

  // prevent overflow but don't remove seed songs
  let first = queue.findIndex(song => song.seed_song === false);
  if (reset) {
    if (first == -1)
      first = seedSongs.length - 1;
    queue = queue.slice(0, first);
  }

  // select songs from db
  queue = [...queue, ...candidates.sort(() => Math.random() - Math.random()).slice(0, queueSize - queue.length)];
  const preferences = [];
  let totalPreferences = {};
  queue.forEach((song) => {
    audioFeatures.forEach((featureName) => {
      if (!(featureName in totalPreferences)) totalPreferences[featureName] = []
      totalPreferences[featureName].push(song[featureName.toLowerCase()]);
    });
  });
  for (const [name, values] of Object.entries(totalPreferences)) {
    preferences.push({ name: name, value: values.reduce((a, b) => a + b) / values.length })
  }

  parentPort.postMessage({ type: 'queue', data: queue });
  parentPort.postMessage({ type: 'preferences', data: preferences });
  parentPort.postMessage({ type: 'status', data: 1 });
}

// determine which cluster a song is part of
async function determineClusters(data, t) {
  const task = new Promise((resolve, reject) => {
    var process = spawn('python', [clusteringPyPath, 'predict', JSON.stringify(clusters.centroids), t]);
    process.stdin.write(JSON.stringify(data) + '\n');
    process.stdout.on('data', function (data) {
      let lines = data.toString().split("\n");
      for (let s of lines) {
        if (s.startsWith("Result: ") === true) {
          s = s.replace("Result: ", "");
          resolve(JSON.parse(s));
        } else {
          console.log(s);
        }
      }
    });
    process.stderr.on('data', function (data) {
      console.error(data.toString());
      reject(data.toString());
    });
  });
  return task;
}

// Load the csv database as a JSON object
async function loadDatabase() {
  const task = new Promise((resolve, reject) => {
    let rows = {};
    fs.createReadStream('data/spotify_songs.csv')
      .pipe(csv())
      .on('data', (data) => {
        for (key in data) {
          if (!(["track_artist", "track_name", "track_id"].includes(key))) {
            const parsed = parseFloat(data[key]);
            if (!isNaN(parsed))
              data[key] = parsed;
          }
        }
        data.cluster = -1;
        data.played = 0;
        rows[data.track_id] = data;
      })
      .on('end', () => {
        resolve(rows);
      });
  });
  return task;
}

function mode(clusterList) {
  return clusterList.sort((a, b) =>
    clusterList.filter(v => v.idx === a).length
    - clusterList.filter(v => v.idx === b).length
  ).pop();
}