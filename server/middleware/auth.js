const jwt = require("jsonwebtoken");
const connection = require("../config/db");

exports.verifyToken = async (req, res, next) => {
  try {
    // Get the token from Authorization header
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Authorization token missing or invalid",
        });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    // console.log(token)
    // Fetch token from DB (optional check for logout/invalidation)
    const [rows] = await connection.query(
      "SELECT * FROM users WHERE user_token = ?",
      [token]
    );

    // if (rows.length === 0) {
    //   return res.status(401).json({ success: false, message: "Invalid token" });
    // }

    // Verify token and check expiration
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log(err);
        if (err.name === "TokenExpiredError") {
          return res
            .status(403)
            .json({ success: false, message: "Token expired" });
        }
        return res
          .status(403)
          .json({ success: false, message: "Token verification failed" });
      }

      req.user = decoded;
      next();
    });
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// middleware/bypass.js

// Bypass authenticateToken
exports.authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Authorization token missing or invalid",
        });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // Check if token exists in DB
    const [rows] = await connection.query(
      "SELECT * FROM users WHERE user_token = ?",
      [token]
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token (not found in DB)" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error("JWT Verify Error:", err);

        if (err.name === "TokenExpiredError") {
          return res
            .status(403)
            .json({ success: false, message: "Token expired" });
        }

        return res
          .status(403)
          .json({ success: false, message: "Token verification failed" });
      }

      // Attach structured user info to req.user
      req.user = {
        id: decoded.user_id, // id field (same as user_id)
        user_id: decoded.user_id, // user_id from decoded token
        username: decoded.username, // username from token
        roleid: decoded.roleid, // role id from token
        iat: decoded.iat, // issued at timestamp
      };

      next();
    });
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// Bypass requireRole
exports.requireRole = (roles = []) => {
  return (req, res, next) => {
    // Seedha allow kar do
    next();
  };
};
