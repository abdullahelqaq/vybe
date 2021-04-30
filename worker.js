const { parentPort, workerData } = require('worker_threads');

const userSongs = workerData;

console.log("User songs: ");
console.log(userSongs);

dfd.read_csv('file://./data/SpotifyFeatures.csv')
  .then(df => {
    console.log(df.columns);
    console.log(df['genre'].head());
    console.log(df['track_name'].head());
    console.log(df[0].head());
    // let query_df = df.query({ column: 'genre', is: '==', to: 'Pop'});
    // query_df.head(20).print();
    // parentPort.postMessage(query_df.toString());
  })
  .catch(e => {
    console.error(e);
  });