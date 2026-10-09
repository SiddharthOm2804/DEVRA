import User from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";

/**
 * Protect routes - Verifies JWT Bearer token and attaches user to request
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Authentication token is missing."
    });
  }

  try {
    const decoded = verifyToken(token);

    // Fetch user without password
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User associated with this token no longer exists."
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired. Please log in again."
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid authentication token."
    });
  }
};
