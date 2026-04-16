const express = require('express');
const router = express.Router();
const { register, login } = require('../modules/auth/controller/AuthController.js');

router.post('/register', register);
router.post('/login', login);

module.exports = router;