// Library for handling JSON Web Tokens (JWT)
const jwt = require('jsonwebtoken');

// Middleware function to verify the JWT token
const verifyToken = (req, res, next) => {
    // Retrieving the token from cookies
    const token = req.cookies.token;

    if (!token) {
        console.log('Authentication failed: Token not provided.');
        return res.redirect('/auth/login'); 
    }

    try {
        // Verifying the token using the secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach the decoded payload (user information) to the request object
        req.user = decoded;

        // Proceed to the next middleware or route handler
        next(); 
    } catch (err) {
        res.redirect('/auth/login'); 
    }
};


module.exports = verifyToken;
