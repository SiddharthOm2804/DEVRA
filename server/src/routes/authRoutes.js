import express from "express";
import {
  register,
  login,
  getMe,
  logout,
  getGithubAuthUrl,
  initiateGithubAuth,
  handleGithubCallback
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/logout", logout);

// GitHub OAuth Routes
router.get("/github/url", getGithubAuthUrl);
router.get("/github", initiateGithubAuth);
router.get("/github/callback", handleGithubCallback);

export default router;
