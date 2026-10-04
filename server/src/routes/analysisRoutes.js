import express from "express";
import { triggerAnalysis, getAnalysis } from "../controllers/analysisController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All analysis routes require JWT authentication
router.use(protect);

router.route("/:repositoryId")
  .post(triggerAnalysis)
  .get(getAnalysis);

export default router;
