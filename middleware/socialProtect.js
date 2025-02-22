const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");


module.exports = function (req, res, next) {
  const authHeader = req.cookies?.social;
  //   Check header
  if (!authHeader)
    // return next();
    return res.status(401).json({
      data: "",
      message: "Authorization header missing",
      success: false,
    });
  const token = authHeader;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      data: "",
      message: "Invalid token",
      success: false,
    });
  }
};
