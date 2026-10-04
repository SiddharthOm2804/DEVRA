import express from "express";
import * as chatController from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All chat routes require authentication
router.use(protect);

router.post("/message", chatController.sendMessage);
router.get("/history/:repositoryId", chatController.getHistory);
router.delete("/history/:repositoryId", chatController.clearHistory);

export default router;
