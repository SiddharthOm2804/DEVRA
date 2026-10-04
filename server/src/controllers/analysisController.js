import Repository from "../models/Repository.js";
import User from "../models/User.js";
import * as codeAnalysisService from "../services/codeAnalysisService.js";

/**
 * @route   POST /api/analysis/:repositoryId
 * @desc    Trigger codebase structure and dependency analysis for a repository
 * @access  Private
 */
export const triggerAnalysis = async (req, res, next) => {
  try {
    const { repositoryId } = req.params;

    // Verify repository exists and belongs to authenticated user
    const repository = await Repository.findOne({
      _id: repositoryId,
      userId: req.user._id
    });

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: "Repository not found or access denied."
      });
    }

    // Fetch user with githubAccessToken if available
    const user = await User.findById(req.user._id).select("+githubAccessToken");

    // Run analysis pipeline
    const analysis = await codeAnalysisService.runCodebaseAnalysis(repository, user);

    // Update repository lastScanned timestamp & health
    repository.lastScanned = new Date();
    await repository.save();

    res.status(201).json({
      success: true,
      message: "Codebase analysis completed successfully.",
      analysis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analysis/:repositoryId
 * @desc    Get the latest analysis result for a repository
 * @access  Private
 */
export const getAnalysis = async (req, res, next) => {
  try {
    const { repositoryId } = req.params;

    // Verify repository ownership
    const repository = await Repository.findOne({
      _id: repositoryId,
      userId: req.user._id
    });

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: "Repository not found or access denied."
      });
    }

    // Fetch latest analysis
    let analysis = await codeAnalysisService.getLatestAnalysis(repositoryId, req.user._id);

    // If no analysis exists yet, run initial analysis on demand
    if (!analysis) {
      const user = await User.findById(req.user._id).select("+githubAccessToken");
      analysis = await codeAnalysisService.runCodebaseAnalysis(repository, user);
    }

    res.status(200).json({
      success: true,
      analysis
    });
  } catch (error) {
    next(error);
  }
};
