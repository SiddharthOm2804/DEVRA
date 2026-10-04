import Repository from "../models/Repository.js";
import User from "../models/User.js";
import { config } from "../config/env.js";
import * as repositoryService from "../services/repositoryService.js";
import * as githubService from "../services/githubService.js";

/**
 * @route   GET /api/repositories
 * @desc    Get all saved repositories belonging to authenticated user
 * @access  Private
 */
export const getRepositories = async (req, res, next) => {
  try {
    const { search, language, sort } = req.query;
    const repositories = await repositoryService.getUserRepositories(req.user._id, {
      search,
      language,
      sort
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
 * @route   PUT /api/repositories/:id
 * @desc    Update repository metadata
 * @access  Private
 */
export const updateRepository = async (req, res, next) => {
  try {
    const updated = await repositoryService.updateRepository(
      req.user._id,
      req.params.id,
      req.body
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

    let githubRepos = [];

    if (user.githubAccessToken && user.githubAccessToken.startsWith("gh")) {
      try {
        githubRepos = await githubService.getUserRepositories(user.githubAccessToken);
      } catch (ghErr) {
        console.warn("[GitHub API] Live token fetch failed, falling back to simulated repos:", ghErr.message);
        githubRepos = githubService.getSimulatedRepositories(user.githubUsername || user.name);
      }
    } else if (user.githubUsername) {
      try {
        githubRepos = await githubService.getPublicUserRepositories(user.githubUsername);
      } catch (pubErr) {
        githubRepos = githubService.getSimulatedRepositories(user.githubUsername);
      }
    } else {
      // Return simulated sample GitHub repositories for instant developer testing
      githubRepos = githubService.getSimulatedRepositories(user.name.toLowerCase().replace(/\s+/g, "-"));
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
      repo.lastUpdated = lastUpdated ? new Date(lastUpdated) : new Date();
      await repo.save();
    } else {
      // Create new repository record in MongoDB
      repo = await Repository.create({
        userId: req.user._id,
        githubId: githubId || Math.floor(Math.random() * 9000000) + 1000000,
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
        lastUpdated: lastUpdated ? new Date(lastUpdated) : new Date(),
        health: Math.floor(Math.random() * 10) + 90,
        qualityGrade: "A+",
        securityStatus: "Secure"
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
