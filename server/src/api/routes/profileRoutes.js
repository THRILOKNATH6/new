const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// All profile routes require auth
router.use(authMiddleware);

router.get('/', ProfileController.getMyProfile);
router.put('/', ProfileController.updateMyProfile);
router.post('/avatar', upload.single('avatar'), ProfileController.updateAvatar);

module.exports = router;
