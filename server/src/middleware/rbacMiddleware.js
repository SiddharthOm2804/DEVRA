import Repository from "../models/Repository.js";
import AgentSession from "../models/AgentSession.js";

/**
 * Standard System Roles
 */
export const ROLES = {
  ADMIN: "admin",
  ARCHITECT: "architect",
  DEVELOPER: "developer",
  GUEST: "guest"
};

/**
 * Fine-Grained Permissions
 */
export const PERMISSIONS = {
  USER_MANAGE: "user:manage",
  REPO_CREATE: "repo:create",
  REPO_READ: "repo:read",
  REPO_UPDATE: "repo:update",
  REPO_DELETE: "repo:delete",
  REPO_SYNC: "repo:sync",
  RAG_SEARCH: "rag:search",
  RAG_INGEST: "rag:ingest",
  ANALYSIS_READ: "analysis:read",
  ANALYSIS_TRIGGER: "analysis:trigger",
  REVIEW_READ: "review:read",
  REVIEW_TRIGGER: "review:trigger",
  REVIEW_DELETE: "review:delete",
  CHAT_READ: "chat:read",
  CHAT_SEND: "chat:send",
  CHAT_CLEAR: "chat:clear",
  AGENT_PLAN: "agent:plan",
  AGENT_APPROVE: "agent:approve",
  AGENT_APPLY: "agent:apply",
  AGENT_REJECT: "agent:reject",
  SSE_STREAM: "sse:stream"
};

/**
 * Role to Permissions Mapping
 */
export const ROLE_PERMISSIONS_MAP = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ARCHITECT]: [
    PERMISSIONS.REPO_CREATE,
    PERMISSIONS.REPO_READ,
    PERMISSIONS.REPO_UPDATE,
    PERMISSIONS.REPO_SYNC,
    PERMISSIONS.RAG_SEARCH,
    PERMISSIONS.RAG_INGEST,
    PERMISSIONS.ANALYSIS_READ,
    PERMISSIONS.ANALYSIS_TRIGGER,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.REVIEW_TRIGGER,
    PERMISSIONS.REVIEW_DELETE,
    PERMISSIONS.CHAT_READ,
    PERMISSIONS.CHAT_SEND,
    PERMISSIONS.CHAT_CLEAR,
    PERMISSIONS.AGENT_PLAN,
    PERMISSIONS.AGENT_APPROVE,
    PERMISSIONS.AGENT_APPLY,
    PERMISSIONS.AGENT_REJECT,
    PERMISSIONS.SSE_STREAM
  ],
  [ROLES.DEVELOPER]: [
    PERMISSIONS.REPO_CREATE,
    PERMISSIONS.REPO_READ,
    PERMISSIONS.REPO_UPDATE,
    PERMISSIONS.REPO_SYNC,
    PERMISSIONS.RAG_SEARCH,
    PERMISSIONS.RAG_INGEST,
    PERMISSIONS.ANALYSIS_READ,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.CHAT_READ,
    PERMISSIONS.CHAT_SEND,
    PERMISSIONS.CHAT_CLEAR,
    PERMISSIONS.AGENT_PLAN,
    PERMISSIONS.AGENT_APPROVE,
    PERMISSIONS.AGENT_APPLY,
    PERMISSIONS.AGENT_REJECT,
    PERMISSIONS.SSE_STREAM
  ],
  [ROLES.GUEST]: [
    PERMISSIONS.REPO_READ,
    PERMISSIONS.ANALYSIS_READ,
    PERMISSIONS.REVIEW_READ,
    PERMISSIONS.CHAT_READ,
    PERMISSIONS.CHAT_SEND,
    PERMISSIONS.RAG_SEARCH,
    PERMISSIONS.SSE_STREAM
  ]
};

/**
 * Check if a role possesses a specific permission
 */
export function hasPermission(role, permission) {
  const allowed = ROLE_PERMISSIONS_MAP[role] || ROLE_PERMISSIONS_MAP[ROLES.DEVELOPER];
  return allowed.includes(permission);
}

/**
 * Require Authenticated User
 */
export function requireAuthenticatedUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Authentication is required."
    });
  }
  next();
}

/**
 * Require Team Membership (authenticated user in team/organization context)
 */
export function requireTeamMembership(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Authentication is required."
    });
  }
  next();
}

/**
 * Require Team Role (one of allowed roles)
 */
export function requireTeamRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Authentication is required."
      });
    }

    const userRole = req.user.role || ROLES.DEVELOPER;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Action requires one of the following roles: ${allowedRoles.join(", ")}.`
      });
    }
    next();
  };
}

/**
 * Require Specific Permission
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Authentication is required."
      });
    }

    const userRole = req.user.role || ROLES.DEVELOPER;
    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Your role (${userRole}) lacks the required permission: ${permission}.`
      });
    }
    next();
  };
}

/**
 * Require Repository Access (verifies repository exists, user ownership or role permissions)
 */
export function requireRepositoryAccess(requiredPermission = PERMISSIONS.REPO_READ) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Authentication is required."
      });
    }

    const repoId = req.params.id || req.params.repositoryId || req.body.repositoryId || req.query.repositoryId;
    if (!repoId) {
      // If no repository ID in request, defer to standard permission check
      if (!hasPermission(req.user.role || ROLES.DEVELOPER, requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden. Access denied for this operation."
        });
      }
      return next();
    }

    const isValidObjectId = String(repoId).match(/^[0-9a-fA-F]{24}$/);

    try {
      let repository = null;
      if (isValidObjectId) {
        repository = await Repository.findById(repoId);
      } else {
        repository = await Repository.findOne({ name: repoId });
      }

      if (!repository) {
        return res.status(404).json({
          success: false,
          message: "Repository not found."
        });
      }

      const userRole = req.user.role || ROLES.DEVELOPER;
      const isOwner = repository.userId.toString() === req.user._id.toString();
      const isAdmin = userRole === ROLES.ADMIN;

      // Allow access if admin, owner, or if role possesses the required permission
      if (!isOwner && !isAdmin && !hasPermission(userRole, requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden. Access denied for this repository."
        });
      }

      req.repository = repository;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require Task / Agent Session Access
 */
export function requireTaskAccess(requiredPermission = PERMISSIONS.AGENT_PLAN) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Authentication is required."
      });
    }

    const taskId = req.params.id || req.params.taskId || req.body.taskId;
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "Task or Agent session ID is required."
      });
    }

    const isValidObjectId = String(taskId).match(/^[0-9a-fA-F]{24}$/);
    if (!isValidObjectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid Task or Agent session ID format."
      });
    }

    try {
      const session = await AgentSession.findById(taskId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Agent session not found."
        });
      }

      const userRole = req.user.role || ROLES.DEVELOPER;
      const isOwner = session.userId.toString() === req.user._id.toString();
      const isAdmin = userRole === ROLES.ADMIN;

      if (!isOwner && !isAdmin && !hasPermission(userRole, requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden. Access denied for this Agent session."
        });
      }

      req.agentSession = session;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require Branch Access (Verifies permitted branch modifications)
 */
export function requireBranchAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Authentication is required."
    });
  }

  const userRole = req.user.role || ROLES.DEVELOPER;
  const targetBranch = req.body.branch || req.query.branch || "main";

  // Guests cannot modify protected main/master branches
  if (userRole === ROLES.GUEST && ["main", "master", "production"].includes(targetBranch.toLowerCase())) {
    return res.status(403).json({
      success: false,
      message: `Forbidden. Role '${userRole}' cannot modify branch '${targetBranch}'.`
    });
  }

  next();
}
