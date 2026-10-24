import User from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";
import { ticketStore } from "../utils/ticketStore.js";

/**
 * Protect routes - Verifies JWT Bearer token or short-lived single-use ticket and attaches user to request
 */
export const protect = async (req, res, next) => {
  let token;
  let isFromTicket = false;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.query && req.query.ticket) {
    // F-009: Consume short-lived single-use ticket for SSE / URL-constrained clients atomically
    const ticketPayload = await ticketStore.consumeTicketAsync(req.query.ticket);
    if (ticketPayload && ticketPayload.token) {
      token = ticketPayload.token;
      isFromTicket = true;
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid, expired, or already-consumed stream ticket."
      });
    }
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
