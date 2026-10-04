import Review from "../models/Review.js";
import Repository from "../models/Repository.js";
import * as aiService from "../services/aiService.js";

/**
 * @route   POST /api/reviews/generate
 * @desc    Generate and persist an AI-powered code review
 * @access  Private
 */
export const generateReview = async (req, res, next) => {
  try {
    const {
      repositoryId,
      fileName = "snippet.js",
      filePath = "",
      language = "JavaScript",
      code,
      context = ""
    } = req.body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Source code snippet is required for review."
      });
    }

    let repoDoc = null;
    if (repositoryId) {
      repoDoc = await Repository.findOne({
        _id: repositoryId,
        userId: req.user._id
      });
    }

    // Run AI review and validate output
    const reviewResult = await aiService.reviewCode({
      code,
      language,
      fileName,
      context
    });

    // Persist validated review in MongoDB
    const review = await Review.create({
      repositoryId: repoDoc ? repoDoc._id : null,
      userId: req.user._id,
      title: context || `Review for ${fileName}`,
      fileName,
      filePath: filePath || fileName,
      language,
      codeSnippet: code.slice(0, 10000), // Cap stored snippet to 10kb
      summary: reviewResult.summary,
      severity: reviewResult.severity,
      score: reviewResult.score,
      issues: reviewResult.issues,
      suggestions: reviewResult.suggestions,
      metrics: reviewResult.metrics,
      aiProvider: reviewResult.aiProvider,
      aiModel: reviewResult.aiModel,
      status: "completed"
    });

    res.status(201).json({
      success: true,
      message: "AI code review generated and validated successfully",
      review
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/reviews
 * @desc    Get all reviews for authenticated user
 * @access  Private
 */
export const getReviews = async (req, res, next) => {
  try {
    const { repositoryId, severity, limit = 20, page = 1 } = req.query;

    const query = { userId: req.user._id };
    if (repositoryId) query.repositoryId = repositoryId;
    if (severity) query.severity = severity;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate("repositoryId", "name language");

    const total = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      reviews
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/reviews/:id
 * @desc    Get single review by ID
 * @access  Private
 */
export const getReviewById = async (req, res, next) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate("repositoryId", "name language url");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Code review not found."
      });
    }

    res.status(200).json({
      success: true,
      review
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete a review
 * @access  Private
 */
export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Code review not found."
      });
    }

    res.status(200).json({
      success: true,
      message: "Code review deleted successfully."
    });
  } catch (error) {
    next(error);
  }
};
