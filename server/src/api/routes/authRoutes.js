const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public Routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected Routes
router.get('/me', authMiddleware, AuthController.getMe);

module.exports = router;
