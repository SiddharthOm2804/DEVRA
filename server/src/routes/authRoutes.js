import express from "express";
import {
  register,
  login,
  getMe,
  logout,
  getGithubAuthUrl,
  initiateGithubAuth,
  handleGithubCallback,
  getUsers,
  updateUserRole,
  forgotPassword,
  resetPassword,
  exchangeTicket,
  createStreamTicket
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireTeamRole } from "../middleware/rbacMiddleware.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { requireDB } from "../middleware/dbCheckMiddleware.js";

const router = express.Router();

router.post("/register", authLimiter, requireDB, register);
router.post("/login", authLimiter, requireDB, login);
router.post("/forgot-password", authLimiter, requireDB, forgotPassword);
router.post("/reset-password/:token", authLimiter, requireDB, resetPassword);
router.post("/exchange-ticket", authLimiter, exchangeTicket);
router.post("/stream-ticket", protect, createStreamTicket);
router.get("/me", protect, getMe);
router.post("/logout", logout);

// Admin User Role Management Routes
router.get("/users", protect, requireTeamRole("admin"), getUsers);
router.patch("/users/:id/role", protect, requireTeamRole("admin"), updateUserRole);

// GitHub OAuth Routes
router.get("/github/url", getGithubAuthUrl);
router.get("/github", initiateGithubAuth);
router.get("/github/callback", handleGithubCallback);

export default router;
