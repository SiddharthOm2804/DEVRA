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
  updateUserRole
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireTeamRole } from "../middleware/rbacMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
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
