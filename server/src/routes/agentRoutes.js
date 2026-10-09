import express from "express";
import * as agentController from "../controllers/agentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All agent routes require authentication
router.use(protect);

router.post("/plan", agentController.createPlan);
router.post("/:id/approve-plan", agentController.approvePlan);
router.post("/:id/apply", agentController.applyChanges);
router.post("/:id/reject", agentController.rejectChanges);
router.get("/tasks/:taskId/events", agentController.streamTaskEvents);
router.get("/:id/stream", agentController.streamTaskEvents);
router.get("/:id", agentController.getSession);
router.get("/", agentController.listSessions);

export default router;
