const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, CLIENT_ID, DEVELOPMENT, FRONTEND_URL, FRONTEND_URL_1 } = require("../config/env");
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

module.exports.hashedPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);
  return hashed;
};
module.exports.comparePassword = async (password, dbPassword) => {
  return await bcrypt.compare(password, dbPassword);
};
module.exports.createToken = (user) => {
  // Destructure _raw and _json from user, and keep the rest of the user properties
  const { _raw, _json, ...restOfUser } = user;

  // Check if provider is twitter, and if so, remove the status property from _json
  let sanitizedJson = _json;
  if (user.provider === 'twitter' && _json && _json.status) {
    const { status, ...restOfJson } = _json;
    sanitizedJson = restOfJson;
  }

  // Combine the rest of user properties with the sanitized _json
  const sanitizedUser = {
    ...restOfUser,
    _json: sanitizedJson,
  };

  return jwt.sign(sanitizedUser, JWT_SECRET, {
    expiresIn: '7d',
  });
};

module.exports.googleVerify = async (token) => {
  const client = new OAuth2Client(CLIENT_ID);
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
    });
    const payload = ticket.getPayload();
    // const userid = payload['sub'];
    //// console.log(payload)
    return payload
  } catch (error) {
    //// console.log(error)
  }
};

module.exports.cookieConfiguration = () => {
  if (DEVELOPMENT === true) {
    return { httpOnly: true, expiry, expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
  } else {
    return { httpOnly: true, sameSite: 'none', secure: true, expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
  }
}
