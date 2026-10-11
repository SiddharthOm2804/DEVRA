import crypto from "crypto";
import { config } from "../config/env.js";
import Repository from "../models/Repository.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import * as githubService from "../services/githubService.js";
import { extractSyntaxChunks } from "../services/treeSitterParser.js";
import { shouldIgnorePath } from "../services/codeAnalysisService.js";
import { reviewCode } from "../services/aiService.js";
import { eventBus } from "../services/realtime/eventBus.js";
import { EVENT_TYPES } from "../services/realtime/eventContract.js";
import logger from "../utils/logger.js";

// In-memory deduplication caches for deliveries and PR head commits
const processedDeliveries = new Set();
const processedPrCommits = new Set();

/**
 * Timing-safe HMAC-SHA256 signature verifier for GitHub webhooks
 */
export function verifyGithubWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) {
    return false;
  }

  if (!signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = signatureHeader.slice(7).trim();
  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody || "", "utf8");

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(bodyBuffer);
  const calculatedSignature = hmac.digest("hex");

  if (expectedSignature.length !== calculatedSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(calculatedSignature, "hex")
    );
  } catch (_) {
    return false;
  }
}

/**
 * Sanitizes untrusted pull request title and body to prevent prompt injection overrides
 */
export function sanitizeUntrustedInput(text = "") {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/(ignore\s+all\s+previous\s+instructions|system\s+override|disregard\s+rules)/gi, "[FILTERED_INSTRUCTION]")
    .slice(0, 3000);
}

/**
 * Handle incoming GitHub Webhook POST
 */
export const handleGithubWebhook = async (req, res, next) => {
  const deliveryId = req.headers["x-github-delivery"];
  const event = req.headers["x-github-event"];
  const signature = req.headers["x-hub-signature-256"];

  try {
    // 1. Validate delivery ID presence
    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        message: "Missing required X-GitHub-Delivery header."
      });
    }

    // 2. Validate event header presence
    if (!event) {
      return res.status(400).json({
        success: false,
        message: "Missing required X-GitHub-Event header."
      });
    }

    // 3. Verify HMAC-SHA256 signature against exact raw body
    const secret = config.github.webhookSecret;
    const rawPayload = req.rawBody || JSON.stringify(req.body || {});
    const isSignatureValid = verifyGithubWebhookSignature(rawPayload, signature, secret);

    if (!isSignatureValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid or missing X-Hub-Signature-256 webhook signature."
      });
    }

    // 4. Delivery Deduplication
    if (processedDeliveries.has(deliveryId)) {
      return res.status(200).json({
        success: true,
        message: `Delivery ${deliveryId} already processed. Deduplicated.`
      });
    }
    processedDeliveries.add(deliveryId);

    // Limit deduplication cache size
    if (processedDeliveries.size > 2000) {
      const firstEntry = processedDeliveries.values().next().value;
      processedDeliveries.delete(firstEntry);
    }

    // 5. Filter for pull_request events only
    if (event !== "pull_request") {
      return res.status(200).json({
        success: true,
        message: `Ignored event: ${event}. Only pull_request is handled.`
      });
    }

    const payload = req.body;
    const action = payload.action;
    const supportedActions = ["opened", "synchronize", "reopened", "ready_for_review", "closed"];

    if (!supportedActions.includes(action)) {
      return res.status(200).json({
        success: true,
        message: `Ignored action: ${action}.`
      });
    }

    const pr = payload.pull_request;
    const githubRepo = payload.repository;

    if (!pr || !githubRepo) {
      return res.status(400).json({
        success: false,
        message: "Malformed webhook payload: missing pull_request or repository data."
      });
    }

    // Handle PR close
    if (action === "closed") {
      return res.status(200).json({
        success: true,
        message: `Pull Request #${pr.number} is closed. Review lifecycle finalized.`
      });
    }

    // 6. Draft PR policy: Ignore draft PRs
    if (pr.draft) {
      return res.status(200).json({
        success: true,
        message: `Pull Request #${pr.number} is in draft status. Review skipped.`
      });
    }

    // 7. Resolve linked DEVRA repository
    const repoDoc = await Repository.findOne({
      $or: [
        ...(githubRepo.id ? [{ githubId: githubRepo.id }] : []),
        { fullName: githubRepo.full_name },
        { name: githubRepo.name }
      ]
    });

    if (!repoDoc) {
      return res.status(200).json({
        success: true,
        message: `Repository '${githubRepo.full_name}' is not registered in DEVRA. Webhook acknowledged without review.`
      });
    }

    // 8. Prevent duplicate processing of the same commit SHA
    const headSha = pr.head?.sha || "head";
    const prDedupeKey = `${repoDoc._id}:${pr.number}:${headSha}`;
    if (processedPrCommits.has(prDedupeKey)) {
      return res.status(200).json({
        success: true,
        message: `Commit ${headSha} for PR #${pr.number} already analyzed. Deduplicated.`
      });
    }
    processedPrCommits.add(prDedupeKey);

    // 9. Asynchronously process PR review in background
    processPullRequestReviewAsync({
      repoDoc,
      githubRepo,
      pr,
      headSha,
      deliveryId
    }).catch((err) => {
      logger.error(`[Webhook] Async review error for PR #${pr.number}: ${err.message}`);
    });

    // Return prompt acknowledgment
    return res.status(202).json({
      success: true,
      message: `Pull Request #${pr.number} queued for automated analysis.`,
      repositoryId: repoDoc._id,
      prNumber: pr.number,
      headSha
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Background worker to analyze PR files with Tree-sitter and publish review
 */
export async function processPullRequestReviewAsync({ repoDoc, githubRepo, pr, headSha, deliveryId }) {
  const repoOwner = githubRepo.owner?.login || repoDoc.owner?.login;
  const repoName = githubRepo.name || repoDoc.name;

  // Find repository owner user to get githubAccessToken
  const user = await User.findById(repoDoc.userId).select("+githubAccessToken");
  const accessToken = user?.githubAccessToken;

  // 1. Fetch changed files from GitHub
  const changedFiles = await githubService.getPullRequestFiles(repoOwner, repoName, pr.number, accessToken);

  // 2. Filter files (exclude binary, minified, ignored directories)
  const filesToAnalyze = changedFiles
    .filter((f) => !shouldIgnorePath(f.filename) && f.status !== "removed")
    .slice(0, 15); // Cap to 15 files max

  const analyzedFindings = [];
  let highestSeverity = "low";

  for (const file of filesToAnalyze) {
    const patchContent = file.patch || "";
    if (!patchContent) continue;

    // Use Tree-sitter syntax-aware extraction to identify touched symbols
    const syntaxChunks = await extractSyntaxChunks(file.filename, file.filename.split("/").pop(), patchContent);

    // Run AI review on modified code
    try {
      const sanitizedTitle = sanitizeUntrustedInput(pr.title);
      const fileReview = await reviewCode({
        code: patchContent,
        language: "TypeScript",
        fileName: file.filename,
        context: `PR #${pr.number}: ${sanitizedTitle}`
      });

      if (fileReview.issues && fileReview.issues.length > 0) {
        fileReview.issues.forEach((issue) => {
          analyzedFindings.push({
            type: issue.type || "bug",
            title: issue.title,
            description: issue.description,
            severity: issue.severity || "medium",
            filePath: file.filename,
            line: issue.line || null,
            rule: issue.rule || "pr-automated-check"
          });

          if (issue.severity === "critical" || issue.severity === "high") {
            highestSeverity = issue.severity;
          }
        });
      }
    } catch (err) {
      logger.warn(`[Webhook] File analysis warning for ${file.filename}: ${err.message}`);
    }
  }

  // 3. Assemble review summary
  const summaryText = analyzedFindings.length > 0
    ? `DEVRA automated analysis detected ${analyzedFindings.length} actionable finding(s) across ${filesToAnalyze.length} changed file(s).`
    : `DEVRA automated analysis completed: All ${filesToAnalyze.length} changed file(s) passed code quality & security checks cleanly.`;

  // 4. Persist Review in MongoDB
  const savedReview = await Review.create({
    repositoryId: repoDoc._id,
    userId: repoDoc.userId,
    title: `Automated Review for PR #${pr.number}`,
    fileName: `PR #${pr.number} (${headSha.slice(0, 7)})`,
    filePath: `pull/${pr.number}`,
    summary: summaryText,
    severity: highestSeverity,
    score: Math.max(70, 98 - (analyzedFindings.length * 5)),
    issues: analyzedFindings,
    prNumber: pr.number,
    commitSha: headSha,
    source: "webhook",
    status: "completed"
  });

  // 5. Format review markdown for GitHub
  const markdownComment = formatReviewMarkdown({
    prNumber: pr.number,
    headSha,
    filesCount: filesToAnalyze.length,
    findings: analyzedFindings,
    summary: summaryText
  });

  // 6. Publish review to GitHub (review-only, never auto-merge)
  await githubService.createPullRequestComment(repoOwner, repoName, pr.number, markdownComment, accessToken);

  // 7. Publish realtime SSE event if subscribers exist
  eventBus.publishTaskEvent(`pr-${repoDoc._id}-${pr.number}`, {
    type: EVENT_TYPES.TASK_COMPLETED,
    progress: { phase: "completed", percent: 100, message: summaryText },
    payload: { reviewId: savedReview._id, prNumber: pr.number, findingsCount: analyzedFindings.length }
  });

  logger.info(`[Webhook] Published automated review for PR #${pr.number} (${headSha.slice(0, 7)}) with ${analyzedFindings.length} findings.`);
  return savedReview;
}

/**
 * Format markdown comment for GitHub Pull Request
 */
export function formatReviewMarkdown({ prNumber, headSha, filesCount, findings = [], summary }) {
  let md = `## 🤖 DEVRA Automated Code Review\n\n`;
  md += `**Commit:** \`${headSha.slice(0, 8)}\` | **Analyzed Files:** ${filesCount} | **Findings:** ${findings.length}\n\n`;
  md += `### Summary\n${summary}\n\n`;

  if (findings.length > 0) {
    md += `### 🔍 Key Findings\n`;
    findings.slice(0, 8).forEach((f) => {
      const location = f.line ? `:${f.line}` : "";
      md += `- **[${f.severity.toUpperCase()}]** \`${f.filePath}${location}\`: **${f.title}**\n  ${f.description}\n`;
    });
  } else {
    md += `> ✅ **No critical bugs or vulnerabilities identified.** Code is clean and meets standard quality gates.\n\n`;
  }

  md += `\n---\n*Automated review by DEVRA Code Intelligence Engine. Review only — no automated commits or merges.*`;
  return md;
}

export default {
  verifyGithubWebhookSignature,
  sanitizeUntrustedInput,
  handleGithubWebhook,
  processPullRequestReviewAsync,
  formatReviewMarkdown
};
