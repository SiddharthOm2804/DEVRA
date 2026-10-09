import express from "express";
import * as reviewController from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  requirePermission,
  PERMISSIONS
} from "../middleware/rbacMiddleware.js";

const router = express.Router();

// All review routes require authentication
router.use(protect);

router.post("/generate", requirePermission(PERMISSIONS.REVIEW_TRIGGER), reviewController.generateReview);
router.get("/", requirePermission(PERMISSIONS.REVIEW_READ), reviewController.getReviews);
router.get("/:id", requirePermission(PERMISSIONS.REVIEW_READ), reviewController.getReviewById);
router.delete("/:id", requirePermission(PERMISSIONS.REVIEW_DELETE), reviewController.deleteReview);

export default router;
