const ProfileService = require('../../services/profileService');

class ProfileController {
    async getMyProfile(req, res) {
        try {
            const data = await ProfileService.getProfile(req.user.userId);
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async updateMyProfile(req, res) {
        try {
            const data = await ProfileService.updateProfile(req.user.userId, req.body);
            res.json({ success: true, data });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async updateAvatar(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }
            // req.file.filename is the saved name in uploads/avatars/
            const data = await ProfileService.updateAvatar(req.user.userId, req.file.filename);
            res.json({ success: true, data });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
}

module.exports = new ProfileController();
