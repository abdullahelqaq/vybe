const path = require('path');
const express = require('express');
const router = express.Router();

router.get('/test', () => console.log("Test API endpoint"));
router.get('/authorized', (req, res) => {
    console.log("Spotify access token: " + req.query.code);
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
});

module.exports = router;