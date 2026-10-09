import crypto from "crypto";
import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";
import { config } from "../config/env.js";
import * as githubService from "../services/githubService.js";

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, organization } = req.body;

    // 1. Validation: Required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password."
      });
    }

    // 2. Validation: Email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    // 3. Validation: Password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long."
      });
    }

    // 4. Check for existing user
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email address already exists."
      });
    }

    // 5. Create user (password will be hashed by pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      organization: organization ? organization.trim() : "Devra Engineering"
    });

    // 6. Generate JWT token
    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    res.status(201).json({
      success: true,
      message: "Account registered successfully.",
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return JWT token
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password."
      });
    }

    // 2. Find user by email and explicitly include password for verification
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // 3. Compare entered password with stored bcrypt hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // 4. Generate JWT token
    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    res.status(200).json({
      success: true,
      message: "Signed in successfully.",
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Private (Protected)
 */
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (stateless confirmation)
 * @access  Public
 */
export const logout = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
};

/**
 * @route   GET /api/auth/github/url
 * @desc    Get GitHub OAuth authorization URL or configuration status
 * @access  Public
 */
export const getGithubAuthUrl = async (req, res, next) => {
  try {
    const { mode = "login", redirect } = req.query;
    const clientId = config.github.clientId;

    if (!clientId) {
      return res.status(200).json({
        success: true,
        configured: false,
        message: "GitHub OAuth credentials are not configured in environment.",
        url: null
      });
    }

    const statePayload = {
      mode,
      redirect: redirect || (mode === "connect" ? "/repositories" : "/dashboard"),
      userId: req.user ? req.user._id : null,
      nonce: crypto.randomBytes(8).toString("hex")
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
    const url = githubService.getOAuthAuthorizeUrl(state);

    return res.status(200).json({
      success: true,
      configured: true,
      url
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/github
 * @desc    Initiate GitHub OAuth flow by redirecting to GitHub
 * @access  Public
 */
export const initiateGithubAuth = async (req, res, next) => {
  try {
    const { mode = "login", redirect, userId } = req.query;
    const clientId = config.github.clientId;
    const returnBase = mode === "connect" ? "/repositories" : "/login";

    if (!clientId) {
      return res.redirect(`${config.clientUrl}${returnBase}?github_error=not_configured`);
    }

    const statePayload = {
      mode,
      redirect: redirect || (mode === "connect" ? "/repositories" : "/dashboard"),
      userId: userId || null,
      nonce: crypto.randomBytes(8).toString("hex")
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
    const url = githubService.getOAuthAuthorizeUrl(state);

    return res.redirect(url);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/github/callback
 * @desc    Handle GitHub OAuth callback, code exchange, user creation/linking, and JWT issuance
 * @access  Public
 */
export const handleGithubCallback = async (req, res, next) => {
  try {
    const { code, state, error: ghError, error_description } = req.query;

    let parsedState = { mode: "login", redirect: "/dashboard", userId: null };
    if (state) {
      try {
        parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      } catch (e) {
        // Fallback to default
      }
    }

    const returnBase = parsedState.mode === "connect" ? "/repositories" : "/login";
    const targetRedirect = parsedState.mode === "connect" ? "/repositories" : (parsedState.redirect || "/dashboard");

    // 1. Handle user cancellation or denial
    if (ghError) {
      const isCancelled = ghError === "access_denied" || ghError === "user_cancelled_authorize";
      const errParam = isCancelled ? "cancelled" : "denied";
      return res.redirect(`${config.clientUrl}${returnBase}?github_error=${errParam}`);
    }

    if (!code) {
      return res.redirect(`${config.clientUrl}${returnBase}?github_error=no_code`);
    }

    // 2. Exchange authorization code for access token
    let accessToken;
    try {
      accessToken = await githubService.exchangeCodeForToken(code);
    } catch (tokenErr) {
      console.error("[GitHub OAuth] Token exchange failed:", tokenErr.message);
      return res.redirect(`${config.clientUrl}${returnBase}?github_error=token_failed`);
    }

    // 3. Fetch GitHub profile
    let ghProfile;
    try {
      ghProfile = await githubService.getGithubUserProfile(accessToken);
    } catch (profileErr) {
      console.error("[GitHub OAuth] Profile retrieval failed:", profileErr.message);
      return res.redirect(`${config.clientUrl}${returnBase}?github_error=profile_failed`);
    }

    // 4. Case A: User is connecting their GitHub account from the console
    if (parsedState.mode === "connect" && parsedState.userId) {
      // Prevent duplicate connections: verify if another user already connected this GitHub account
      const duplicateUser = await User.findOne({
        githubId: ghProfile.id,
        _id: { $ne: parsedState.userId }
      });

      if (duplicateUser) {
        return res.redirect(`${config.clientUrl}/repositories?github_error=already_connected`);
      }

      const user = await User.findById(parsedState.userId).select("+githubAccessToken");
      if (!user) {
        return res.redirect(`${config.clientUrl}/login?github_error=session_expired`);
      }

      user.githubId = ghProfile.id;
      user.githubUsername = ghProfile.username;
      user.githubAvatar = ghProfile.avatarUrl;
      user.githubAccessToken = accessToken;
      user.isGithubConnected = true;
      await user.save();

      return res.redirect(`${config.clientUrl}/repositories?github=connected`);
    }

    // 5. Case B: User is signing in or registering via GitHub
    let user = await User.findOne({
      $or: [
        { githubId: ghProfile.id },
        ...(ghProfile.email ? [{ email: ghProfile.email.toLowerCase() }] : [])
      ]
    }).select("+githubAccessToken");

    if (user) {
      user.githubId = ghProfile.id;
      user.githubUsername = ghProfile.username;
      user.githubAvatar = ghProfile.avatarUrl;
      user.githubAccessToken = accessToken;
      user.isGithubConnected = true;
      if (!user.avatar) user.avatar = ghProfile.avatarUrl;
      await user.save();
    } else {
      // Create new user for GitHub OAuth login
      const generatedEmail = ghProfile.email
        ? ghProfile.email.toLowerCase()
        : `${ghProfile.username.toLowerCase()}@users.noreply.github.com`;

      user = await User.create({
        name: ghProfile.name || ghProfile.username,
        email: generatedEmail,
        password: crypto.randomBytes(32).toString("hex"),
        organization: `${ghProfile.username}'s Team`,
        role: "developer",
        avatar: ghProfile.avatarUrl,
        githubId: ghProfile.id,
        githubUsername: ghProfile.username,
        githubAvatar: ghProfile.avatarUrl,
        githubAccessToken: accessToken,
        isGithubConnected: true
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    return res.redirect(`${config.clientUrl}/login?oauth_token=${token}&redirect=${encodeURIComponent(targetRedirect)}`);
  } catch (error) {
    console.error("[GitHub OAuth Callback Error]:", error);
    return res.redirect(`${config.clientUrl}/login?github_error=unexpected`);
  }
};

/**
 * @route   GET /api/auth/users
 * @desc    Get list of all users and their assigned roles (Admin only)
 * @access  Private/Admin
 */
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/auth/users/:id/role
 * @desc    Update a user's role (Admin only)
 * @access  Private/Admin
 */
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const allowedRoles = ["admin", "architect", "developer", "guest"];

    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles: ${allowedRoles.join(", ")}`
      });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    // Safety check: Prevent demoting the last active Admin user
    if (targetUser.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot demote the last remaining Admin user in the system."
        });
      }
    }

    targetUser.role = role;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `User ${targetUser.email} role updated to ${role}.`,
      user: targetUser
    });
  } catch (error) {
    next(error);
  }
};

