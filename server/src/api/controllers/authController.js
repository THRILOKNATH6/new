const Joi = require('joi');
const AuthService = require('../../services/authService');

// Validator Schemas
const registerSchema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    password: Joi.string().min(6).required(),
    employeeId: Joi.string().required()
});

const loginSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
});

class AuthController {
    async register(req, res, next) {
        try {
            // 1. Validate Input
            const { error, value } = registerSchema.validate(req.body);
            if (error) {
                console.error("Validation Error:", error.details[0].message);
                return res.status(400).json({ message: error.details[0].message });
            }

            // 2. Call Service
            const result = await AuthService.register(value);

            // 3. Send Response
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            console.error("Registration Error:", err.message);
            // Basic Error handling
            res.status(400).json({ success: false, message: err.message });
        }
    }

    async login(req, res, next) {
        try {
            // 1. Validate Input
            const { error, value } = loginSchema.validate(req.body);
            if (error) return res.status(400).json({ message: error.details[0].message });

            // 2. Call Service
            const result = await AuthService.login(value.username, value.password);

            // 3. Send Response
            res.status(200).json({ success: true, data: result });
        } catch (err) {
            res.status(401).json({ success: false, message: err.message });
        }
    }

    async getMe(req, res) {
        // Protected route test
        res.json({ success: true, user: req.user });
    }
}

module.exports = new AuthController();
