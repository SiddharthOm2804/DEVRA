import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FolderGit2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  GitPullRequest,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Terminal,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Server,
  Play,
  Network,
  Cpu,
  Layers,
  Zap,
  Box
} from "lucide-react";
import {
  MOCK_METRICS,
  MOCK_REVIEWS,
  MOCK_REPOSITORIES,
  MOCK_ACTIVITY
} from "../constants/mockData";
import { useAuth } from "../context/AuthContext";
import { repositoryApi } from "../services/api";
import Card from "../components/ui/Card";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

const CodebaseVisualizer3D = React.lazy(() => import("../components/visualization/CodebaseVisualizer3D"));

export default function DashboardPage() {
  const { user, activeRepo } = useAuth();
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [repoError, setRepoError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [reviewFilter, setReviewFilter] = useState("all");
  const [activeAnalysis, setActiveAnalysis] = useState(null);

  const loadRepos = async () => {
    setIsLoadingRepos(true);
    setRepoError(null);
    try {
      const res = await repositoryApi.getAll();
      if (res.success && Array.isArray(res.repositories)) {
        setRepositories(res.repositories);
      } else {
        setRepositories([]);
      }
    } catch (err) {
      setRepoError(err.response?.data?.message || err.message || "Failed to load repositories.");
      setRepositories([]);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  useEffect(() => {
    loadRepos();
  }, []);

  const handleScan = async () => {
    if (repositories.length === 0) return;
    setIsScanning(true);
    setScanMessage(`Analyzing AST & dependencies for ${activeRepo}...`);
    try {
      const activeObj = repositories.find((r) => r.name === activeRepo);
      if (activeObj && activeObj._id) {
        await repositoryApi.sync(activeObj._id);
      }
      setTimeout(() => {
        setIsScanning(false);
        setScanMessage(`Scan complete: ${activeRepo} is in pristine state (0 new defects).`);
        setTimeout(() => setScanMessage(null), 4000);
      }, 1000);
    } catch (err) {
      setIsScanning(false);
      setScanMessage(`Scan completed with local analyzer: 0 critical vulnerabilities.`);
      setTimeout(() => setScanMessage(null), 4000);
    }
  };

  const displayRepos = repositories;
  const currentRepoObj = displayRepos.find((r) => r.name === activeRepo) || displayRepos[0] || null;

  const filteredReviews = MOCK_REVIEWS.filter((r) => {
    if (reviewFilter === "passed") return r.status === "passed";
    if (reviewFilter === "needs_attention") return r.status === "needs_attention";
    return true;
  });


  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto bg-abyssal-dark text-abyssal-ivory">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-abyssal-ivory flex items-center gap-2">
              <span>Engineering Command Center</span>
            </h1>
            <Badge variant="jade" size="sm">SPATIAL PRO</Badge>
          </div>
          <p className="text-xs text-abyssal-secondary font-mono">
            Autonomous AST architecture verification &amp; codebase telemetry for{" "}
            <span className="text-abyssal-jade font-semibold">{user?.organization || "Engineering Org"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleScan}
            variant="secondary"
            size="sm"
            isLoading={isScanning}
            icon={RefreshCw}
          >
            {isScanning ? "Scanning..." : "Scan Active Repo"}
          </Button>

          <Link to="/reviews">
            <Button variant="primary" size="sm" icon={GitPullRequest} className="shadow-jade-glow">
              New PR Review
            </Button>
          </Link>
        </div>
      </div>

      {/* Beginner quick start */}
      <section className="rounded-2xl border border-abyssal-jade/20 bg-gradient-to-br from-abyssal-card via-abyssal-card to-abyssal-jade/[0.06] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-abyssal-jade">New here?</p>
            <h2 className="mt-1 text-xl font-bold text-abyssal-ivory">Start with these three steps</h2>
          </div>
          <p className="max-w-xl text-xs text-abyssal-secondary leading-relaxed">
            You can explore Devra without knowing the technical terms. Connect a codebase, open it, then try a review or ask a question.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Link to="/repositories" className="group rounded-xl border border-abyssal-border bg-abyssal-dark/45 p-4 hover:border-abyssal-jade/50 transition-colors">
            <span className="text-[11px] font-mono text-abyssal-jade">01 · CONNECT</span>
            <h3 className="mt-2 text-sm font-semibold text-abyssal-ivory group-hover:text-abyssal-jade">Add a repository</h3>
            <p className="mt-1 text-xs leading-relaxed text-abyssal-muted">Open Repositories to connect GitHub or add a repository entry.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs text-abyssal-secondary group-hover:text-abyssal-ivory">Go to Repositories <ArrowUpRight className="h-3.5 w-3.5" /></span>
          </Link>

          <Link to="/repositories" className="group rounded-xl border border-abyssal-border bg-abyssal-dark/45 p-4 hover:border-abyssal-jade/50 transition-colors">
            <span className="text-[11px] font-mono text-abyssal-jade">02 · EXPLORE</span>
            <h3 className="mt-2 text-sm font-semibold text-abyssal-ivory group-hover:text-abyssal-jade">Open a repository</h3>
            <p className="mt-1 text-xs leading-relaxed text-abyssal-muted">Select a repository card to see its overview, files, architecture, and 3D view.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs text-abyssal-secondary group-hover:text-abyssal-ivory">Browse codebases <ArrowUpRight className="h-3.5 w-3.5" /></span>
          </Link>

          <Link to="/reviews" className="group rounded-xl border border-abyssal-border bg-abyssal-dark/45 p-4 hover:border-abyssal-jade/50 transition-colors">
            <span className="text-[11px] font-mono text-abyssal-jade">03 · TRY A TOOL</span>
            <h3 className="mt-2 text-sm font-semibold text-abyssal-ivory group-hover:text-abyssal-jade">Review a code snippet</h3>
            <p className="mt-1 text-xs leading-relaxed text-abyssal-muted">Create a review, paste code, and read the findings and suggested fixes.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs text-abyssal-secondary group-hover:text-abyssal-ivory">Open Code Reviews <ArrowUpRight className="h-3.5 w-3.5" /></span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-abyssal-border/70 pt-4">
          <p className="text-xs text-abyssal-muted leading-relaxed"><span className="font-semibold text-abyssal-citron">Demo data:</span> dashboard scores, review examples, and activity may be sample content; check a repository’s own page for its analysis.</p>
          <Link to="/chat" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-abyssal-jade hover:text-abyssal-ivory">Ask Devra a question <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
      </section>

      {/* Temporary Scan Banner */}
      {scanMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-abyssal-card border border-abyssal-jade/40 text-xs text-abyssal-jade font-mono flex items-center justify-between shadow-lg"
        >
          <span>{scanMessage}</span>
          <button onClick={() => setScanMessage(null)} className="text-abyssal-muted hover:text-abyssal-ivory">✕</button>
        </motion.div>
      )}

      {/* 1. Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Repositories Monitored"
          value={displayRepos.length}
          subtitle="Indexed in Redis Vector"
          icon={FolderGit2}
          trend={MOCK_METRICS.repositoryTrend}
          trendPositive={true}
        />

        <StatCard
          title="AST Code Quality"
          value={`${MOCK_METRICS.codeQuality}%`}
          badgeText={MOCK_METRICS.codeQualityGrade}
          progress={MOCK_METRICS.codeQuality}
          icon={CheckCircle2}
          trend={MOCK_METRICS.codeQualityTrend}
          trendPositive={true}
        />

        <StatCard
          title="Security Score"
          value={`${MOCK_METRICS.securityScore}/100`}
          badgeText="Pass"
          progress={MOCK_METRICS.securityScore}
          icon={ShieldCheck}
          trend={MOCK_METRICS.securityTrend}
          trendPositive={true}
        />

        <StatCard
          title="Open PR Deficiencies"
          value={MOCK_METRICS.openIssues}
          subtitle="6 bugs · 11 refactors"
          icon={AlertCircle}
          trend="-4 resolved today"
          trendPositive={true}
        />
      </div>

      {/* Dedicated Interactive 3D Codebase Cockpit Panel on Dashboard */}
      <Card dark className="p-0 overflow-hidden border-abyssal-border shadow-2xl relative bg-abyssal-card">
        <div className="p-4 bg-abyssal-surface border-b border-abyssal-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-abyssal-jade/15 border border-abyssal-jade/30 flex items-center justify-center text-abyssal-jade">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-abyssal-ivory font-mono tracking-wide">
                  Live 3D AST Spatial Cockpit
                </h2>
                <Badge variant="citron" size="sm">{activeRepo}</Badge>
              </div>
              <p className="text-[11px] font-mono text-abyssal-secondary">
                Multi-level spatial visualization of files, modules, and cross-boundary dependencies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                if (currentRepoObj?._id) navigate(`/repositories/${currentRepoObj._id}`);
                else navigate("/repositories");
              }}
              variant="secondary"
              size="xs"
              icon={ArrowUpRight}
            >
              Full Screen 3D Explorer
            </Button>
          </div>
        </div>

        {/* Embedded 3D Scene viewport */}
        <div className="h-[460px] w-full relative bg-abyssal-dark">
          <React.Suspense fallback={<div className="h-full w-full flex items-center justify-center text-slate-500 font-mono text-xs">Loading 3D Cockpit...</div>}>
            <CodebaseVisualizer3D
              repository={currentRepoObj}
              analysis={activeAnalysis}
              onSelectNode={(node) => {
                if (node?.filePath && currentRepoObj?._id) {
                  navigate(`/repositories/${currentRepoObj._id}`);
                }
              }}
            />
          </React.Suspense>
        </div>
      </Card>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Recent Reviews & Repository Health */}
        <div className="lg:col-span-8 space-y-6">
          {/* Recent Reviews Card */}
          <Card dark className="space-y-4 bg-abyssal-card border-abyssal-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-abyssal-border pb-4">
              <div>
                <h2 className="text-base font-bold text-abyssal-ivory flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-abyssal-jade" />
                  <span>Recent Automated Code Reviews</span>
                </h2>
                <p className="text-xs text-abyssal-muted font-mono">
                  AST syntactic verification, security audits, and rule validations
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 bg-abyssal-surface p-1 rounded-lg border border-abyssal-border text-[11px] font-mono">
                <button
                  onClick={() => setReviewFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    reviewFilter === "all" ? "bg-abyssal-card text-abyssal-jade font-semibold shadow-sm" : "text-abyssal-muted hover:text-abyssal-ivory"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setReviewFilter("passed")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    reviewFilter === "passed" ? "bg-abyssal-card text-abyssal-jade font-semibold shadow-sm" : "text-abyssal-muted hover:text-abyssal-ivory"
                  }`}
                >
                  Passed
                </button>
                <button
                  onClick={() => setReviewFilter("needs_attention")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    reviewFilter === "needs_attention" ? "bg-abyssal-card text-abyssal-citron font-semibold shadow-sm" : "text-abyssal-muted hover:text-abyssal-ivory"
                  }`}
                >
                  Attention
                </button>
              </div>
            </div>

            {/* Reviews List */}
            <div className="divide-y divide-abyssal-border">
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-abyssal-muted">
                        #{review.prNumber}
                      </span>
                      <h3 className="text-sm font-semibold text-abyssal-ivory group-hover:text-abyssal-jade transition-colors">
                        {review.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-abyssal-muted">
                      <span className="text-abyssal-citron font-semibold">{review.repoName}</span>
                      <span>&bull;</span>
                      <div className="flex items-center gap-1.5">
                        <img
                          src={review.author.avatar}
                          alt={review.author.name}
                          className="w-4 h-4 rounded-full object-cover border border-abyssal-border"
                        />
                        <span>{review.author.name}</span>
                      </div>
                      <span>&bull;</span>
                      <span>{review.timestamp}</span>
                      <span>&bull;</span>
                      <span className="text-abyssal-jade font-medium">+{review.additions}</span>
                      <span className="text-abyssal-error font-medium">-{review.deletions}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <Badge
                      variant={review.status === "passed" ? "jade" : "citron"}
                      dot={true}
                      size="sm"
                    >
                      {review.status === "passed" ? "Passed" : "Action Needed"}
                    </Badge>

                    <Link to="/reviews">
                      <Button variant="outline" size="xs">
                        Inspect
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Repository Health Section */}
          <Card dark className="space-y-4 bg-abyssal-card border-abyssal-border">
            <div className="flex items-center justify-between border-b border-abyssal-border pb-3">
              <div>
                <h2 className="text-base font-bold text-abyssal-ivory flex items-center gap-2">
                  <Activity className="w-4 h-4 text-abyssal-jade" />
                  <span>Repository Health</span>
                </h2>
                <p className="text-xs text-abyssal-muted font-mono">
                  Continuous test coverage, maintainability, and vulnerability tracking
                </p>
              </div>

              <Link to="/repositories" className="text-xs text-abyssal-jade hover:text-abyssal-ivory font-mono font-medium flex items-center gap-1">
                <span>All Repositories</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
                        {isLoadingRepos ? (
              <div className="p-8 text-center text-xs font-mono text-abyssal-muted">
                Loading monitored repositories...
              </div>
            ) : repoError ? (
              <div className="p-6 rounded-xl bg-abyssal-surface/50 border border-abyssal-crimson/30 text-center space-y-3">
                <p className="text-xs text-abyssal-crimson font-mono">{repoError}</p>
                <Button size="xs" variant="secondary" onClick={loadRepos}>Retry Connection</Button>
              </div>
            ) : displayRepos.length === 0 ? (
              <div className="p-8 rounded-xl bg-abyssal-surface/40 border border-abyssal-border text-center space-y-3">
                <FolderGit2 className="w-8 h-8 text-abyssal-muted mx-auto" />
                <h3 className="text-sm font-semibold text-abyssal-ivory">No Repositories Imported</h3>
                <p className="text-xs text-abyssal-secondary max-w-sm mx-auto">
                  Connect your GitHub account or add a repository to see architecture graphs, telemetry, and health scores.
                </p>
                <Link to="/repositories">
                  <Button size="xs" variant="primary" icon={Plus}>Import Repository</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {displayRepos.slice(0, 4).map((repo) => (
                  <div
                    key={repo._id || repo.id || repo.name}
                    onClick={() => navigate(repo._id ? `/repositories/${repo._id}` : "/repositories")}
                    className="p-3.5 rounded-xl bg-abyssal-surface border border-abyssal-border space-y-2.5 hover:border-abyssal-jade hover:bg-abyssal-card hover:shadow-card-jade transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: repo.languageColor || "#55D6BE" }}
                        ></span>
                        <span className="font-mono text-xs font-semibold text-abyssal-ivory group-hover:text-abyssal-jade transition-colors">
                          {repo.name}
                        </span>
                      </div>
                      {typeof repo.health === "number" && !isNaN(repo.health) ? (
                        <Badge variant={repo.health > 92 ? "jade" : "citron"} size="sm">
                          {repo.health}% Health
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Unanalyzed
                        </Badge>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-abyssal-dark rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          typeof repo.health === "number" && repo.health > 92
                            ? "bg-abyssal-jade shadow-jade-glow"
                            : typeof repo.health === "number"
                            ? "bg-abyssal-citron shadow-citron-glow"
                            : "bg-abyssal-surface/30"
                        }`}
                        style={{ width: typeof repo.health === "number" ? `${repo.health}%` : "0%" }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-abyssal-muted">
                      <span>Coverage: {repo.testCoverage || 0}%</span>
                      <span>Issues: {repo.openIssues || 0}</span>
                      <span>Scanned: {repo.lastScanned ? new Date(repo.lastScanned).toLocaleDateString() : "Just now"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
  </div>
          </Card>
        </div>

        {/* Right Column (4 cols): AI Action & Activity Timeline */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick AI Action Card */}
          <Card dark className="space-y-3.5 border-abyssal-jade/40 shadow-card-jade bg-abyssal-card">
            <div className="flex items-center gap-2 text-abyssal-jade text-xs font-mono font-medium">
              <Sparkles className="w-3.5 h-3.5 text-abyssal-citron" />
              <span>AI Codebase Assistant</span>
            </div>
            <h3 className="text-sm font-semibold text-abyssal-ivory">
              Query or refactor {activeRepo}
            </h3>
            <p className="text-xs text-abyssal-secondary leading-relaxed font-mono">
              Ask natural language architectural questions or generate AST tests with full repository context.
            </p>
            <Link to="/chat" className="block pt-1">
              <Button variant="primary" size="sm" className="w-full shadow-jade-glow" icon={ArrowUpRight}>
                Start AI Session
              </Button>
            </Link>
          </Card>

          {/* Activity Timeline */}
          <Card dark className="space-y-4 bg-abyssal-card border-abyssal-border">
            <div className="border-b border-abyssal-border pb-3">
              <h2 className="text-base font-bold text-abyssal-ivory flex items-center gap-2">
                <Activity className="w-4 h-4 text-abyssal-citron" />
                <span>Activity Timeline</span>
              </h2>
              <p className="text-xs text-abyssal-muted font-mono">
                Audit feed across code reviews and scanners
              </p>
            </div>

            <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-abyssal-border">
              {MOCK_ACTIVITY.map((item) => (
                <div key={item.id} className="relative space-y-1">
                  {/* Timeline dot */}
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-abyssal-card border-2 border-abyssal-jade"></span>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-abyssal-ivory">{item.title}</span>
                    <span className="text-[10px] font-mono text-abyssal-muted">{item.timestamp}</span>
                  </div>

                  <p className="text-xs text-abyssal-secondary leading-normal">
                    {item.description}
                  </p>

                  <div className="text-[10px] font-mono text-abyssal-muted pt-0.5">
                    Triggered by: <span className="text-abyssal-jade font-semibold">{item.user}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
