import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  FileCode,
  Sparkles,
  ArrowRight,
  XCircle,
  FilePlus,
  FileEdit,
  History,
  Lock,
  Eye,
  Check,
  RefreshCw,
  Radio,
  Activity
} from "lucide-react";
import { agentApi } from "../../services/api";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

const SUGGESTED_GOALS = [
  "Add forgot password functionality",
  "Implement rate limiting middleware",
  "Add JWT refresh token rotation",
  "Add user audit logging service"
];

export default function AgentModePanel({ repositoryId, repositoryName }) {
  const [goalPrompt, setGoalPrompt] = useState("");
  const [session, setSession] = useState(null);
  const [pastSessions, setPastSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [expandedDiffs, setExpandedDiffs] = useState({});

  // Realtime Streaming State
  const [liveProgress, setLiveProgress] = useState(null);
  const [streamStatus, setStreamStatus] = useState("idle"); // "idle" | "connected" | "streaming" | "fallback"
  const [recentEvents, setRecentEvents] = useState([]);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (repositoryId) {
      loadPastSessions();
    }
    return () => {
      closeEventStream();
    };
  }, [repositoryId]);

  // Connect or disconnect SSE stream based on active session status
  useEffect(() => {
    if (session?._id && !["applied", "rejected"].includes(session.status)) {
      initEventStream(session._id);
    } else {
      closeEventStream();
    }
    return () => {
      closeEventStream();
    };
  }, [session?._id, session?.status]);

  const closeEventStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setStreamStatus("idle");
    }
  };

  const initEventStream = (sessionId) => {
    closeEventStream();

    try {
      setStreamStatus("connected");
      const es = agentApi.createEventStream(sessionId, {
        onOpen: () => {
          setStreamStatus("streaming");
        },
        onEvent: (event) => {
          if (!event) return;

          // Record recent live event
          setRecentEvents((prev) => [
            { id: event.id, type: event.type, timestamp: event.timestamp, message: event.progress?.message || event.type },
            ...prev.slice(0, 6)
          ]);

          if (event.progress) {
            setLiveProgress(event.progress);
          }

          // Handle task payload updates
          if (event.payload?.session) {
            setSession(event.payload.session);
          }

          if (event.type === "task.completed") {
            setStreamStatus("connected");
            if (event.progress?.phase === "plan_ready") {
              setToastMessage("Implementation plan ready for review.");
            } else if (event.progress?.phase === "changes_ready") {
              setToastMessage("Proposed code changes generated and diff preview ready.");
            } else if (event.progress?.phase === "applied") {
              setToastMessage("Proposed changes applied safely.");
            }
            loadPastSessions();
          } else if (event.type === "task.failed" || event.type === "task.cancelled") {
            setStreamStatus("idle");
            if (event.payload?.reason) {
              setToastMessage(`Task update: ${event.payload.reason}`);
            }
          }
        },
        onError: () => {
          // Graceful fallback: mark streaming as fallback, don't crash UI
          setStreamStatus("fallback");
        }
      });

      eventSourceRef.current = es;
    } catch {
      setStreamStatus("fallback");
    }
  };

  const loadPastSessions = async () => {
    try {
      const res = await agentApi.listSessions({ repositoryId, limit: 5 });
      if (res.success && res.sessions) {
        setPastSessions(res.sessions);
      }
    } catch {
      // Non-blocking
    }
  };

  const handleStartPlanning = async (customPrompt) => {
    const promptToUse = customPrompt || goalPrompt;
    if (!promptToUse || !promptToUse.trim()) return;

    setLoading(true);
    setError(null);
    setLiveProgress({ percent: 15, message: "Initializing autonomous agent and analyzing AST...", phase: "planning" });

    try {
      const res = await agentApi.createPlan({
        repositoryId,
        goalPrompt: promptToUse.trim()
      });

      if (res.success && res.session) {
        setSession(res.session);
        setToastMessage("Implementation plan synthesized. Awaiting your approval.");
        loadPastSessions();
      } else {
        setError(res.message || "Failed to create implementation plan.");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to initialize Agent session.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!session?._id) return;
    setSubmittingAction(true);
    setError(null);
    setLiveProgress({ percent: 20, message: "Synthesizing code changes and verifying AST safeguards...", phase: "diff_generation" });

    try {
      const res = await agentApi.approvePlan(session._id);
      if (res.success && res.session) {
        setSession(res.session);
        // Expand all diffs by default
        const initExpanded = {};
        res.session.proposedChanges.forEach((_, idx) => {
          initExpanded[idx] = true;
        });
        setExpandedDiffs(initExpanded);
        setToastMessage("Proposed code changes generated and diff preview ready.");
        loadPastSessions();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to generate proposed code.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!session?._id) return;
    if (!window.confirm("Apply all proposed changes to the project? Backup snapshots will be saved.")) {
      return;
    }

    setSubmittingAction(true);
    setError(null);
    setLiveProgress({ percent: 40, message: "Creating reversible backup snapshots and applying diffs...", phase: "applying" });

    try {
      const res = await agentApi.applyChanges(session._id);
      if (res.success && res.session) {
        setSession(res.session);
        setToastMessage("Changes safely applied! Backup snapshot preserved.");
        loadPastSessions();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to apply changes.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async (reason) => {
    if (!session?._id) return;
    setSubmittingAction(true);
    setError(null);
    try {
      const res = await agentApi.rejectChanges(session._id, reason || "User rejected proposed changes");
      if (res.success && res.session) {
        setSession(res.session);
        setToastMessage("Changes discarded. Project files remain 100% untouched.");
        loadPastSessions();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to reject changes.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const toggleDiffExpand = (idx) => {
    setExpandedDiffs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const renderDiffLines = (diffText) => {
    if (!diffText) return <span className="text-slate-500">// No content differences</span>;

    return diffText.split("\n").map((line, i) => {
      let lineStyle = "text-slate-400";
      let bgStyle = "";

      if (line.startsWith("+") && !line.startsWith("+++")) {
        lineStyle = "text-emerald-400";
        bgStyle = "bg-emerald-500/10";
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        lineStyle = "text-rose-400";
        bgStyle = "bg-rose-500/10";
      } else if (line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++")) {
        lineStyle = "text-sky-400 font-semibold";
        bgStyle = "bg-sky-500/5";
      }

      return (
        <div key={i} className={`px-3 py-0.5 font-mono text-xs ${lineStyle} ${bgStyle}`}>
          {line || " "}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-300 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>Agent Error: </strong> {error}
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Hero Banner: AI Agent Mode */}
      <Card className="bg-gradient-to-r from-[#0C101A] via-[#101726] to-[#0C101A] border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Bot className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <span>Devra Autonomous Agent Mode</span>
                <Badge variant="cyan" size="sm">Human-in-the-Loop</Badge>
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Provide a high-level feature request or refactoring goal. Devra will analyze the repository, synthesize an implementation plan, show diffs, and await your approval before applying changes.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Non-destructive &bull; Reversible</span>
          </div>
        </div>

        {/* Safeguard Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Silent Edits</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reversible Snapshots</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Secrets Injected</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>User Explicit Approval</span>
          </div>
        </div>
      </Card>

      {/* Goal Input Section */}
      <Card className="bg-[#0C101A] border-slate-800 space-y-4">
        <div>
          <label className="text-xs font-bold font-mono text-white block mb-1">
            DEVELOPMENT REQUEST / FEATURE GOAL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={goalPrompt}
              onChange={(e) => setGoalPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartPlanning()}
              placeholder="e.g., Add forgot password functionality, or Add JWT refresh token rotation"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900/90 border border-slate-700 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
            />
            <Button
              onClick={() => handleStartPlanning()}
              variant="primary"
              size="md"
              isLoading={loading}
              icon={Sparkles}
              disabled={!goalPrompt.trim()}
            >
              Start Agent
            </Button>
          </div>
        </div>

        {/* Suggested chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-mono text-slate-500">Suggested:</span>
          {SUGGESTED_GOALS.map((sug, i) => (
            <button
              key={i}
              onClick={() => {
                setGoalPrompt(sug);
                handleStartPlanning(sug);
              }}
              disabled={loading}
              className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-sky-300 transition-colors"
            >
              + {sug}
            </button>
          ))}
        </div>
      </Card>

      {/* Active Session Display */}
      {session && (
        <div className="space-y-6">
          {/* Real-time Streaming Progress HUD */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    streamStatus === "streaming" ? "bg-emerald-400" : streamStatus === "connected" ? "bg-sky-400" : "bg-amber-400"
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    streamStatus === "streaming" ? "bg-emerald-500" : streamStatus === "connected" ? "bg-sky-500" : "bg-amber-500"
                  }`} />
                </span>
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-sky-400" />
                  <span>Real-time Stream: {streamStatus === "streaming" ? "Live SSE Active" : streamStatus === "fallback" ? "Polling Fallback" : "Connected"}</span>
                </span>
              </div>
              {liveProgress?.phase && (
                <Badge variant={liveProgress.phase === "applied" ? "emerald" : "cyan"} size="sm">
                  {liveProgress.phase.toUpperCase()}
                </Badge>
              )}
            </div>

            {liveProgress?.message && (
              <div className="text-xs text-sky-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0 animate-pulse" />
                <span className="truncate">{liveProgress.message}</span>
              </div>
            )}

            {liveProgress?.percent !== undefined && (
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-500 to-emerald-400 h-1.5 transition-all duration-300 ease-out"
                  style={{ width: `${liveProgress.percent}%` }}
                />
              </div>
            )}
          </div>

          {/* Progress Timeline Stepper */}
          <div className="p-4 rounded-xl bg-[#0C101A] border border-slate-800 flex items-center justify-between text-xs font-mono">
            {[
              { num: 1, label: "Repo Analysis", done: true },
              { num: 2, label: "Planning", done: !!session.plan },
              { num: 3, label: "User Approval", done: session.status !== "plan_ready" },
              { num: 4, label: "Diff Preview", done: ["changes_ready", "applied", "rejected"].includes(session.status) },
              { num: 5, label: "Applied / Safe", done: session.status === "applied" }
            ].map((step, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.done
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                  }`}
                >
                  {step.done ? "✓" : step.num}
                </span>
                <span className={step.done ? "text-slate-200" : "text-slate-500"}>{step.label}</span>
                {idx < 4 && <ArrowRight className="w-3.5 h-3.5 text-slate-700 hidden sm:block mx-1" />}
              </div>
            ))}
          </div>

          {/* PHASE 1: Plan Review Card */}
          {session.plan && (
            <Card className="bg-[#0C101A] border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold font-mono text-white">Synthesized Implementation Plan</h3>
                    <Badge
                      variant={
                        session.plan.estimatedRisk === "high"
                          ? "danger"
                          : session.plan.estimatedRisk === "medium"
                          ? "warning"
                          : "emerald"
                      }
                      size="sm"
                    >
                      Risk: {session.plan.estimatedRisk || "low"}
                    </Badge>
                    <Badge variant="cyan" size="sm">
                      Status: {session.status}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Goal: &ldquo;{session.goalPrompt}&rdquo;
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                {session.plan.summary}
              </div>

              {/* Affected Files */}
              <div>
                <span className="text-xs font-mono text-slate-400 block mb-1.5 font-semibold">
                  Affected Target Files ({session.plan.affectedFiles?.length || 0}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {session.plan.affectedFiles?.map((file, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-sky-400 flex items-center gap-1.5"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>{file}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Execution Steps */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-400 block font-semibold">
                  Step-by-Step Execution Sequence:
                </span>
                {session.plan.steps?.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white">
                        Step {step.stepNumber}: {step.title}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {step.filesToTouch?.length || 0} file(s)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{step.description}</p>
                    {step.safetyCheck && (
                      <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 pt-0.5">
                        <Shield className="w-3 h-3" />
                        <span>Safety check: {step.safetyCheck}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Plan Action Bar */}
              {session.status === "plan_ready" && (
                <div className="pt-3 border-t border-slate-800 flex items-center gap-3">
                  <Button
                    onClick={handleApprovePlan}
                    variant="primary"
                    size="md"
                    isLoading={submittingAction}
                    icon={CheckCircle2}
                  >
                    Approve Plan &amp; Generate Changes
                  </Button>
                  <Button
                    onClick={() => handleReject("User rejected plan")}
                    variant="secondary"
                    size="md"
                    disabled={submittingAction}
                    icon={XCircle}
                  >
                    Reject Plan
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* PHASE 2: Proposed Changes & Diff Preview */}
          {session.proposedChanges && session.proposedChanges.length > 0 && (
            <Card className="bg-[#0C101A] border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    <FileEdit className="w-4 h-4 text-sky-400" />
                    <span>Proposed Code Changes &amp; Diff Preview ({session.proposedChanges.length} files)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review generated modifications before writing to project. Changes are verified against AST safeguards.
                  </p>
                </div>

                <Badge
                  variant={
                    session.status === "applied"
                      ? "emerald"
                      : session.status === "rejected"
                      ? "danger"
                      : "cyan"
                  }
                  size="sm"
                >
                  {session.status.toUpperCase()}
                </Badge>
              </div>

              {/* Diffs List */}
              <div className="space-y-4">
                {session.proposedChanges.map((change, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-800 overflow-hidden bg-[#080B11]"
                  >
                    {/* Diff Header */}
                    <div
                      onClick={() => toggleDiffExpand(idx)}
                      className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-900 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 font-mono text-xs">
                        <Badge
                          variant={change.action === "create" ? "emerald" : "cyan"}
                          size="sm"
                        >
                          {change.action.toUpperCase()}
                        </Badge>
                        <span className="text-white font-semibold">{change.filePath}</span>
                        <span className="text-slate-500">&bull; {change.summary}</span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {expandedDiffs[idx] ? "Collapse ▲" : "Expand ▼"}
                      </span>
                    </div>

                    {/* Diff Content */}
                    {expandedDiffs[idx] && (
                      <div className="divide-y divide-slate-800/40 max-h-96 overflow-y-auto">
                        {renderDiffLines(change.diff)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Diff Decision Bar */}
              {session.status === "changes_ready" && (
                <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <Shield className="w-4 h-4" />
                    <span>Reversible snapshot will be stored in database before applying.</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleApplyChanges}
                      variant="primary"
                      size="md"
                      isLoading={submittingAction}
                      icon={Check}
                    >
                      Apply Changes to Project
                    </Button>
                    <Button
                      onClick={() => handleReject("User rejected diff preview")}
                      variant="secondary"
                      size="md"
                      disabled={submittingAction}
                      icon={XCircle}
                    >
                      Reject &amp; Discard
                    </Button>
                  </div>
                </div>
              )}

              {/* Status Outcome Banner */}
              {session.status === "applied" && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Proposed changes successfully applied! Original files backed up into snapshot.
                  </span>
                  <Button
                    onClick={() => {
                      setSession(null);
                      setGoalPrompt("");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Start New Request
                  </Button>
                </div>
              )}

              {session.status === "rejected" && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    Request was rejected. Project files remain 100% untouched.
                  </span>
                  <Button
                    onClick={() => {
                      setSession(null);
                      setGoalPrompt("");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Start New Request
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Past Sessions History */}
      {pastSessions.length > 0 && (
        <Card className="bg-[#0C101A] border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold font-mono text-slate-400 flex items-center gap-1.5 uppercase">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Recent AI Agent Sessions ({pastSessions.length})</span>
            </h4>
          </div>

          <div className="divide-y divide-slate-800/60 font-mono text-xs">
            {pastSessions.map((s) => (
              <div
                key={s._id}
                onClick={() => setSession(s)}
                className="py-2.5 flex items-center justify-between hover:text-sky-300 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      s.status === "applied"
                        ? "emerald"
                        : s.status === "rejected"
                        ? "danger"
                        : "cyan"
                    }
                    size="sm"
                  >
                    {s.status}
                  </Badge>
                  <span className="text-slate-200 truncate max-w-md">{s.goalPrompt}</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {new Date(s.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
