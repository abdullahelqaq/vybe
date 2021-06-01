// dataset from https://github.com/rfordatascience/tidytuesday/tree/master/data/2020/2020-01-21

const { parentPort } = require('worker_threads');
const csv = require('csv-parser');
const fs = require('fs');

const { Spotify, Clustering } = require('./utilities.js')

const numSeedSongs = 3;
const clusteringPyPath = './clustering/cluster.py';
const threshold = 0.2;
const queueSize = 10;
const audioFeatures = ['Valence', 'Energy', 'Danceability', 'Acousticness', 'Loudness', 'Instrumentalness', 'Liveness', 'Speechiness', 'Tempo'];

// which features to use when clustering
const clusterFeatures = ['valence', 'energy', 'danceability']; //'acousticness', 'tempo'

const skipSongClusterCentersWeights = [-0.1, -0.25, -0.5];
const likeSongClusterCentersWeight = 0.3;
const finishSongClusterCentersWeight = 0.15;

const allowExplicit = false;
let suggestionMode = 'cluster'; // 'cluster' or 'genre'

let songs, genreScores, topTracks, keys, queue = [];
let clusters, targetCluster;

let spotify, clustering;
let taskQueue = [];
let taskRunning = false;

// receive messages from main thread
parentPort.on("message", function (msg) {
  switch (msg.type) {
    case 'tokens':
      taskQueue.push([initialize, [msg.data.accessToken]]);
      break;
    case 'song':
      taskQueue.push([addSong, [msg.data]]);
      break;
    case 'skip':
      taskQueue.push([skipSong, [msg.data.id, msg.data.feedback]]);
      break;
    case 'finish':
      taskQueue.push([finishSong, [msg.data.id, msg.data.liked]]);
      break;
    case 'mode':
      taskQueue.push([setSuggestionMode, [msg.data.mode]]);
      break;
  }
});

async function addSong(song) {
  const songsFeatures = await spotify.getAudioFeatures([song]);
  const songId = song.track_id;
  songsFeatures[songId].track_name = song.track_name;
  songsFeatures[songId].track_artist = song.track_artist;
  songsFeatures[songId].track_id = song.track_id;
  songsFeatures[songId].user_song = true;

  queue.push(songsFeatures[songId]);

  if (queue.length == numSeedSongs) {
    await setSeedSongs([...queue]);
  }
}

// Retrieve user's top songs and normalize all data (top songs and database)
//
// This is only done once per session at the beginning
async function initialize(accessToken) {
  spotify = new Spotify(accessToken);
  clustering = new Clustering(clusterFeatures, clusteringPyPath);
  // load song database
  let dbSongs = await loadDatabase();
  // retrieve user's top 50 tracks with corresponding audio features
  let tracks = await spotify.retrieveUserTopTracks();

  //normalize the data
  [songs, topTracks] = normalizeData(dbSongs, tracks);
  keys = Object.keys(songs);
}

// Apply k-means clustering and use the seed songs to identify the target 
// cluster for song suggestions
//
// This is only done once per session at the beginning
async function setSeedSongs(seedSongs) {
  // perform clustering
  const features = clustering.getClusterFeatures(Object.values(topTracks));
  clusters = await clustering.cluster(features)

  // retrieve genres for seed songs and assign scores to the song database
  genreScores = await spotify.retrieveTrackGenres(seedSongs);
  for (let [id, song] of Object.entries(songs)) {
    song.genre_score = Math.max(genreScores[song.playlist_genre] || 0, genreScores[song.playlist_subgenre] || 0);
  }
  console.log("Genre scores:");
  console.log(genreScores);
  // sort by genre score
  songs = Object.fromEntries(Object.entries(songs).sort((a, b) => b[1].genre_score - a[1].genre_score));

  // determine target cluster
  const seedSongsFeatures = await spotify.getAudioFeatures(seedSongs);
  // add seed songs (except first one because its currently playing) to queue
  for (let i = 0; i < seedSongs.length; i++) {
    const songId = seedSongs[i].track_id;
    seedSongsFeatures[songId].track_name = seedSongs[i].track_name;
    seedSongsFeatures[songId].track_artist = seedSongs[i].track_artist;
    seedSongsFeatures[songId].track_id = seedSongs[i].track_id;
    seedSongsFeatures[songId].user_song = true;
  }
  queue = [...Object.values(seedSongsFeatures)];
  const seedClusters = await clustering.determineClusters(Object.values(seedSongsFeatures), clusters.centroids, 1);

  console.log(seedClusters);
  targetCluster = clusters.centroids[mode(seedClusters)];
  console.log('Target Cluster');
  console.log(targetCluster);

  await updateQueue(false, true);
}

async function setSuggestionMode(mode) {
  suggestionMode = mode;
  await updateQueue(false, true);
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

// Normalize all features between 0 and 1 and assign genre score to each song
// 
// Features such as tempo were much larger compared to analytical features like danceability and valence
// causing clusters to be skewed 
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

  // normalize data using calculated min/max
  for (let [id, song] of Object.entries(db)) {
    for (const featureName of clusterFeatures) {
      const [min, max] = minmax[featureName];
      const val = song[featureName];
      const delta = max - min;
      song[featureName] = delta == 0 ? 1 : (val - min) / delta;
      song.user_song = false;
    }
  }

  for (let [id, song] of Object.entries(tracks)) {
    for (const featureName of clusterFeatures) {
      const [min, max] = minmax[featureName];
      const val = song[featureName];
      const delta = max - min;
      song[featureName] = delta == 0 ? 1 : (val - min) / delta;
    }
  }

  return [db, tracks];
}

// Adjust the target cluster center using a specified weight
async function adjustClusterCenter(weight, features) {
  if (suggestionMode == 'cluster') {
    const newCentroid = features.map((x, i) => targetCluster.centroid[i] + ((targetCluster.centroid[i] - x) * weight));
    // clamp value
    targetCluster.centroid = newCentroid.map(x => Math.min(Math.max(x, 0), 1));
    clusters[targetCluster.idx] = targetCluster;
  }
}

// Randomly selects n elements that are in the target cluster for the queue
// and send updated queue and preferences to the main thread
async function updateQueue(shift, reset) {
  // remove first element of queue
  if (shift)
    queue.shift();

  //find candidate songs
  let candidates = [];
  if (suggestionMode == 'cluster') {
    // find songs in target cluster
    const predClusters = await clustering.determineClusters(Object.values(songs), clusters.centroids, threshold);
    for (let i = 0; i < predClusters.length; i++) {
      const key = keys[i];
      songs[key].cluster = predClusters[i];
      console.log(songs[key]);
      if (songs[key].cluster == targetCluster.idx && songs[key].played == 0)
        if (allowExplicit || songs[key].explicit == 'False')
          candidates.push(songs[key]);
    }
  }
  else if (suggestionMode == 'genre') {
    // find first 100 unplayed songs (songs sorted by genre score)
    let i = 0;
    while (candidates.length < 100) {
      const key = keys[i];
      if (songs[key].played == 0)
        if (allowExplicit || songs[key].explicit == 'False')
            candidates.push(songs[key]);
      i++;
    }
  }

  // select songs from db
  if (reset) {
    for (let i = 1; i < queueSize; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      if (i < queue.length) {
        if (!queue[i].user_song)
          queue[i] = candidates[idx];
      } else {
        queue.push(candidates[idx]);
      }
      candidates.splice(idx, 1);
    }
  } else {
    if (queue.length != queueSize)
      queue.push(candidates[Math.floor(Math.random() * candidates.length)]);
  }

  // recalculate preferences
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

  // relay to main thread
  parentPort.postMessage({ type: 'update', data: {'queue': queue, 'preferences': preferences} });
}

// Skip the song and use user feedback to adjust cluster centers
async function skipSong(songId, feedback) {
  let features = targetCluster.centroid;
  if (songId in songs) {
    songs[songId].played = 1;
    features = clustering.getClusterFeatures([songs[songId]])[0];
  }
  console.log("Skipping song: " + songId + ", Feedback: " + feedback);
  adjustClusterCenter(skipSongClusterCentersWeights[feedback], features);
  await updateQueue(true, true);
}

// Song finished playing
async function finishSong(songId, liked) {
  let features = targetCluster.centroid;
  if (songId in songs) {
    songs[songId].played = 1;
    features = clustering.getClusterFeatures([songs[songId]])[0];
  }
  let weight = finishSongClusterCentersWeight;
  if (liked) {
    console.log("User liked this song");
    weight = likeSongClusterCentersWeight;
  }
  console.log("Finish song " + songId);
  adjustClusterCenter(weight, features);
  await updateQueue(true, false);
}

// helper function to find most common element in array
function mode(clusterList) {
  return clusterList.sort((a, b) =>
    clusterList.filter(v => v.idx === a).length
    - clusterList.filter(v => v.idx === b).length
  ).pop();
}

setInterval(async () => {
  if (!taskRunning && taskQueue.length > 0) {
    taskRunning = true;
    const [task, args] = taskQueue[0];
    taskQueue.shift();
    await task(...args);
    taskRunning = false;
  }
}, 500);