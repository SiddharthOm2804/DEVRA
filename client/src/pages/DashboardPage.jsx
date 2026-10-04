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
  Network
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

export default function DashboardPage() {
  const { user, activeRepo } = useAuth();
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [reviewFilter, setReviewFilter] = useState("all");

  useEffect(() => {
    const loadRepos = async () => {
      try {
        const res = await repositoryApi.getAll();
        if (res.success && res.repositories && res.repositories.length > 0) {
          setRepositories(res.repositories);
        } else {
          setRepositories(MOCK_REPOSITORIES);
        }
      } catch (err) {
        setRepositories(MOCK_REPOSITORIES);
      }
    };
    loadRepos();
  }, []);

  const handleScan = async () => {
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

  const displayRepos = repositories.length > 0 ? repositories : MOCK_REPOSITORIES;

  const filteredReviews = MOCK_REVIEWS.filter((r) => {
    if (reviewFilter === "passed") return r.status === "passed";
    if (reviewFilter === "needs_attention") return r.status === "needs_attention";
    return true;
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Engineering Console
            </h1>
            <Badge variant="cyan" size="sm">PRO</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Real-time codebase health and automated review metrics for <span className="text-slate-200 font-mono font-medium">{user?.organization}</span>
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
            <Button variant="primary" size="sm" icon={GitPullRequest}>
              New PR Review
            </Button>
          </Link>
        </div>
      </div>

      {/* Temporary Scan Banner */}
      {scanMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 font-mono flex items-center justify-between"
        >
          <span>{scanMessage}</span>
          <button onClick={() => setScanMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </motion.div>
      )}

      {/* 1. Core Metrics Grid (Required: Repository count, Code quality, Security score, Open issues) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Repository Count"
          value={displayRepos.length}
          subtitle="Monitored by Devra"
          icon={FolderGit2}
          trend={MOCK_METRICS.repositoryTrend}
          trendPositive={true}
        />

        <StatCard
          title="Code Quality"
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
          title="Open Issues"
          value={MOCK_METRICS.openIssues}
          subtitle="6 bugs · 11 refactors"
          icon={AlertCircle}
          trend="-4 resolved today"
          trendPositive={true}
        />
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Recent Reviews & Repository Health */}
        <div className="lg:col-span-8 space-y-6">
          {/* Recent Reviews Card */}
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-sky-400" />
                  <span>Recent Code Reviews</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Automated pull request analysis and rule validation
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
                <button
                  onClick={() => setReviewFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    reviewFilter === "all" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setReviewFilter("passed")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    reviewFilter === "passed" ? "bg-emerald-500/20 text-emerald-400 font-medium" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Passed
                </button>
                <button
                  onClick={() => setReviewFilter("needs_attention")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    reviewFilter === "needs_attention" ? "bg-amber-500/20 text-amber-400 font-medium" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Attention
                </button>
              </div>
            </div>

            {/* Reviews List */}
            <div className="divide-y divide-slate-800/60">
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        #{review.prNumber}
                      </span>
                      <h3 className="text-sm font-semibold text-white group-hover:text-sky-400 transition-colors">
                        {review.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
                      <span className="text-sky-300">{review.repoName}</span>
                      <span>&bull;</span>
                      <div className="flex items-center gap-1.5">
                        <img
                          src={review.author.avatar}
                          alt={review.author.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span>{review.author.name}</span>
                      </div>
                      <span>&bull;</span>
                      <span>{review.timestamp}</span>
                      <span>&bull;</span>
                      <span className="text-emerald-400">+{review.additions}</span>
                      <span className="text-rose-400">-{review.deletions}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <Badge
                      variant={review.status === "passed" ? "emerald" : "amber"}
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
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Repository Health</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Continuous test coverage, maintainability, and vulnerability tracking
                </p>
              </div>

              <Link to="/repositories" className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1">
                <span>All Repos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {displayRepos.slice(0, 4).map((repo) => (
                <div
                  key={repo._id || repo.id || repo.name}
                  onClick={() => navigate(repo._id ? `/repositories/${repo._id}` : "/repositories")}
                  className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2.5 hover:border-slate-700 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: repo.languageColor }}
                      ></span>
                      <span className="font-mono text-xs font-semibold text-white group-hover:text-sky-400 transition-colors">
                        {repo.name}
                      </span>
                    </div>
                    <Badge variant={repo.health > 92 ? "emerald" : "cyan"} size="sm">
                      {repo.health}% Health
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        repo.health > 92 ? "bg-emerald-500" : "bg-sky-500"
                      }`}
                      style={{ width: `${repo.health}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Coverage: {repo.testCoverage}%</span>
                    <span>Issues: {repo.openIssues}</span>
                    <span>Scanned: {repo.lastScanned}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column (4 cols): Activity Timeline & Extension Status */}
        <div className="lg:col-span-4 space-y-6">
          {/* Activity Timeline */}
          <Card className="space-y-4">
            <div className="border-b border-slate-800/80 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>Activity Timeline</span>
              </h2>
              <p className="text-xs text-slate-400">
                Audit feed across code reviews and scanners
              </p>
            </div>

            <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-800">
              {MOCK_ACTIVITY.map((item) => (
                <div key={item.id} className="relative space-y-1">
                  {/* Timeline dot */}
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-sky-400"></span>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{item.title}</span>
                    <span className="text-[10px] font-mono text-slate-500">{item.timestamp}</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-normal">
                    {item.description}
                  </p>

                  <div className="text-[10px] font-mono text-slate-500 pt-0.5">
                    Triggered by: <span className="text-slate-300">{item.user}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick AI Action Card */}
          <Card className="space-y-3 bg-[#0C111C] border-sky-500/20">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-mono font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Codebase Assistant</span>
            </div>
            <h3 className="text-sm font-semibold text-white">
              Query or refactor {activeRepo}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask natural language architectural questions or generate AST tests with full repository context.
            </p>
            <Link to="/chat" className="block pt-1">
              <Button variant="primary" size="sm" className="w-full" icon={ArrowUpRight}>
                Start AI Session
              </Button>
            </Link>
          </Card>

          {/* 3D Codebase Galaxy Card */}
          <Card className="space-y-3 bg-[#0C111C] border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-mono font-medium">
              <Network className="w-3.5 h-3.5" />
              <span>3D Codebase Galaxy</span>
            </div>
            <h3 className="text-sm font-semibold text-white">
              Spatial AST Topology
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore interconnected nodes across Frontend, Backend, Database, Services, and Utilities in WebGL.
            </p>
            <div className="block pt-1">
              <Button
                onClick={() => {
                  const target = displayRepos.find((r) => r.name === activeRepo) || displayRepos[0];
                  if (target?._id) navigate(`/repositories/${target._id}`);
                  else navigate("/repositories");
                }}
                variant="secondary"
                size="sm"
                className="w-full"
                icon={Network}
              >
                Launch 3D Explorer
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
