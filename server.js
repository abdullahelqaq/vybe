const path = require('path');
const express = require("express");
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Session = require('./session');

const app = express();
const router = express.Router();
const port = process.env.PORT || 3000;
let userSessions = {};

app.use(cors());
app.use(express.static(path.resolve(__dirname, './client/build')));
app.use('/', router);

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, './client/build', 'index.html'));
});

router.get('/test', () => console.log("Test API endpoint"));
router.get('/authorized', (req, res) => {
  token = req.query.code;
  id = uuidv4();
  console.log("User authorized: Session ID: " + id + ", access token: " + token);
  userSessions[id] = new Session(id, token);
  res.redirect(`/?id=${id}&token=${token}`);
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
