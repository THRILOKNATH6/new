const requirePermission = (permissionCode) => {
    return (req, res, next) => {
        // req.user is populated by authMiddleware
        // permissions are populated in the JWT payload from authService
        const userPermissions = req.user.permissions || [];

        if (!userPermissions.includes(permissionCode) && !userPermissions.includes('SYSTEM_ADMIN')) {
            return res.status(403).json({
                success: false,
                message: `Access Denied. Requires permission: ${permissionCode}`
            });
        }
        next();
    };
};

module.exports = requirePermission;
