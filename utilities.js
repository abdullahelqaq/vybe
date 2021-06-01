// Spotify Web API interfaces and communication

const SpotifyWebApi = require('spotify-web-api-node');
const spawn = require("child_process").spawn;

class SpotifyWrapper {
  constructor(accessToken) {
    this.spotify = new SpotifyWebApi();
    this.spotify.setAccessToken(accessToken);
  }

  // Retrieve the user's top tracks (limit of 50 tracks)
  async retrieveUserTopTracks() {
    let topTracks = await this.spotify.getMyTopTracks();
    const features = await this.getAudioFeatures(topTracks.body.items);
    return features;
  }

  // Extract genres for each artist and store counts
  async retrieveTrackGenres(tracks) {
    let genres = {};
    for (let track of tracks) {
      const trackMetadata = await this.spotify.getTrack(track.track_id);
      for (const artist of trackMetadata.body.artists) {
        const trackGenres = await this.spotify.getArtist(artist.id);
        track.genres = trackGenres.body.genres;
        trackGenres.body.genres.forEach((genre) => {
          genres[genre] = (genres[genre] || 0) + 1;
        });
      }
    }
    return genres;
  }

  // Given a list of objects with an 'id' property, generate a dictionary of audio features and genre for each one
  async getAudioFeatures(tracks) {
    let features = {};
    for (let track of tracks) {
      const id = 'id' in track ? track.id : track.track_id;
      await this.spotify.getAudioFeaturesForTrack(id)
        .then(function (data) {
          features[id] = data.body;
          features[id].name = track.name;
        });
    }
    return features;
  }
}

class ClusteringWrapper {
  constructor(clusterFeatures, path) {
    this.clusterFeatures = clusterFeatures;
    this.path = path;
  }

  // Perform clustering by communicating with python module
  async cluster(data) {
    const task = new Promise((resolve, reject) => {
      var process = spawn('py -3', [this.path, 'cluster']);
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

  // determine which cluster the songs belong to
  async determineClusters(raw, centroids, t) {
    const data = this.getClusterFeatures(raw);
    const task = new Promise((resolve, reject) => {
      var process = spawn('py -3', [this.path, 'predict', JSON.stringify(centroids), t]);
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

  // Using predefined feature names for clustering, extract the features for the given songs
  getClusterFeatures(data) {
    let features = [];
    for (const song of data) {
      let songFeatures = [];
      for (const featureName of this.clusterFeatures) {
        songFeatures.push(song[featureName]);
      }
      features.push(songFeatures);
    }
    return features;
  }
}

module.exports = {
  Spotify: SpotifyWrapper, 
  Clustering: ClusteringWrapper
};