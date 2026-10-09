import express from "express";
import * as agentController from "../controllers/agentController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  requirePermission,
  requireRepositoryAccess,
  requireTaskAccess,
  PERMISSIONS
} from "../middleware/rbacMiddleware.js";

const router = express.Router();

// All agent routes require authentication
router.use(protect);

router.post("/plan", requireRepositoryAccess(PERMISSIONS.AGENT_PLAN), agentController.createPlan);
router.post("/:id/approve-plan", requireTaskAccess(PERMISSIONS.AGENT_APPROVE), agentController.approvePlan);
router.post("/:id/apply", requireTaskAccess(PERMISSIONS.AGENT_APPLY), agentController.applyChanges);
router.post("/:id/reject", requireTaskAccess(PERMISSIONS.AGENT_REJECT), agentController.rejectChanges);
router.get("/tasks/:taskId/events", requireTaskAccess(PERMISSIONS.SSE_STREAM), agentController.streamTaskEvents);
router.get("/:id/stream", requireTaskAccess(PERMISSIONS.SSE_STREAM), agentController.streamTaskEvents);
router.get("/:id", requireTaskAccess(PERMISSIONS.AGENT_PLAN), agentController.getSession);
router.get("/", requirePermission(PERMISSIONS.AGENT_PLAN), agentController.listSessions);

export default router;
