import AgentSession from "../models/AgentSession.js";
import * as agentService from "../services/agentService.js";

/**
 * @route   POST /api/agent/plan
 * @desc    Initialize AI Agent session, analyze repository, and create implementation plan
 * @access  Private
 */
export const createPlan = async (req, res, next) => {
  try {
    const { repositoryId, goalPrompt } = req.body;

    if (!repositoryId || !goalPrompt) {
      return res.status(400).json({
        success: false,
        message: "Both repositoryId and goalPrompt are required."
      });
    }

    const session = await agentService.createPlan({
      repositoryId,
      userId: req.user._id,
      goalPrompt
    });

    res.status(201).json({
      success: true,
      message: "AI Agent plan synthesized successfully. Awaiting user approval.",
      session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/agent/:id/approve-plan
 * @desc    User approves implementation plan; Agent generates code changes and diff preview
 * @access  Private
 */
export const approvePlan = async (req, res, next) => {
  try {
    const session = await agentService.generateChanges(
      req.params.id,
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: "Plan approved. Proposed code changes and diff preview generated.",
      session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/agent/:id/apply
 * @desc    User approves diff; Agent applies code changes with reversible snapshot
 * @access  Private
 */
export const applyChanges = async (req, res, next) => {
  try {
    const session = await agentService.applyChanges(
      req.params.id,
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: "Proposed changes applied safely. Reversible backup snapshot saved.",
      session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/agent/:id/reject
 * @desc    User rejects proposed changes; changes are discarded and files remain untouched
 * @access  Private
 */
export const rejectChanges = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const session = await agentService.rejectChanges(
      req.params.id,
      req.user._id,
      reason
    );

    res.status(200).json({
      success: true,
      message: "Proposed changes rejected. Project files remain 100% untouched.",
      session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/agent/:id
 * @desc    Get details for an AI Agent session
 * @access  Private
 */
export const getSession = async (req, res, next) => {
  try {
    const session = await AgentSession.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate("repositoryId", "name language");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Agent session not found."
      });
    }

    res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/agent
 * @desc    List Agent sessions for user/repository
 * @access  Private
 */
export const listSessions = async (req, res, next) => {
  try {
    const { repositoryId, limit = 10 } = req.query;
    const query = { userId: req.user._id };
    if (repositoryId) query.repositoryId = repositoryId;

    const sessions = await AgentSession.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate("repositoryId", "name language");

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    next(error);
  }
};
