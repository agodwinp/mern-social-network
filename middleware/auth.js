const jwt = require('jsonwebtoken');
const config = require('config');

// a middleware function is a function that has access to the request
// and response cycle. 'next' is a callback that we have to run once
// we're done so that it moves onto the next piece of middleware

module.exports = function(req, res, next) {
    // get token from header
    const token = req.header('x-auth-token');

    // check if no token
    if (!token) {
        return res.status(401).json({ msg: "No token, authorisation denied" })
    }

    // verify token
    try {
        const decoded = jwt.verify(token, config.get('jwtSecret'));
        req.user = decoded.user;
        next();
    } catch(err) {
        res.status(401).json({ msg: "Token is not valid" });
    }
}