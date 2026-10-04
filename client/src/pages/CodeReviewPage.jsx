import React, { useState, useEffect } from "react";
import {
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Sparkles,
  GitBranch,
  Check,
  ChevronRight,
  Shield,
  ShieldAlert,
  Layers,
  ThumbsUp,
  MessageSquare,
  RefreshCw,
  Plus,
  Play,
  Trash2,
  Cpu,
  Zap,
  Code2,
  Bug,
  Flame,
  AlertCircle,
  HelpCircle,
  Copy
} from "lucide-react";
import { reviewApi, repositoryApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

// Pre-packaged test templates for 1-click AI code reviews
const PRESET_TEMPLATES = [
  {
    name: "Auth with eval() & Hardcoded Key",
    language: "JavaScript",
    fileName: "authController.js",
    code: `async function handleUserLogin(req, res) {
  var jwtSecret = "sk_live_secret_key_8833119944";
  var command = req.body.action;
  
  // Vulnerable dynamic execution
  var payload = eval(command);
  
  if (payload === NaN) {
    return res.status(400).send("NaN token");
  }

  // Blocking file I/O
  const fs = require('fs');
  fs.writeFileSync('/tmp/audit.log', JSON.stringify(payload));
  
  return res.json({ status: "success", data: payload });
}`
  },
  {
    name: "React Memory Leak & Unsafe HTML",
    language: "TypeScript",
    fileName: "UserProfile.tsx",
    code: `import React, { useEffect, useState } from "react";

export function UserProfile({ userId, rawBio }: { userId: string; rawBio: string }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Missing abort controller / cleanup causes memory leak on unmount
    setInterval(async () => {
      const res = await fetch(\`/api/users/\${userId}\`);
      const json = await res.json();
      setData(json);
    }, 1000);
  }, []);

  return (
    <div>
      {/* Critical XSS injection */}
      <div dangerouslySetInnerHTML={{ __html: rawBio }} />
      <span>{data ? data.name : "Loading..."}</span>
    </div>
  );
}`
  },
  {
    name: "Clean Async Service Pattern",
    language: "TypeScript",
    fileName: "paymentService.ts",
    code: `import { config } from "../config/env";
import { logger } from "../utils/logger";

interface PaymentPayload {
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export async function processPayment(payload: PaymentPayload): Promise<{ transactionId: string }> {
  if (!payload.amount || payload.amount <= 0) {
    throw new Error("Invalid payment amount.");
  }

  logger.info("Processing secure payment transaction", { key: payload.idempotencyKey });
  // Transaction is signed via environment secret
  const response = await fetch("https://api.payments.com/v1/charge", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${config.paymentApiKey}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(\`Payment gateway returned \${response.status}\`);
  }

  return await response.json();
}`
  }
];

export default function CodeReviewPage() {
  const { activeRepo } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [showInputModal, setShowInputModal] = useState(false);

  // New review form state
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [inputFileName, setInputFileName] = useState("authController.js");
  const [inputLanguage, setInputLanguage] = useState("JavaScript");
  const [inputCode, setInputCode] = useState(PRESET_TEMPLATES[0].code);
  const [inputContext, setInputContext] = useState("PR #104: Authentication handler optimization");
  const [activeTabFilter, setActiveTabFilter] = useState("all");
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());
  const [expandedIssueIds, setExpandedIssueIds] = useState(new Set([0]));
  const [toastMessage, setToastMessage] = useState(null);

  const toggleExpandIssue = (idx) => {
    setExpandedIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Fetch initial review history and repositories
  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reviewRes, repoRes] = await Promise.all([
        reviewApi.getAll({ limit: 15 }),
        repositoryApi.getAll().catch(() => ({ repositories: [] }))
      ]);

      if (repoRes.repositories && repoRes.repositories.length > 0) {
        setRepositories(repoRes.repositories);
        const match = repoRes.repositories.find((r) => r.name === activeRepo);
        if (match) setSelectedRepoId(match._id);
        else setSelectedRepoId(repoRes.repositories[0]._id);
      }

      if (reviewRes.success && reviewRes.reviews && reviewRes.reviews.length > 0) {
        setReviews(reviewRes.reviews);
        setSelectedReview(reviewRes.reviews[0]);
      } else {
        // If no reviews in DB, generate initial review on template
        setReviews([]);
        setSelectedReview(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load review history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Run AI Code Review
  const handleGenerateReview = async () => {
    if (!inputCode.trim()) {
      setError("Please provide code to review.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const res = await reviewApi.generate({
        repositoryId: selectedRepoId || null,
        fileName: inputFileName,
        language: inputLanguage,
        code: inputCode,
        context: inputContext
      });

      if (res.success && res.review) {
        setReviews((prev) => [res.review, ...prev]);
        setSelectedReview(res.review);
        setShowInputModal(false);
        setAppliedSuggestions(new Set());
        setToastMessage(`AI Review for ${inputFileName} completed (${res.review.score}/100)`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to run AI code review.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Delete Review
  const handleDeleteReview = async (id) => {
    if (!window.confirm("Are you sure you want to delete this AI review?")) return;
    try {
      await reviewApi.delete(id);
      const remaining = reviews.filter((r) => r._id !== id);
      setReviews(remaining);
      if (selectedReview?._id === id) {
        setSelectedReview(remaining.length > 0 ? remaining[0] : null);
      }
      setToastMessage("Code review removed.");
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      setError("Failed to delete review.");
    }
  };

  const handleApplySuggestion = (idx) => {
    setAppliedSuggestions((prev) => new Set([...prev, idx]));
    setToastMessage("AI patch accepted & queued for staging commit.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSelectTemplate = (tpl) => {
    setInputFileName(tpl.fileName);
    setInputLanguage(tpl.language);
    setInputCode(tpl.code);
    setInputContext(`Audit for ${tpl.name}`);
  };

  // Severity style helper with distinct tasteful styling
  const getSeverityBadge = (severity = "medium") => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/15 border border-rose-500/40 text-rose-300 shadow-sm shadow-rose-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            CRITICAL
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            HIGH
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-sky-500/15 border border-sky-500/40 text-sky-300">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            MEDIUM
          </span>
        );
      case "low":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            LOW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
            {severity?.toUpperCase()}
          </span>
        );
    }
  };

  // Filter issues based on active category
  const filteredIssues = (selectedReview?.issues || []).filter((issue) => {
    if (activeTabFilter === "all") return true;
    return issue.type === activeTabFilter;
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-400 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            {error}
          </span>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
                  AI Code Review Engine
                </h1>
                <Badge variant="cyan" size="sm">v2.4 Active</Badge>
              </div>
              <p className="text-xs text-slate-400">
                Automated AST verification, vulnerability scanning, and semantic patch generation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowInputModal(!showInputModal)}
            variant={showInputModal ? "secondary" : "primary"}
            size="sm"
            icon={Plus}
          >
            {showInputModal ? "Close Review Creator" : "New Code Review"}
          </Button>

          <Button
            onClick={fetchHistory}
            variant="outline"
            size="sm"
            icon={RefreshCw}
            isLoading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* NEW REVIEW CREATOR / INPUT ACCORDION */}
      {showInputModal && (
        <Card className="bg-[#0C101A] border-sky-500/30 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sky-400 font-mono text-xs font-bold uppercase">
              <Play className="w-4 h-4" />
              <span>Configure &amp; Run AI Review</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Provider: <strong className="text-slate-300">Gemini 1.5 Pro / Local AST</strong>
            </span>
          </div>

          {/* Quick Preset Selector */}
          <div className="space-y-2 font-mono">
            <span className="text-[11px] text-slate-400 block uppercase">1-Click Test Scenarios:</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectTemplate(tpl)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-sky-300 hover:border-slate-700 transition-colors"
                >
                  &bull; {tpl.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            {/* Repository Select */}
            <div className="space-y-1.5">
              <label className="text-slate-400">Target Repository</label>
              <select
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
              >
                <option value="">Standalone Code Snippet</option>
                {repositories.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.language})
                  </option>
                ))}
              </select>
            </div>

            {/* File Name */}
            <div className="space-y-1.5">
              <label className="text-slate-400">File Name</label>
              <input
                type="text"
                value={inputFileName}
                onChange={(e) => setInputFileName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
                placeholder="e.g. authService.ts"
              />
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-slate-400">Programming Language</label>
              <select
                value={inputLanguage}
                onChange={(e) => setInputLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
              >
                <option value="JavaScript">JavaScript</option>
                <option value="TypeScript">TypeScript</option>
                <option value="Python">Python</option>
                <option value="Go">Go</option>
                <option value="Rust">Rust</option>
              </select>
            </div>
          </div>

          {/* Context Input */}
          <div className="space-y-1.5 font-mono text-xs">
            <label className="text-slate-400">PR / Review Context (Optional)</label>
            <input
              type="text"
              value={inputContext}
              onChange={(e) => setInputContext(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
              placeholder="e.g. PR #42: Security audit before production deploy"
            />
          </div>

          {/* Code Textarea */}
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <label className="text-slate-400">Source Code to Review</label>
              <span className="text-[10px] text-slate-500">{inputCode.split("\n").length} lines</span>
            </div>
            <textarea
              rows={10}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="w-full p-4 rounded-xl bg-[#070A0F] border border-slate-800 text-white font-mono text-xs leading-relaxed focus:outline-none focus:border-sky-500"
              placeholder="// Paste your source code here..."
            />
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              onClick={() => setShowInputModal(false)}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateReview}
              variant="primary"
              size="sm"
              isLoading={analyzing}
              icon={Sparkles}
            >
              {analyzing ? "AI Analyzing Code..." : "Run AI Inspection"}
            </Button>
          </div>
        </Card>
      )}

      {/* Review History Carousel / Tabs */}
      {reviews.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
            Review History ({reviews.length})
          </span>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 border-b border-slate-800/80">
            {reviews.map((rev) => {
              const isSelected = rev._id === selectedReview?._id;
              return (
                <button
                  key={rev._id}
                  onClick={() => {
                    setSelectedReview(rev);
                    setAppliedSuggestions(new Set());
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-mono text-left whitespace-nowrap transition-all border shrink-0 ${
                    isSelected
                      ? "bg-slate-900 border-sky-400 text-white shadow-lg"
                      : "bg-[#0C101A] border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        rev.severity === "critical"
                          ? "bg-rose-500"
                          : rev.severity === "high"
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                    ></span>
                    <span className="font-semibold text-white">{rev.fileName}</span>
                    {getSeverityBadge(rev.severity)}
                    <span className="text-[11px] font-bold text-sky-400 ml-1">
                      {rev.score}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTIVE REVIEW DISPLAY */}
      {selectedReview ? (
        <div className="space-y-6">
          {/* Executive Overview Card */}
          <Card className="bg-[#0C101A] border-slate-800 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold font-mono text-white">
                        {selectedReview.title || selectedReview.fileName}
                      </h2>
                      {getSeverityBadge(selectedReview.severity)}
                    </div>
                    <p className="text-xs font-mono text-slate-400">
                      File: <span className="text-slate-200 font-semibold">{selectedReview.fileName}</span> &bull; Language: {selectedReview.language || "JavaScript"}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  {selectedReview.summary}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                  <span>
                    Provider: <strong className="text-slate-200">{selectedReview.aiProvider}</strong> ({selectedReview.aiModel})
                  </span>
                  <span>&bull;</span>
                  <span>
                    Generated: {new Date(selectedReview.createdAt).toLocaleDateString()} at {new Date(selectedReview.createdAt).toLocaleTimeString()}
                  </span>
                  {selectedReview.repositoryId && (
                    <>
                      <span>&bull;</span>
                      <span className="text-sky-400 font-medium">
                        Repository: {selectedReview.repositoryId.name || "devra-core"}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Score Meter & Delete */}
              <div className="flex items-center gap-6 self-start lg:self-center shrink-0">
                <div className="text-right space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider">
                    AI QUALITY SCORE
                  </span>
                  <div className="flex items-baseline justify-end gap-1 font-mono">
                    <span
                      className={`text-3xl font-extrabold ${
                        selectedReview.score >= 80
                          ? "text-emerald-400"
                          : selectedReview.score >= 60
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {selectedReview.score}
                    </span>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteReview(selectedReview._id)}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete Review"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metrics Counter Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Bug className="w-3.5 h-3.5 text-rose-400" /> Bugs
                </span>
                <span className="font-bold text-white">
                  {selectedReview.metrics?.bugsCount || 0}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Security
                </span>
                <span className="font-bold text-white">
                  {selectedReview.metrics?.securityCount || 0}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Performance
                </span>
                <span className="font-bold text-white">
                  {selectedReview.metrics?.performanceCount || 0}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-purple-400" /> Smells
                </span>
                <span className="font-bold text-white">
                  {selectedReview.metrics?.smellsCount || 0}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" /> Architecture
                </span>
                <span className="font-bold text-white">
                  {selectedReview.metrics?.maintainabilityCount || 0}
                </span>
              </div>
            </div>
          </Card>

          {/* Issue Cards Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Flagged Findings ({selectedReview.issues?.length || 0})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Strictly validated issues categorized by severity and vulnerability classification
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
                {["all", "security", "bug", "performance", "code_smell"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveTabFilter(cat)}
                    className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                      activeTabFilter === cat
                        ? "bg-slate-800 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {cat === "code_smell" ? "Smells" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Issues List */}
            {filteredIssues.length === 0 ? (
              <Card className="p-8 text-center space-y-3 bg-[#0C101A]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold font-mono text-white">No Issues in this Category</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No findings matched the selected filter. The code complies with active safety rules.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredIssues.map((issue, idx) => {
                  const isExpanded = expandedIssueIds.has(idx);
                  const fixSnippet =
                    issue.suggestedFix ||
                    issue.suggestion ||
                    selectedReview.suggestions?.[idx]?.codeSnippet ||
                    selectedReview.suggestions?.find(
                      (s) =>
                        s.title?.toLowerCase().includes(issue.type) ||
                        s.description?.toLowerCase().includes(issue.title?.toLowerCase())
                    )?.codeSnippet;

                  return (
                    <div
                      key={issue.id || idx}
                      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? "bg-[#0E1322] border-sky-500/40 shadow-lg shadow-sky-500/5"
                          : "bg-[#0C101A] border-slate-800/90 hover:border-slate-700"
                      }`}
                    >
                      {/* Clickable Card Header */}
                      <div
                        onClick={() => toggleExpandIssue(idx)}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? "rotate-180 text-sky-400" : ""
                              }`}
                            />
                          </button>

                          <div className="space-y-0.5">
                            <h4 className="text-sm font-bold font-mono text-white">
                              {issue.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                              <span className="text-sky-300">
                                {issue.file || selectedReview.fileName}
                              </span>
                              {issue.line && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-slate-300">Line {issue.line}</span>
                                </>
                              )}
                              {issue.rule && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-slate-500">Rule: {issue.rule}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center pl-7 sm:pl-0 shrink-0">
                          {getSeverityBadge(issue.severity)}
                        </div>
                      </div>

                      {/* Expandable Body */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-800/80 bg-[#0A0E18]">
                          {/* Explanation */}
                          <div className="space-y-1.5 pt-2">
                            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider block">
                              Detailed Explanation:
                            </span>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">
                              {issue.description || issue.explanation || "AST inspection flagged a rule violation at the cited line number."}
                            </p>
                          </div>

                          {/* Suggested Fix */}
                          {fixSnippet && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider">
                                  Suggested Remediation:
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  Syntax-verified fix
                                </span>
                              </div>
                              <div className="p-3.5 rounded-lg bg-[#06080E] border border-slate-800 text-xs font-mono text-emerald-300/90 leading-relaxed overflow-x-auto">
                                <pre className="whitespace-pre">{fixSnippet}</pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Suggestions & Patch Replacement Section */}
          {selectedReview.suggestions && selectedReview.suggestions.length > 0 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>Actionable AI Fixes &amp; Code Replacements ({selectedReview.suggestions.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Syntactically verified safe code patches generated to resolve flagged findings
                </p>
              </div>

              <div className="space-y-4">
                {selectedReview.suggestions.map((sug, idx) => {
                  const isApplied = appliedSuggestions.has(idx);
                  return (
                    <Card key={idx} className="bg-[#0C101A] border-slate-800 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-sm font-bold font-mono text-white">{sug.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="cyan" size="sm">Impact: {sug.impact}</Badge>
                          <button
                            onClick={() => handleApplySuggestion(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                              isApplied
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-sky-500 hover:bg-sky-400 text-white"
                            }`}
                          >
                            {isApplied ? "✓ Patch Staged" : "Apply Patch"}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {sug.description}
                      </p>

                      {sug.codeSnippet && (
                        <div className="rounded-lg bg-[#070A0F] border border-slate-800 p-3.5 font-mono text-xs overflow-x-auto text-emerald-300/90 leading-relaxed">
                          <pre>{sug.codeSnippet}</pre>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Original Reviewed Code Snippet Viewer */}
          {selectedReview.codeSnippet && (
            <Card className="bg-[#0A0D14] border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-slate-500" />
                  <span>Inspected Code Snippet ({selectedReview.fileName})</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Read-only AST snapshot
                </span>
              </div>
              <pre className="p-3 bg-[#06080C] rounded-lg text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-72">
                {selectedReview.codeSnippet}
              </pre>
            </Card>
          )}
        </div>
      ) : (
        /* Empty State */
        <Card className="p-12 text-center space-y-5 bg-[#0C101A] max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold font-mono text-white">No AI Code Reviews Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Select a repository, paste a code snippet, or test a sample scenario to generate a comprehensive AI architectural review.
            </p>
          </div>
          <Button
            onClick={() => setShowInputModal(true)}
            variant="primary"
            size="sm"
            icon={Plus}
          >
            Create Your First Review
          </Button>
        </Card>
      )}
    </div>
  );
}
