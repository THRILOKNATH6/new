const EmployeeRepo = require('../repositories/employeeRepo');
const UserRepo = require('../repositories/userRepo');

class ProfileService {
    async getProfile(userId) {
        // 1. Get User/Employee Link
        const user = await UserRepo.findById(userId);
        if (!user) throw new Error('User not found');

        if (!user.employee_id) {
            return {
                user_id: user.user_id,
                username: user.username,
                is_active: user.is_active,
                profile_complete: false,
                message: "No linked employee record found."
            };
        }

        // 2. Get Employee Details
        const employee = await EmployeeRepo.findById(user.employee_id);

        return {
            ...employee,
            user_id: user.user_id,
            username: user.username,
            profile_complete: true
        };
    }

    async updateProfile(userId, updateData) {
        // 1. Resolve Employee ID
        const user = await UserRepo.findById(userId);
        if (!user || !user.employee_id) throw new Error('No employee record to update');

        // 2. Whitelist Data (Extra safety)
        const safeData = {
            name: updateData.name,
            address: updateData.address
        };

        // 3. Update
        return await EmployeeRepo.updateProfile(user.employee_id, safeData);
    }

    async updateAvatar(userId, filePath) {
        const user = await UserRepo.findById(userId);
        if (!user || !user.employee_id) throw new Error('No employee record to update');

        // Normalize path for frontend (remove 'public' or absolute parts if needed)
        // Here we assume serving from /uploads static route or similar
        const relativePath = `/uploads/avatars/${filePath}`;

        return await EmployeeRepo.updateAvatar(user.employee_id, relativePath);
    }
}

module.exports = new ProfileService();
