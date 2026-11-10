import Repository from "../models/Repository.js";
import User from "../models/User.js";
import { config } from "../config/env.js";
import * as repositoryService from "../services/repositoryService.js";
import * as githubService from "../services/githubService.js";
import { detectLanguage } from "../services/codeAnalysisService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../../");

const MAX_PREVIEW_FILE_SIZE = 1 * 1024 * 1024; // 1 MB max for inline source preview
const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "ico", "svg", "webp", "pdf",
  "zip", "tar", "gz", "7z", "rar", "wasm", "exe", "dll",
  "so", "dylib", "bin", "woff", "woff2", "ttf", "eot",
  "mp3", "mp4", "mov", "avi", "iso", "dmg", "jar"
]);

/**
 * @route   GET /api/repositories
 * @desc    Get all saved repositories belonging to authenticated user
 * @access  Private
 */
export const getRepositories = async (req, res, next) => {
  try {
    const { search, language, sort, limit, page } = req.query;
    const repositories = await repositoryService.getUserRepositories(req.user._id, {
      search,
      language,
      sort,
      limit,
      page
    });

    res.status(200).json({
      success: true,
      count: repositories.length,
      repositories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/repositories/:id
 * @desc    Get a single repository by ID
 * @access  Private
 */
export const getRepository = async (req, res, next) => {
  try {
    const repository = await repositoryService.getRepositoryById(
      req.user._id,
      req.params.id
    );

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: "Repository not found."
      });
    }

    res.status(200).json({
      success: true,
      repository
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/repositories
 * @desc    Connect / create a new custom repository
 * @access  Private
 */
export const createRepository = async (req, res, next) => {
  try {
    const { name, description, language, activeBranch, gitUrl, visibility, url, owner, githubId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Repository name is required."
      });
    }

    const newRepo = await repositoryService.createRepository(req.user._id, {
      name,
      description,
      language: language || "TypeScript",
      activeBranch: activeBranch || "main",
      defaultBranch: activeBranch || "main",
      gitUrl: gitUrl || "",
      url: url || gitUrl || "",
      owner: owner || { login: req.user.name, avatarUrl: req.user.avatar },
      githubId: githubId || null,
      visibility: visibility || "public",
      isPrivate: visibility === "private"
    });

    res.status(201).json({
      success: true,
      message: "Repository connected successfully.",
      repository: newRepo
    });
  } catch (error) {
    if (error.message.includes("already exists")) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Explicit allowlist of user-updatable repository fields
 */
export const ALLOWED_REPO_UPDATE_FIELDS = new Set([
  "name",
  "description",
  "visibility",
  "isPrivate",
  "activeBranch",
  "defaultBranch",
  "language",
  "languageColor",
  "isStarred"
]);

/**
 * Protected repository fields that must never be altered via ordinary update
 */
export const PROTECTED_REPO_FIELDS = new Set([
  "_id",
  "userId",
  "owner",
  "githubId",
  "createdAt",
  "updatedAt",
  "health",
  "qualityGrade",
  "securityStatus",
  "lastScanned",
  "commitCount",
  "branchCount",
  "filesCount",
  "testCoverage",
  "contributors"
]);

/**
 * @route   PUT /api/repositories/:id
 * @desc    Update repository metadata
 * @access  Private
 */
export const updateRepository = async (req, res, next) => {
  try {
    const rawUpdates = req.body || {};

    // 1. Explicitly reject protected fields like userId, _id, ownership reassignments
    const attemptedKeys = Object.keys(rawUpdates);
    const forbiddenField = attemptedKeys.find((k) => PROTECTED_REPO_FIELDS.has(k));
    if (forbiddenField) {
      return res.status(400).json({
        success: false,
        message: `Field '${forbiddenField}' is protected and cannot be modified.`
      });
    }

    // 2. Filter payload strictly against permitted allowlist
    const sanitizedUpdates = {};
    for (const key of attemptedKeys) {
      if (ALLOWED_REPO_UPDATE_FIELDS.has(key)) {
        sanitizedUpdates[key] = rawUpdates[key];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid updatable repository fields provided."
      });
    }

    // Validate type and bounds for string fields
    if (sanitizedUpdates.name !== undefined) {
      if (typeof sanitizedUpdates.name !== "string" || sanitizedUpdates.name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Repository name must be a non-empty string."
        });
      }
      sanitizedUpdates.name = sanitizedUpdates.name.trim();
    }

    if (sanitizedUpdates.description !== undefined && typeof sanitizedUpdates.description !== "string") {
      sanitizedUpdates.description = String(sanitizedUpdates.description || "");
    }

    if (sanitizedUpdates.visibility !== undefined) {
      if (!["public", "private", "internal"].includes(sanitizedUpdates.visibility)) {
        return res.status(400).json({
          success: false,
          message: "Visibility must be one of: public, private, internal."
        });
      }
    }

    const updated = await repositoryService.updateRepository(
      req.user._id,
      req.params.id,
      sanitizedUpdates
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Repository not found or unauthorized."
      });
    }

    res.status(200).json({
      success: true,
      message: "Repository updated successfully.",
      repository: updated
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @route   DELETE /api/repositories/:id
 * @desc    Remove repository from workspace
 * @access  Private
 */
export const deleteRepository = async (req, res, next) => {
  try {
    const deleted = await repositoryService.deleteRepository(
      req.user._id,
      req.params.id
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Repository not found or unauthorized."
      });
    }

    res.status(200).json({
      success: true,
      message: "Repository removed successfully."
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/repositories/:id/sync
 * @desc    Trigger simulated repository metrics scan and sync
 * @access  Private
 */
export const syncRepository = async (req, res, next) => {
  try {
    const synced = await repositoryService.syncRepository(
      req.user._id,
      req.params.id
    );

    if (!synced) {
      return res.status(404).json({
        success: false,
        message: "Repository not found or unauthorized."
      });
    }

    res.status(200).json({
      success: true,
      message: "Repository synchronized successfully.",
      repository: synced
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/repositories/github/status
 * @desc    Check user's GitHub integration status (never exposes access token)
 * @access  Private
 */
export const getGithubStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const reposCount = await Repository.countDocuments({ userId: req.user._id });

    res.status(200).json({
      success: true,
      isGithubConnected: !!user.isGithubConnected,
      githubUsername: user.githubUsername || null,
      githubAvatar: user.githubAvatar || null,
      reposCount: reposCount || 0,
      oauthConfigured: !!config.github.clientId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/repositories/github/repos
 * @desc    Fetch available repositories from user's connected GitHub account
 * @access  Private
 */
export const getAvailableGithubRepos = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+githubAccessToken");

    if (!user.isGithubConnected && !user.githubAccessToken && !user.githubUsername) {
      return res.status(400).json({
        success: false,
        code: "GITHUB_NOT_CONNECTED",
        message: "GitHub account is not connected. Connect your GitHub account to import repositories."
      });
    }

    let githubRepos = [];

    if (user.githubAccessToken && user.githubAccessToken.startsWith("gh")) {
      try {
        githubRepos = await githubService.getUserRepositories(user.githubAccessToken);
      } catch (ghErr) {
        const statusCode = ghErr.response?.status;
        if (statusCode === 401 || statusCode === 403) {
          return res.status(401).json({
            success: false,
            code: "GITHUB_TOKEN_EXPIRED",
            message: "GitHub authorization has expired or was revoked. Please reconnect your GitHub account."
          });
        }
        if (statusCode === 429) {
          return res.status(429).json({
            success: false,
            code: "GITHUB_RATE_LIMITED",
            message: "GitHub API rate limit exceeded. Please try again later."
          });
        }
        return res.status(502).json({
          success: false,
          code: "GITHUB_UNAVAILABLE",
          message: "GitHub service is temporarily unavailable. Could not fetch repositories."
        });
      }
    } else if (user.githubUsername) {
      try {
        githubRepos = await githubService.getPublicUserRepositories(user.githubUsername);
      } catch (pubErr) {
        const statusCode = pubErr.response?.status;
        if (statusCode === 404) {
          return res.status(404).json({
            success: false,
            code: "GITHUB_USER_NOT_FOUND",
            message: `GitHub user '${user.githubUsername}' not found.`
          });
        }
        return res.status(502).json({
          success: false,
          code: "GITHUB_UNAVAILABLE",
          message: "GitHub service is temporarily unavailable. Could not fetch public repositories."
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        code: "GITHUB_NOT_CONNECTED",
        message: "No connected GitHub account or username found."
      });
    }

    // Check which repos are already imported in MongoDB for this user
    const savedRepos = await Repository.find({ userId: req.user._id }).select("githubId name");
    const savedIds = new Set(savedRepos.map((r) => r.githubId).filter(Boolean));
    const savedNames = new Set(savedRepos.map((r) => r.name.toLowerCase()));

    const formattedList = githubRepos.map((repo) => ({
      ...repo,
      isImported: savedIds.has(repo.githubId) || savedNames.has(repo.name.toLowerCase())
    }));


    res.status(200).json({
      success: true,
      count: formattedList.length,
      repositories: formattedList
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/repositories/github/connect-repo
 * @desc    Store a selected GitHub repository's metadata in MongoDB
 * @access  Private
 */
export const connectGithubRepo = async (req, res, next) => {
  try {
    const {
      githubId,
      name,
      fullName,
      owner,
      url,
      gitUrl,
      defaultBranch,
      language,
      stars,
      forks,
      isPrivate,
      description,
      lastUpdated
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Repository name is required."
      });
    }

    // Check if repository with same name already exists for this user
    let repo = await Repository.findOne({
      userId: req.user._id,
      $or: [
        ...(githubId ? [{ githubId }] : []),
        { name: name.trim() }
      ]
    });

    if (repo) {
      // Update existing repository with latest GitHub metadata
      repo.githubId = githubId || repo.githubId;
      repo.fullName = fullName || repo.fullName;
      repo.owner = owner || repo.owner;
      repo.url = url || repo.url;
      repo.gitUrl = gitUrl || repo.gitUrl;
      repo.defaultBranch = defaultBranch || repo.defaultBranch;
      repo.activeBranch = defaultBranch || repo.activeBranch;
      repo.language = language || repo.language;
      repo.stars = stars !== undefined ? stars : repo.stars;
      repo.forks = forks !== undefined ? forks : repo.forks;
      repo.isPrivate = isPrivate !== undefined ? isPrivate : repo.isPrivate;
      repo.visibility = isPrivate ? "private" : "public";
      repo.description = description || repo.description;
      // GitHub imports must never inherit demo file-tree defaults from older records.
      repo.fileTree = [];
      repo.filesCount = 0;
      repo.lastUpdated = lastUpdated ? new Date(lastUpdated) : new Date();
      await repo.save();
    } else {
      // Create new repository record in MongoDB
      repo = await Repository.create({
        userId: req.user._id,
        githubId: githubId || null,
        name: name.trim(),
        fullName: fullName || `${owner?.login || req.user.name}/${name.trim()}`,
        owner: owner || {
          login: req.user.name,
          avatarUrl: req.user.avatar,
          htmlUrl: `https://github.com/${req.user.name}`
        },
        url: url || `https://github.com/${owner?.login || req.user.name}/${name.trim()}`,
        gitUrl: gitUrl || `https://github.com/${owner?.login || req.user.name}/${name.trim()}.git`,
        defaultBranch: defaultBranch || "main",
        activeBranch: defaultBranch || "main",
        language: language || "TypeScript",
        stars: stars || 0,
        forks: forks || 0,
        isPrivate: !!isPrivate,
        visibility: isPrivate ? "private" : "public",
        description: description || "",
        fileTree: [],
        filesCount: 0,
        lastUpdated: lastUpdated ? new Date(lastUpdated) : new Date(),
        health: null,
        qualityGrade: null,
        securityStatus: "Notice"
      });
    }

    res.status(201).json({
      success: true,
      message: "GitHub repository connected successfully.",
      repository: repo
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/repositories/github/connect-account
 * @desc    Connect GitHub profile (via Personal Access Token, OAuth code, or username)
 * @access  Private
 */
export const connectGithubAccount = async (req, res, next) => {
  try {
    const { token, code, username } = req.body;

    let accessToken = token;
    let ghProfile = null;

    if (code) {
      accessToken = await githubService.exchangeCodeForToken(code);
    }

    if (accessToken && accessToken.startsWith("gh")) {
      try {
        ghProfile = await githubService.getGithubUserProfile(accessToken);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Failed to authenticate with GitHub. Invalid access token."
        });
      }
    } else if (username) {
      ghProfile = {
        id: String(Math.floor(Math.random() * 8000000) + 1000000),
        username: username.trim(),
        name: username.trim(),
        avatarUrl: `https://github.com/${username.trim()}.png`
      };
    } else {
      // Demo developer connection
      ghProfile = {
        id: "583231",
        username: "octocat",
        name: "The Octocat",
        avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4"
      };
    }

    // Update user record in MongoDB (tokens stored safely on backend)
    const user = await User.findById(req.user._id).select("+githubAccessToken");
    user.githubId = ghProfile.id;
    user.githubUsername = ghProfile.username;
    user.githubAvatar = ghProfile.avatarUrl;
    user.githubAccessToken = accessToken || "demo_devpilot_token";
    user.isGithubConnected = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Connected GitHub account @${ghProfile.username}`,
      githubUsername: ghProfile.username,
      githubAvatar: ghProfile.avatarUrl
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/repositories/github/disconnect
 * @desc    Disconnect user's GitHub account and remove access tokens
 * @access  Private
 */
export const disconnectGithubAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+githubAccessToken");
    user.githubId = null;
    user.githubUsername = null;
    user.githubAvatar = null;
    user.githubAccessToken = null;
    user.isGithubConnected = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: "GitHub account disconnected."
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/repositories/:id/files/content
 * @desc    Fetch individual file content and metadata for 3D explorer / source viewer
 * @access  Private
 */
export const getRepositoryFileContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestedPath = req.query.path || req.params.filePath;
    const requestedRef = req.query.ref;

    if (!requestedPath || typeof requestedPath !== "string" || !requestedPath.trim()) {
      return res.status(400).json({
        success: false,
        message: "File path parameter 'path' is required."
      });
    }

    const trimmedPath = requestedPath.trim();

    // Prevent path traversal
    if (
      trimmedPath.includes("..") ||
      path.isAbsolute(trimmedPath) ||
      trimmedPath.startsWith("/") ||
      trimmedPath.startsWith("\\")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid file path: path traversal is not permitted."
      });
    }

    // Normalize forward slashes
    const normalizedRelativePath = path.posix.normalize(trimmedPath.replace(/\\/g, "/"));
    if (normalizedRelativePath.startsWith("..") || normalizedRelativePath === ".") {
      return res.status(400).json({
        success: false,
        message: "Invalid file path."
      });
    }

    // Prevent access to sensitive secret files
    const basename = path.posix.basename(normalizedRelativePath);
    if (
      basename.startsWith(".env") ||
      basename === "id_rsa" ||
      basename === "id_ed25519" ||
      normalizedRelativePath.includes(".git/")
    ) {
      return res.status(403).json({
        success: false,
        message: "Access to sensitive or secret configuration files is restricted."
      });
    }

    // Repository access verified by requireRepositoryAccess
    const repository = req.repository || (await repositoryService.getRepositoryById(req.user._id, id));
    if (!repository) {
      return res.status(404).json({
        success: false,
        message: "Repository not found."
      });
    }

    const effectiveRef = requestedRef || repository.activeBranch || repository.defaultBranch || "main";
    const ext = (path.posix.extname(normalizedRelativePath).replace(".", "") || "").toLowerCase();
    const langInfo = detectLanguage(normalizedRelativePath);
    const isDeclaredBinary = BINARY_EXTENSIONS.has(ext);

    let content = "";
    let size = 0;
    let isBinary = isDeclaredBinary;
    let isTruncated = false;
    let totalLines = null;
    let lineCount = null;

    // Strategy 1: Check if this file exists in the active workspace repository
    const localCandidatePath = path.resolve(REPO_ROOT, normalizedRelativePath);
    let handledLocally = false;

    if (
      localCandidatePath.startsWith(REPO_ROOT) &&
      fs.existsSync(localCandidatePath)
    ) {
      try {
        const stats = fs.statSync(localCandidatePath);
        if (stats.isFile()) {
          handledLocally = true;
          size = stats.size;

          if (isDeclaredBinary) {
            isBinary = true;
          } else if (size > MAX_PREVIEW_FILE_SIZE) {
            isTruncated = true;
            // Read first 256KB for preview
            const fd = fs.openSync(localCandidatePath, "r");
            const buf = Buffer.alloc(256 * 1024);
            const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
            fs.closeSync(fd);
            content = buf.slice(0, bytesRead).toString("utf8");
          } else {
            content = fs.readFileSync(localCandidatePath, "utf8");
            // Check for null bytes indicating binary content
            if (content.includes("\0")) {
              isBinary = true;
              content = "";
            }
          }
        }
      } catch (err) {
        handledLocally = false;
      }
    }

    // Strategy 2: If not found in local workspace or repository is connected to remote GitHub
    if (!handledLocally) {
      const isGithubRepo = Boolean(
        repository.githubId || (repository.owner?.login && repository.name)
      );

      if (isGithubRepo && repository.owner?.login) {
        try {
          const user = await User.findById(req.user._id).select("+githubAccessToken");
          const ghResult = await githubService.getRepositoryFileContent({
            owner: repository.owner.login,
            repo: repository.name,
            path: normalizedRelativePath,
            ref: effectiveRef,
            accessToken: user?.githubAccessToken
          });

          size = ghResult.size || 0;
          if (ghResult.isBinary || isDeclaredBinary) {
            isBinary = true;
            content = "";
          } else if (size > MAX_PREVIEW_FILE_SIZE) {
            isTruncated = true;
            content = (ghResult.content || "").slice(0, 256 * 1024);
          } else {
            content = ghResult.content || "";
            if (content.includes("\0")) {
              isBinary = true;
              content = "";
            }
          }
        } catch (ghErr) {
          if (ghErr.response?.status === 404 || ghErr.status === 404) {
            return res.status(404).json({
              success: false,
              message: `This file could not be found in the selected repository reference (${effectiveRef}).`
            });
          }
          if (ghErr.response?.status === 401 || ghErr.response?.status === 403) {
            return res.status(403).json({
              success: false,
              message: "Access to this repository source file was denied by the upstream provider."
            });
          }
          return res.status(502).json({
            success: false,
            message: `Failed to retrieve file from GitHub: ${ghErr.message}`
          });
        }
      } else {
        return res.status(404).json({
          success: false,
          message: `This file could not be found in the selected repository reference (${effectiveRef}).`
        });
      }
    }

    if (!isBinary && typeof content === "string") {
      if (content.length === 0) {
        totalLines = 0;
        lineCount = 0;
      } else {
        // Calculate physical line count handling CRLF and LF correctly
        const rawLines = content.split(/\r\n|\r|\n/);
        totalLines = rawLines.length;
        lineCount = rawLines.filter((l) => l.trim().length > 0).length;
      }
    }

    return res.status(200).json({
      success: true,
      file: {
        name: basename,
        path: normalizedRelativePath,
        extension: ext,
        language: langInfo.name,
        languageColor: langInfo.color,
        size,
        content: isBinary ? "" : content,
        totalLines,
        lineCount,
        ref: effectiveRef,
        isBinary,
        isTruncated,
        repositoryId: repository._id
      }
    });
  } catch (error) {
    next(error);
  }
};
