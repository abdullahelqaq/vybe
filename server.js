const path = require('path');
const express = require("express");
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Session = require('./session');

// global variables for session hosting/routing
const app = express();
const router = express.Router();
let userSessions = {};

// express configuration
app.use(cors());
app.use(express.json());
app.use('/', router);
app.use(express.static(path.resolve(__dirname, './client/build')));


// routes

// GET /
// Default initial endpoint, redirect to login
router.get('/', (req, res) => {
  res.redirect(`/login`);
});

// GET /
// Endpoint to request user login
router.get('/login', (req, res) => {
  res.sendFile(path.resolve(__dirname, './client/build', 'index.html'));
});

// GET /authorized
// Endpoint called when Spotify authorization completes on client side
router.get('/authorized', async (req, res) => {
  code = req.query.code;
  id = uuidv4();
  userSessions[id] = new Session(id);
  console.log(`User authorized - Session id: ${id}`);
  await userSessions[id].authenticate(code);
  const token = userSessions[id].accessToken;
  res.redirect(`/dashboard?id=${id}&token=${token}`);
});

// GET /dashboard
// Endpoint called when user is authenticated and ready to display dashboard
// If server has been refreshed (and id doesn't exist), redirect to login
router.get('/dashboard', async (req, res) => {
  const id = req.query.id;
  if (!(id in userSessions)) {
    res.redirect('/login');
    return;
  }
  res.sendFile(path.resolve(__dirname, './client/build', 'index.html'));
});

// POST /setSeedSongs
// Endpoint called when the user manually adds three new songs to their queue
// Request body must contain the session id and list of song IDs
router.post('/setSeedSongs', (req, res) => {
  const id = req.query.id;
  if (id in userSessions)
    userSessions[id].setSeedSongs(req.body.songs);
});

// POST /skip
// Endpoint called when the user skips a song in their queue
// Request must contain the session id and song ID
router.post('/skip', (req, res) => {
  const id = req.query.id;
  const songId = req.body.id;
  const feedback = req.body.feedback;
  if (id in userSessions)
    userSessions[id].skipSong(songId, feedback);
});

// POST /finish
// Endpoint called when the song finishes playing
router.post('/finish', (req, res) => {
  const id = req.query.id;
  const songId = req.query.id;
  if (id in userSessions)
    userSessions[id].finishSong(songId);
});


// GET /status
// Endpoint called when user checks for generated queue clustering status
// Request query must contain the session id
// Response body contains status code 0 (working) or 1 (completed)
router.get('/status', (req, res) => {
  const id = req.query.id;
  if (id in userSessions)
    res.body = JSON.stringify({ status: userSessions[id].status });
});

// GET /queue
// Endpoint called when user requests to receive the generated queue
// Request query must contain the session id
// Response body contains list of song IDs
router.get('/queue', (req, res) => {
  const id = req.query.id;
  if (id in userSessions) {
    res.body = JSON.stringify({ queue: userSessions[id].queue });
    userSessions[id].status = 0;
  }
});

// GET /preferences
// Endpoint called when user requests to receive the current features for the cluster center
// Request query must contain the session id
// Response body contains preferences
router.get('/preferences', (req, res) => {
  const id = req.query.id;
  res.body = JSON.stringify({ preferences: userSessions[id].preferences });
  if (id in userSessions)
    userSessions[id].status = 0;
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
