import express from "express";
import { triggerAnalysis, getAnalysis } from "../controllers/analysisController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  requireRepositoryAccess,
  PERMISSIONS
} from "../middleware/rbacMiddleware.js";

const router = express.Router();

// All analysis routes require JWT authentication
router.use(protect);

router.route("/:repositoryId")
  .post(requireRepositoryAccess(PERMISSIONS.ANALYSIS_TRIGGER), triggerAnalysis)
  .get(requireRepositoryAccess(PERMISSIONS.ANALYSIS_READ), getAnalysis);

export default router;
