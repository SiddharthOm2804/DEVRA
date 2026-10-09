import AgentSession from "../models/AgentSession.js";
import * as agentService from "../services/agentService.js";
import { eventBus } from "../services/realtime/eventBus.js";
import { createEvent, formatSSEMessage, EVENT_TYPES } from "../services/realtime/eventContract.js";

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
 * @route   GET /api/agent/tasks/:taskId/events
 * @route   GET /api/agent/:id/stream
 * @desc    Stream real-time task progress and status updates via Server-Sent Events (SSE)
 * @access  Private
 */
export const streamTaskEvents = async (req, res, next) => {
  const taskId = req.params.taskId || req.params.id;

  try {
    if (!taskId) {
      return res.status(400).json({ success: false, message: "Task ID is required." });
    }

    // 1. Verify task ownership & authorization
    const session = await AgentSession.findOne({
      _id: taskId,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Agent session not found or access denied."
      });
    }

    // 2. Set SSE HTTP headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    // 3. Send initial state snapshot
    const initEvent = createEvent({
      type: EVENT_TYPES.TASK_STARTED,
      taskId: session._id,
      progress: {
        phase: session.status,
        message: `Connected to task stream (${session.status})`
      },
      payload: {
        status: session.status,
        goalPrompt: session.goalPrompt,
        planReady: !!session.plan?.summary,
        changesReady: session.proposedChanges?.length > 0
      }
    });
    res.write(formatSSEMessage(initEvent));

    // 4. If session is already finalized, send terminal event and end
    if (["applied", "rejected", "failed"].includes(session.status)) {
      const termEvent = createEvent({
        type: session.status === "applied" ? EVENT_TYPES.TASK_COMPLETED : EVENT_TYPES.TASK_CANCELLED,
        taskId: session._id,
        progress: {
          phase: session.status,
          percent: 100,
          message: `Task is already finalized in state: ${session.status}`
        },
        payload: { status: session.status }
      });
      res.write(formatSSEMessage(termEvent));
      res.end();
      return;
    }

    // 5. Periodic Heartbeat (15s keep-alive)
    const heartbeatTimer = setInterval(() => {
      try {
        const heartbeat = createEvent({
          type: EVENT_TYPES.HEARTBEAT,
          taskId: session._id
        });
        res.write(formatSSEMessage(heartbeat));
      } catch (_) {}
    }, 15000);

    // 6. Subscribe to live task events from the EventBus
    let isClosed = false;
    const cleanup = () => {
      if (isClosed) return;
      isClosed = true;
      clearInterval(heartbeatTimer);
      unsubscribe();
    };

    const unsubscribe = eventBus.subscribeTask(session._id.toString(), (event) => {
      if (isClosed) return;
      try {
        res.write(formatSSEMessage(event));

        // If task reached terminal state (applied/failed/cancelled), close after grace period
        if (event.type === EVENT_TYPES.TASK_COMPLETED && event.progress?.phase === "applied") {
          setTimeout(() => {
            cleanup();
            try { res.end(); } catch (_) {}
          }, 1000);
        } else if (
          event.type === EVENT_TYPES.TASK_FAILED ||
          event.type === EVENT_TYPES.TASK_CANCELLED
        ) {
          setTimeout(() => {
            cleanup();
            try { res.end(); } catch (_) {}
          }, 1000);
        }
      } catch (err) {
        cleanup();
      }
    });

    // Handle client disconnect
    req.on("close", () => {
      cleanup();
    });

    req.on("error", () => {
      cleanup();
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

