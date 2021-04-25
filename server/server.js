const path = require('path');
const express = require("express");
const api = require('./routes/routes');

const port = process.env.PORT || 3000;

const app = express();

app.use(express.static(path.resolve(__dirname, 'client/build')));
app.use('/', api);

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'client/build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
