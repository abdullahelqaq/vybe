const express = require('express');
const router = express.Router();

router.get('/test', () => console.log("Test API endpoint"));

module.exports = router;