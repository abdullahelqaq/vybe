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

// POST /addSong
// Endpoint called when the user manually adds a new song to their queue
// Request body must contain the session id and song IDs
router.post('/addSong', (req, res) => {
  const id = req.query.id;
  if (id in userSessions)
    userSessions[id].addSong(req.body.song);
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
  const liked = req.query.liked;
  if (id in userSessions)
    userSessions[id].finishSong(songId, liked);
});

// GET /updates
// Endpoint to create Server-side Events stream to retrieve queue and 
// preferences updates
router.get('/updates', (req, res) => {
  const id = req.query.id;
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  res.writeHead(200, headers);

  if (!(id in userSessions)) {
    delete userSessions[id];
    res.end();
    return;
  }

  userSessions[id].sse = res;

  req.on('close', () => {
    console.log(`Connection closed`);
    delete userSessions[id];
  });
})


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
