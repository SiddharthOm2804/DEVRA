import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

/**
 * Generate a signed JWT token
 * @param {object} payload - Token payload (userId, email, role, etc.)
 * @returns {string} Signed JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

/**
 * Verify a JWT token
 * @param {string} token - Bearer JWT token string
 * @returns {object} Decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};
