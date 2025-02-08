// Middleware function to restrict access based on user roles
const allowRoles = (...roles) => {
    return (req, res, next) => {
        // Retrieve the user object from the request
        const user = req.user;

        // Check if the user exists and their role is included in the allowed roles
        if (!user || !roles.includes(user.role)) {
            console.log(`Access denied: User role "${user?.role}" not allowed`);
            return res.status(403).render('error', { message: 'Access Denied: You do not have permission to access this page.' });
        }

        // If the user has a valid role proceed
        next();
    };
};

module.exports = allowRoles;
