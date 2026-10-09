import express from "express";
import * as chatController from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  requireRepositoryAccess,
  PERMISSIONS
} from "../middleware/rbacMiddleware.js";

const router = express.Router();

// All chat routes require authentication
router.use(protect);

router.post("/message", requireRepositoryAccess(PERMISSIONS.CHAT_SEND), chatController.sendMessage);
router.get("/history/:repositoryId", requireRepositoryAccess(PERMISSIONS.CHAT_READ), chatController.getHistory);
router.delete("/history/:repositoryId", requireRepositoryAccess(PERMISSIONS.CHAT_CLEAR), chatController.clearHistory);

export default router;
