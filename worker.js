const { parentPort } = require('worker_threads');
const SpotifyWebApi = require('spotify-web-api-node');
const skmeans = require("skmeans");
const csv = require('csv-parser')
const fs = require('fs')

const k = 4;
const threshold = 0.1;
const queueSize = 10;
const topSongsPlaylistYears = ['2020']
const audioFeatures = ['Valence', 'Energy', 'Danceability', 'Acousticness', 'Loudness', 'Instrumentalness', 'Liveness', 'Speechiness'];

const skipSongClusterCentersWeights = [-0.01, -0.025, -0.05];
const likeSongClusterCentersWeight = 0.03;
const finishSongClusterCentersWeight = 0.015;

let songs, queue = [];
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
    case 'like':
      likeSong(msg.data.id);
      break;
    case 'skip':
      skipSong(msg.data.id, msg.data.feedback);
      break;
    case 'finish':
      finishSong(msg.data.id);
      break;
  }
});

// Retrieve top tracks for the user and apply k-means clustering
// Then use the seed songs to identify the target cluster for song suggestions
//
// This is only done once per session at the beginning
async function processTracks() {
  songs = await loadDatabase();
  const tracks = await retrieveUserTopTracks();

  // perform clustering
  let vectors = [];
  for (const [id, data] of Object.entries(tracks)) {
    vectors.push(getClusterFeatures(data));
  }
  clusters = skmeans(vectors, k, 'kmpp');
  console.log(clusters);

  // determine target cluster
  const seedSongsFeatures = await getAudioFeatures(seedSongs);
  // add seed songs (except first one because its currently playing) to queue
  for (let i = 1; i < seedSongs.length; i++) {
    const songId = seedSongs[i].id;
    seedSongsFeatures[songId].track_id = seedSongs[i].id;
    seedSongsFeatures[songId].track_name = seedSongs[i].track_name;
    seedSongsFeatures[songId].artist_name = seedSongs[i].artist_name;
  }
  queue = [...Object.values(seedSongsFeatures)];
  const seedClusters = []
  for (const [id, data] of Object.entries(seedSongsFeatures)) {
    testedCluster = clusters.test(getClusterFeatures(data));
    seedClusters.push(testedCluster);
  }
  targetCluster = mode(seedClusters);
  console.log('Target Cluster');
  console.log(targetCluster);

  updateQueue(queueSize - queue.length);
}

// Adjust the target cluster center using a specified weight
async function adjustClusterCenter(weight, features) {
  const offset = features.map(x => x * weight);
  // clamp value
  targetCluster.centroid = (targetCluster.centroid + offset).map(x => Math.min(Math.max(x, 0), 1));
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
  // // 'Your Top Songs' Playlist
  // const playlistTracks = await spotify.searchPlaylists('Your Top Songs')
  // .then(async function (data) {
  //   userPlaylistTracks = {};
  //   for (const playlist of data.body.playlists.items) {
  //     for (const year of topSongsPlaylistYears) {
  //       if (playlist.name.startsWith('Your Top Songs') && playlist.name.includes(year) && playlist.owner.id == 'spotify') {
  //         const tracks = await spotify.getPlaylist(playlist.id)
  //           .then(function (data) {
  //             const filteredTracks = [];
  //             for (const playlistTrack of data.body.tracks.items)
  //               filteredTracks.push(playlistTrack.track);
  //             return getAudioFeatures(filteredTracks);
  //           });

  //         userPlaylistTracks = { ...userPlaylistTracks, ...tracks };
  //       }
  //     }
  //   }
  //   return userPlaylistTracks;
  // });

  // return { ...topTracks, ...userPlaylistTracks };
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

function getClusterFeatures(data) {
  return [data.valence, data.energy, data.danceability];
}

// Skip the song and use user feedback to adjust cluster centers
async function skipSong(songId, feedback) {
  if (songId in songs)
    songs[songId].played = 1;
  console.log("Skipping song: " + songId + ", Feedback: " + feedback);
  adjustClusterCenter(skipSongClusterCentersWeights[feedback], getClusterFeatures(songs[songId]));
  updateQueue(1);
}

// Adjust cluster center
async function likeSong(songId) {
  console.log("User liked song: " + songId);
  adjustClusterCenter(likeSongClusterCentersWeight, getClusterFeatures(songs[songId]));
}

// Song finished playing
async function finishSong(songId) {
  if (songId in songs)
    songs[songId].played = 1;
  console.log("Finished playing song: " + songs[songId].track_name);
  updateQueue(1);
}

// Randomly selects n elements that are in the target cluster for the queue
function updateQueue(n) {
  //find candidate songs
  let candidates = [];
  Object.values(songs).forEach(song => {
    song.cluster = determineCluster(getClusterFeatures(song));
    if (song.cluster == targetCluster.idx && song.played == 0)
      candidates.push(song);
  });

  // prevent overflow
  if (queue.length == queueSize)
    queue.splice(0, n);

  // select songs from db
  queue = [...queue, ...candidates.sort(() => Math.random() - Math.random()).slice(0, n)];
  const preferences = [];
  let totalPreferences = {};
  queue.forEach((song) => {
    audioFeatures.forEach((featureName) => {
      if (!(featureName in totalPreferences)) totalPreferences[featureName] = []
      totalPreferences[featureName].push(song[featureName.toLowerCase()]);
    });
  });
  for (const [name, values] of Object.entries(totalPreferences)) {
    preferences.push({name: name, value: values.reduce((a, b) => a + b) / values.length})
  }

  console.log("Updated Queue: ");
  console.log(queue);
  console.log("Updated Preferences: ");
  console.log(preferences);

  parentPort.postMessage({ type: 'queue', data: queue });
  parentPort.postMessage({ type: 'preferences', data: preferences });
  parentPort.postMessage({ type: 'status', data: 1 });
}

// determine which cluster a song is part of
function determineCluster(features) {
  let distances = clusters.centroids.map(centroid => Math.sqrt((Math.pow(centroid[0] - features[0], 2)) + (Math.pow(centroid[1] - features[1], 2)) + (Math.pow(centroid[2] - features[2], 2))));
  const min = Math.min(...distances);
  if (min > threshold)
    return -1;
  return distances.indexOf(min);
}

// Load the csv database as a JSON object
async function loadDatabase() {
  const task = new Promise((resolve, reject) => {
    let rows = {};
    fs.createReadStream('data/SpotifySongs.csv')
      .pipe(csv())
      .on('data', (data) => {
        for (key in data) {
          const parsed = parseFloat(data[key]);
          if (!isNaN(parsed))
            data[key] = parsed;
        }
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