import express from "express";
import * as reviewController from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All review routes require authentication
router.use(protect);

router.post("/generate", reviewController.generateReview);
router.get("/", reviewController.getReviews);
router.get("/:id", reviewController.getReviewById);
router.delete("/:id", reviewController.deleteReview);

export default router;
