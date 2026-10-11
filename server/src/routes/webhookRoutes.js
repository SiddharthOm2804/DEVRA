import express from "express";
import { handleGithubWebhook } from "../controllers/webhookController.js";

const router = express.Router();

// Dedicated GitHub webhook receiver
router.post("/github", handleGithubWebhook);

export default router;
