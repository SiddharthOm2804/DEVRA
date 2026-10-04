import rateLimit from "express-rate-limit";

/**
 * Standard API Rate Limiter
 * 300 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes."
  }
});

/**
 * Sensitive Authentication Limiter
 * 20 attempts per 15 minutes to mitigate brute-force
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts from this IP, please try again after 15 minutes."
  }
});

/**
 * AI & Agent Execution Limiter
 * 60 requests per 15 minutes
 */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "AI compute request quota exceeded for this interval. Please try again shortly."
  }
});
