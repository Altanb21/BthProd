const jwt = require("jsonwebtoken");
const config = require('../config');

const authenticateJWT = (req, res, next) => {

    const authHeader = req.headers.authorization;
    const accessTokenSecret = config.JWT_SECRET;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, accessTokenSecret, (err, user) => {
            if (err) {
                return res.json({ ok: false, text: 'JWT Error' });
            }

            req.user = user;
            next();
        });
    } else {
        res.json({ ok: false, text: 'Token not found' });
    }
};

module.exports = authenticateJWT;