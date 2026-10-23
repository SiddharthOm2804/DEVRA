import crypto from "crypto";
import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";
import { config } from "../config/env.js";
import * as githubService from "../services/githubService.js";
import { emailService } from "../services/emailService.js";
import { ticketStore } from "../utils/ticketStore.js";

const encodeGithubOAuthState = (payload) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", config.jwt.secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
};

const decodeGithubOAuthState = (state) => {
  if (typeof state !== "string") return null;
  const [encodedPayload, signature, ...extra] = state.split(".");
  if (!encodedPayload || !signature || extra.length) return null;

  const expected = crypto.createHmac("sha256", config.jwt.secret).update(encodedPayload).digest();
  let actual;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload || !["login", "connect"].includes(payload.mode)) return null;
    if (!Number.isFinite(payload.issuedAt) || Date.now() - payload.issuedAt > 10 * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
};

const safeGithubRedirect = (redirect, fallback) =>
  typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.includes("\\")
    ? redirect
    : fallback;

const createGithubOAuthState = ({ mode, redirect, userId }) => encodeGithubOAuthState({
  mode: mode === "connect" ? "connect" : "login",
  redirect: safeGithubRedirect(redirect, mode === "connect" ? "/repositories" : "/dashboard"),
  userId: userId || null,
  issuedAt: Date.now(),
  nonce: crypto.randomBytes(16).toString("hex")
});

/**
 * @route   POST /api/auth/register
 * @desc    Create an account and sign the user in
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, organization } = req.body;

    // 1. Validation: Required fields
    if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim() || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password."
      });
    }

    // 2. Validation: Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    // 3. Validation: Password strength
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 6 and 128 characters long."
      });
    }

    // 4. Check for existing user
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email address already exists."
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      organization: typeof organization === "string" && organization.trim()
        ? organization.trim()
        : "Devra Engineering"
    });

    const token = generateToken({ id: user._id, email: user.email, role: user.role });
    return res.status(201).json({
      success: true,
      message: "Your account has been created successfully.",
      token,
      user
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists."
      });
    }
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
      return res.status(404).json({
        success: false,
        code: "ACCOUNT_NOT_FOUND",
        message: "No account exists for this email address. Taking you to registration."
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
    const { clientId, clientSecret } = config.github;

    if (!clientId || !clientSecret) {
      return res.status(200).json({
        success: true,
        configured: false,
        message: "GitHub OAuth credentials are not configured in environment.",
        url: null
      });
    }

    const state = createGithubOAuthState({ mode, redirect, userId: req.user?._id });
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
    const { clientId, clientSecret } = config.github;
    const returnBase = mode === "connect" ? "/repositories" : "/login";

    if (!clientId || !clientSecret) {
      return res.redirect(`${config.clientUrl}${returnBase}?github_error=not_configured`);
    }

    const state = createGithubOAuthState({ mode, redirect, userId });
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

    const parsedState = decodeGithubOAuthState(state);
    if (!parsedState) {
      return res.redirect(`${config.clientUrl}/login?github_error=invalid_state`);
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

    // F-009: Instead of leaking long-lived reusable bearer token in URL query parameter,
    // issue a short-lived (60s) single-use exchange ticket
    const ticket = ticketStore.createTicket({ token, userId: user._id.toString() }, 60 * 1000);

    return res.redirect(`${config.clientUrl}/login?ticket=${ticket}&redirect=${encodeURIComponent(targetRedirect)}`);
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

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Generate password reset token and send instructions
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email address."
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Prevent user enumeration: always return standard success message
    const genericResponse = {
      success: true,
      message: "If an account with that email exists, password reset instructions have been sent."
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Generate random 32-byte reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token using SHA-256 and save to database
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token expires in 15 minutes
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Construct reset URL for client
    const resetUrl = `${config.clientUrl}/reset-password/${resetToken}`;

    try {
      await emailService.sendPasswordReset({
        to: user.email,
        resetUrl,
        name: user.name
      });

      return res.status(200).json(genericResponse);
    } catch (err) {
      // Invalidate token if email dispatch encounters an unexpected error
      user.resetPasswordToken = null;
      user.resetPasswordExpire = null;
      await user.save({ validateBeforeSave: false });

      console.error("[ForgotPassword Error]:", err);
      return res.status(500).json({
        success: false,
        message: "Could not send password reset email at this time. Please try again later."
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Verify reset token & update user password
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required."
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long."
      });
    }

    // Hash provided raw token to compare against stored hash
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset token is invalid or has expired."
      });
    }

    // Set new password (pre-save hook hashes with bcrypt)
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    // Issue refreshed JWT token so user is safely authenticated
    const authToken = generateToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    res.status(200).json({
      success: true,
      message: "Password reset successful. You are now logged in.",
      token: authToken,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/exchange-ticket
 * @desc    Exchange a short-lived single-use ticket for the actual JWT token
 * @access  Public
 */
export const exchangeTicket = async (req, res, next) => {
  try {
    const { ticket } = req.body;
    if (!ticket) {
      return res.status(400).json({
        success: false,
        message: "Exchange ticket is required."
      });
    }

    const payload = ticketStore.consumeTicket(ticket);
    if (!payload || !payload.token) {
      return res.status(401).json({
        success: false,
        message: "Invalid, expired, or already-used exchange ticket."
      });
    }

    // Verify token remains valid
    let decoded;
    try {
      decoded = verifyToken(payload.token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "The session associated with this ticket has expired or is invalid."
      });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User associated with this ticket no longer exists."
      });
    }

    return res.status(200).json({
      success: true,
      token: payload.token,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/stream-ticket
 * @desc    Issue a short-lived single-use ticket for opening an EventSource / SSE connection
 * @access  Private
 */
export const createStreamTicket = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization header with Bearer token is required."
      });
    }
    const token = authHeader.split(" ")[1];

    // Single-use stream ticket valid for 60 seconds
    const ticket = ticketStore.createTicket({ token, userId: req.user._id.toString() }, 60 * 1000);

    return res.status(200).json({
      success: true,
      ticket,
      expiresIn: 60
    });
  } catch (error) {
    next(error);
  }
};

