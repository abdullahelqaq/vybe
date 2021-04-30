const { parentPort, workerData } = require('worker_threads');
const sqlite3 = require('sqlite3').verbose();

const userSongs = workerData;
console.log("User songs: ");
console.log(userSongs);

// determine genre
function mode(arr){
  return arr.sort((a,b) =>
        arr.filter(v => v===a).length
      - arr.filter(v => v===b).length
  ).pop();
}
const genres = userSongs.songs.map(item => item.genre);
const selectGenre = mode(genres);

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