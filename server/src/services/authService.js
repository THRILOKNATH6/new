const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserRepo = require('../repositories/userRepo');
const { AppError } = require('../utils/errorHandler'); // We will create this utility

class AuthService {
    async register(data) {
        // 1. Check if user exists
        const existingUser = await UserRepo.findByUsername(data.username);
        if (existingUser) {
            throw new Error('Username already taken'); // In prod, use custom ApplicationError
        }

        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(data.password, salt);

        // 3. Save to DB
        // 3. Save to DB
        try {
            const newUser = await UserRepo.create({
                username: data.username,
                passwordHash,
                employeeId: data.employeeId,
            });

            return {
                user: {
                    id: newUser.user_id,
                    username: newUser.username
                }
            };
        } catch (err) {
            if (err.code === '23503') { // Foreign key constraint violation
                throw new Error('Invalid Employee ID provided');
            }
            if (err.code === '23505') { // Unique constraint violation
                // Postgres usually provides the constraint name in err.constraint
                if (err.constraint === 'app_users_employee_id_key') {
                    throw new Error('Employee ID already registered');
                }
                throw new Error('Username already taken');
            }
            throw err;
        }
    }

    async login(username, password) {
        // 1. Find user
        const user = await UserRepo.findByUsername(username);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        if (!user.is_active) {
            throw new Error('Account is disabled');
        }

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        // 3. Generate Token
        const payload = {
            userId: user.user_id,
            username: user.username,
            role: user.designation_name || 'User',
            employeeId: user.employee_id,
            permissions: user.permissions || []
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        return { token, user: payload };
    }
}

module.exports = new AuthService();
