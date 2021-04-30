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
app.use(express.static(path.resolve(__dirname, './client/build')));
app.use('/', router);


// routes

// GET /
// Default initial endpoint
router.get('/', (req, res) => {
  console.log("New user");
  res.sendFile(path.resolve(__dirname, './client/build', 'index.html'));
});

// GET /authorized
// Endpoint called when Spotify authorization completes on client side
router.get('/authorized', (req, res) => {
  token = req.query.code;
  id = uuidv4();
  console.log("User authorized: Session ID: " + id + ", access token: " + token);
  userSessions[id] = new Session(id, token);
  res.redirect(`/?id=${id}&token=${token}`);
});

// POST /setSongs
// Endpoint called when the user manually adds three new songs to their queue
// Request body must contain the session id and list of song IDs
router.post('/setSongs', (req, res) => {
  const id = req.body.id;
  userSessions[id].setSongs(req.body.songs);
  console.log("setSongs");
});

// POST /skip
// Endpoint called when the user skips a song in their queue
// Request body must contain the session id and song ID
router.post('/skip', (req, res) => {
  const id = req.body.id;
  console.log("skip");
});

// GET /status
// Endpoint called when user checks for generated queue clustering status
// Request body must contain the session id
// Response body contains status code 0 (working) or 1 (completed)
router.get('/status', (req, res) => {
  const id = req.body.id;
  console.log("status");
});

// GET /queue
// Endpoint called when user requests to receive the generated queue
// Request body must contain the session id
// Response body contains list of song IDs
router.get('/queue', (req, res) => {
  const id = req.body.id;
  console.log("queue");
});




const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
