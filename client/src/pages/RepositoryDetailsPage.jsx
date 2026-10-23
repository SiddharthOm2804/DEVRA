import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FolderGit2,
  GitBranch,
  Star,
  GitFork,
  ExternalLink,
  Shield,
  Activity,
  FileCode,
  RefreshCw,
  Trash2,
  Sparkles,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Check,
  Lock,
  Globe,
  Boxes,
  Layers,
  Code2,
  Terminal,
  Cpu,
  PackageCheck,
  Network,
  Share2,
  ChevronRight,
  Bot
} from "lucide-react";
import { repositoryApi, analysisApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import CodebaseVisualizer3D from "../components/visualization/CodebaseVisualizer3D";
import AgentModePanel from "../components/agent/AgentModePanel";

const SOURCE_CODE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "go", "rs", "java",
  "cpp", "cc", "c", "h", "hpp", "cs", "rb", "php", "swift", "kt",
  "css", "scss", "sass", "sql", "sh", "bash"
]);

const countNonBlankLines = (content) => content
  .replace(/^\uFEFF/, "")
  .split(/\r\n|\n|\r/)
  .filter((line) => line.trim().length > 0).length;

export default function RepositoryDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeRepo, setActiveRepo } = useAuth();

  const [repo, setRepo] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [browserLineCount, setBrowserLineCount] = useState(null);
  const [browserLineCountStatus, setBrowserLineCountStatus] = useState("idle");
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "modules" | "dependencies" | "files"
  const [toastMessage, setToastMessage] = useState(null);

  const fetchRepoAndAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const [repoRes, analysisRes] = await Promise.all([
        repositoryApi.getById(id),
        analysisApi.get(id).catch(() => ({ success: false }))
      ]);

      if (repoRes.success && repoRes.repository) {
        setRepo(repoRes.repository);
      } else {
        setError("Repository could not be found.");
      }

      if (analysisRes.success && analysisRes.analysis) {
        setAnalysis(analysisRes.analysis);
      } else if (analysisRes.message) {
        setAnalysisError(analysisRes.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load repository details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepoAndAnalysis();
  }, [id]);

  useEffect(() => {
    if (!repo || !analysis || analysis.summary?.lineCountComplete) {
      setBrowserLineCount(null);
      setBrowserLineCountStatus("idle");
      return undefined;
    }

    if (repo.isPrivate || repo.visibility === "private") {
      setBrowserLineCountStatus("private");
      return undefined;
    }

    const sourceFiles = (analysis.files || []).filter((file) =>
      SOURCE_CODE_EXTENSIONS.has((file.extension || "").toLowerCase())
    );
    if (sourceFiles.length === 0) {
      setBrowserLineCount(0);
      setBrowserLineCountStatus("complete");
      return undefined;
    }

    let active = true;
    let nextIndex = 0;
    let total = 0;
    let complete = true;
    setBrowserLineCount(null);
    setBrowserLineCountStatus("loading");

    const countWorker = async () => {
      while (nextIndex < sourceFiles.length && active) {
        const file = sourceFiles[nextIndex++];
        const branch = (repo.defaultBranch || "main").split("/").map(encodeURIComponent).join("/");
        const path = file.path.split("/").map(encodeURIComponent).join("/");
        try {
          const response = await fetch(
            `https://raw.githubusercontent.com/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}/${branch}/${path}`,
            { credentials: "omit" }
          );
          if (!response.ok) {
            complete = false;
            continue;
          }
          total += countNonBlankLines(await response.text());
        } catch {
          complete = false;
        }
      }
    };

    Promise.all(Array.from({ length: Math.min(8, sourceFiles.length) }, countWorker)).then(() => {
      if (!active) return;
      if (complete) {
        setBrowserLineCount(total);
        setBrowserLineCountStatus("complete");
      } else {
        setBrowserLineCountStatus("unavailable");
      }
    });

    return () => { active = false; };
  }, [repo, analysis]);

  const handleRunAnalysis = async () => {
    if (!repo?._id) return;
    setAnalysisError(null);
    setAnalyzing(true);
    try {
      const res = await analysisApi.trigger(repo._id);
      if (res.success && res.analysis) {
        setAnalysis(res.analysis);
        setToastMessage("Codebase analysis completed and structured metadata saved.");
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        setAnalysisError(res.message || "Analysis did not return a result. Please try again.");
      }
    } catch (err) {
      setAnalysisError(err.response?.data?.message || err.message || "Failed to run codebase analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSync = async () => {
    if (!repo?._id) return;
    setSyncing(true);
    try {
      const res = await repositoryApi.sync(repo._id);
      if (res.success && res.repository) {
        setRepo(res.repository);
        setToastMessage("Repository synchronized successfully with latest commit telemetry.");
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      setError("Failed to sync repository.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove ${repo?.name} from your workspace?`)) {
      return;
    }
    setDeleting(true);
    try {
      await repositoryApi.delete(repo._id);
      navigate("/repositories");
    } catch (err) {
      setError("Failed to delete repository.");
      setDeleting(false);
    }
  };

  const handleSelectActive = () => {
    if (repo?.name) {
      setActiveRepo(repo.name);
      setToastMessage(`${repo.name} is now your active workspace codebase.`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-6 w-32 bg-slate-800 rounded animate-pulse"></div>
        <div className="h-32 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white font-mono">Repository Not Found</h2>
        <p className="text-xs text-slate-400">{error || "The requested repository does not exist or has been removed."}</p>
        <Link to="/repositories">
          <Button variant="secondary" size="sm" icon={ArrowLeft}>
            Back to Repositories
          </Button>
        </Link>
      </div>
    );
  }

  const isCurrentActive = activeRepo === repo.name;
  const isGithubRepository = Boolean(repo.githubId || repo.owner?.login);
  const fileTree = analysis
    ? (analysis.files || [])
    : (!isGithubRepository && repo.fileTree ? repo.fileTree : []);
  const hasAnalysis = Boolean(analysis);
  const hasFiles = fileTree.length > 0;

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {analysisError && (
        <div role="alert" className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
          <span>{analysisError}</span>
          <button onClick={() => setAnalysisError(null)} className="ml-3 text-rose-200 hover:text-white" aria-label="Dismiss analysis error">✕</button>
        </div>
      )}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {hasAnalysis && !hasFiles && (
        <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
          <h2 className="text-sm font-semibold">This repository is empty</h2>
          <p className="text-sm text-amber-800">GitHub returned no files for this branch. Push files to the repository, then use Sync and Analyze again.</p>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
        <Link to="/repositories" className="hover:text-brand-lavender flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Repositories</span>
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">{repo.name}</span>
      </div>

      {/* Main Repository Header Card */}
      <Card className="bg-white border-slate-200 shadow-card-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {repo.owner?.avatarUrl ? (
                <img
                  src={repo.owner.avatarUrl}
                  alt={repo.owner.login}
                  className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-brand-lavender">
                  <FolderGit2 className="w-5 h-5" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                    {repo.name}
                  </h1>
                  {isCurrentActive && (
                    <Badge variant="lavender" size="sm" dot>Active Workspace</Badge>
                  )}
                  {repo.isPrivate ? (
                    <Badge variant="neutral" size="sm" className="gap-1">
                      <Lock className="w-3 h-3 text-amber-500" />
                      <span>Private</span>
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm" className="gap-1">
                      <Globe className="w-3 h-3 text-emerald-600" />
                      <span>Public</span>
                    </Badge>
                  )}
                  {repo.githubId && (
                    <Badge variant="blue" size="sm">GitHub Synced</Badge>
                  )}
                </div>

                <p className="text-xs font-mono text-slate-500">
                  {repo.fullName || `${repo.owner?.login || "devra"}/${repo.name}`}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              {repo.description || "Continuous architecture and automated codebase intelligence enabled."}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: repo.languageColor || "#38bdf8" }}></span>
                {repo.language}
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                {repo.stars?.toLocaleString() || 0} stars
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <GitFork className="w-3.5 h-3.5 text-sky-400" />
                {repo.forks?.toLocaleString() || 0} forks
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                Branch: <strong className="text-white font-semibold">{repo.defaultBranch || repo.activeBranch || "main"}</strong>
              </span>
              {repo.url && (
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
                >
                  <span>View on GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
            {!isCurrentActive && (
              <Button onClick={handleSelectActive} variant="secondary" size="sm">
                Set as Active
              </Button>
            )}

            <Button
              onClick={handleRunAnalysis}
              variant="primary"
              size="sm"
              isLoading={analyzing}
              icon={Activity}
            >
              Analyze Codebase
            </Button>

            <Button
              onClick={() => setActiveTab("agent")}
              variant={activeTab === "agent" ? "primary" : "secondary"}
              size="sm"
              icon={Bot}
            >
              AI Agent Mode
            </Button>

            <Button
              onClick={() => setActiveTab("3d")}
              variant={activeTab === "3d" ? "primary" : "secondary"}
              size="sm"
              icon={Network}
            >
              3D Explorer
            </Button>

            <Button
              onClick={handleSync}
              variant="secondary"
              size="sm"
              isLoading={syncing}
              icon={RefreshCw}
            >
              Sync
            </Button>

            <Link to="/chat">
              <Button variant="outline" size="sm" icon={Sparkles}>
                Chat
              </Button>
            </Link>

            <Button
              onClick={handleDelete}
              variant="danger"
              size="sm"
              isLoading={deleting}
              icon={Trash2}
            >
              Remove
            </Button>
          </div>
        </div>
      </Card>

      {/* Analysis Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card-sm space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">TOTAL FILES</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {analysis?.summary?.repositoryFileCount ?? (analysis ? analysis.totalFiles : fileTree.length)}
            </span>
            <Badge variant="blue" size="sm">{hasAnalysis ? "Analyzed" : "Not analyzed"}</Badge>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">Files in the connected repository tree</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card-sm space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">TOTAL LINES OF CODE</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-600">
              {hasAnalysis && analysis.summary?.lineCountComplete && Number.isFinite(analysis.totalLines)
                ? analysis.totalLines.toLocaleString()
                : browserLineCountStatus === "complete"
                  ? browserLineCount.toLocaleString()
                  : "—"}
            </span>
            <span className="text-xs font-mono text-slate-500">LOC</span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            {browserLineCountStatus === "loading" ? "Counting non-blank source lines…"
              : browserLineCountStatus === "private" ? "Connect GitHub to count private source lines"
                : browserLineCountStatus === "unavailable" ? "GitHub did not return all source files"
                  : "Non-blank lines in source code files"}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card-sm space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">DETECTED MODULES</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold font-mono text-brand-lavender">
              {analysis?.modules?.length ?? 0}
            </span>
            <span className="text-xs font-mono text-slate-500">Packages</span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">Modular architecture clusters</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card-sm space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">DEPENDENCIES</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold font-mono text-amber-600">
              {analysis?.dependencies?.length ?? 0}
            </span>
            <span className="text-xs font-mono text-slate-500">Packages</span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            {analysis?.generatedAt ? `Last analyzed: ${new Date(analysis.generatedAt).toLocaleString()}` : "No analysis yet"}
          </p>
        </div>
      </div>

      {/* Analysis Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-4 text-xs font-mono overflow-x-auto pb-1">
        {[
          { id: "agent", label: "AI Agent Mode", icon: Bot },
          { id: "3d", label: "3D Spatial Graph", icon: Network },
          { id: "overview", label: "Architecture & Languages", icon: Layers },
          { id: "modules", label: "Detected Modules", icon: Boxes },
          { id: "dependencies", label: "Dependencies", icon: PackageCheck },
          { id: "files", label: "Source Files Tree", icon: FileCode }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-brand-lavender text-brand-lavender font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: AI Agent Mode */}
      {activeTab === "agent" && (
        <AgentModePanel repositoryId={repo._id} repositoryName={repo.name} />
      )}

      {/* TAB: 3D Codebase Explorer */}
      {activeTab === "3d" && hasFiles && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0C101A] p-4 rounded-xl border border-slate-800">
            <div>
              <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-sky-400" />
                <span>Spatial AST 3D Topology</span>
              </h2>
              <p className="text-xs text-slate-400">
                Explore the actual files and modules found in this repository.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleRunAnalysis}
                variant="outline"
                size="sm"
                isLoading={analyzing}
                icon={RefreshCw}
              >
                Re-Analyze AST
              </Button>
            </div>
          </div>

          <CodebaseVisualizer3D analysis={analysis} repo={repo} />
        </div>
      )}
      {activeTab === "3d" && !hasFiles && (
        <Card className="bg-white border-slate-200 p-8 text-center space-y-2">
          <Network className="w-8 h-8 mx-auto text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900">Nothing to visualize yet</h2>
          <p className="text-sm text-slate-500">This branch has no files, so there is no code graph to show.</p>
        </Card>
      )}

      {/* TAB 1: Architecture & Languages */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 3D Visualizer Banner */}
          <div
            onClick={() => setActiveTab("3d")}
            className="p-4 rounded-xl bg-gradient-to-r from-sky-500/10 via-purple-500/10 to-transparent border border-sky-500/20 hover:border-sky-500/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold font-mono text-white group-hover:text-sky-300 transition-colors">
                  Interactive 3D Codebase Galaxy
                </h4>
                <p className="text-xs text-slate-400">
                  {hasFiles ? "Explore the actual files and modules found in this repository." : "No code graph is available until this branch contains files."}
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm" icon={ChevronRight}>
              Launch 3D Explorer
            </Button>
          </div>

          {/* Language Breakdown */}
          <Card className="bg-white border-slate-200 shadow-card-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-mono text-slate-900 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-brand-lavender" />
                  <span>Programming Languages Distribution</span>
                </h3>
            <p className="text-xs text-slate-500">Calculated from files in the connected repository</p>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
              {(analysis?.languages || []).map((lang) => (
                <div
                  key={lang.name}
                  style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
                  title={`${lang.name}: ${lang.percentage}%`}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all"
                ></div>
              ))}
            </div>

            {/* Language Legend Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {(analysis?.languages || []).map((lang) => (
                <div key={lang.name} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lang.color }}></span>
                    <span className="text-xs font-bold text-slate-900 font-mono">{lang.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>{lang.percentage}%</span>
                    <span>{lang.fileCount} files</span>
                  </div>
                </div>
              ))}
            </div>
            {hasAnalysis && analysis.languages?.length === 0 && (
              <p className="text-sm text-slate-500">No languages detected because this branch has no files.</p>
            )}
          </Card>

          {/* Entry Points & Relationships */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border-slate-200 shadow-card-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold font-mono text-slate-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  <span>Detected Application Entry Points</span>
                </h3>
                <p className="text-xs text-slate-500">Executable bootstrap points and server listeners</p>
              </div>

              <div className="space-y-2">
                {(analysis?.entryPoints || []).map((ep, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCode className="w-4 h-4 text-brand-lavender" />
                      <span className="text-slate-900 font-medium">{ep.path}</span>
                    </div>
                    <Badge variant={ep.type === "server" ? "emerald" : "blue"} size="sm">
                      {ep.type}
                    </Badge>
                  </div>
                ))}
                {hasAnalysis && !analysis.entryPoints?.length && <p className="text-sm text-slate-500">No entry points were found in this repository.</p>}
              </div>
            </Card>

            <Card className="bg-white border-slate-200 shadow-card-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold font-mono text-slate-900 flex items-center gap-2">
                  <Network className="w-4 h-4 text-brand-lavender" />
                  <span>Architectural Layer Linkages</span>
                </h3>
                <p className="text-xs text-slate-500">Inter-module data flow and dependencies</p>
              </div>

              <div className="space-y-2 font-mono text-xs">
                {(analysis?.relationships || []).map((rel, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <span className="text-blue-700 font-semibold">{rel.from}</span>
                    <span className="text-[11px] text-slate-600 uppercase px-2 py-0.5 rounded bg-slate-200/80">
                      &rarr; {rel.type} &rarr;
                    </span>
                    <span className="text-emerald-700 font-semibold">{rel.to}</span>
                  </div>
                ))}
                {hasAnalysis && !analysis.relationships?.length && <p className="font-sans text-sm text-slate-500">No architectural relationships can be inferred without source files.</p>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: Modules Grid */}
      {activeTab === "modules" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(analysis?.modules || []).map((mod, idx) => (
            <Card key={idx} className="bg-[#0C101A] border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-sky-400" />
                  <h4 className="text-sm font-bold font-mono text-white">{mod.name}</h4>
                </div>
                <Badge variant="neutral" size="sm">{mod.fileCount} files</Badge>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">
                {mod.description || `Module located at ${mod.path}`}
              </p>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{mod.path}</span>
                <span className="text-slate-300">{mod.primaryLanguage}</span>
              </div>
            </Card>
          ))}
          {hasAnalysis && !analysis.modules?.length && <Card className="md:col-span-2 lg:col-span-3 bg-white border-slate-200 text-sm text-slate-500">No modules found because this repository has no tracked files.</Card>}
        </div>
      )}

      {/* TAB 3: Dependencies */}
      {activeTab === "dependencies" && (
        <Card className="bg-[#0C101A] border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                <span>Extracted Package Dependencies</span>
              </h3>
              <p className="text-xs text-slate-400">Libraries and runtime dependencies parsed from manifests</p>
            </div>
            <Badge variant="cyan" size="sm">
              {analysis?.dependencies?.length ?? 0} Packages
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(analysis?.dependencies || []).map((dep, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="text-slate-200 font-semibold block truncate max-w-[180px]">{dep.name}</span>
                  <span className="text-[10px] text-slate-500 uppercase">{dep.ecosystem} &bull; {dep.type}</span>
                </div>
                <Badge variant="neutral" size="sm">{dep.version}</Badge>
              </div>
            ))}
          </div>
          {hasAnalysis && !analysis.dependencies?.length && <p className="text-sm text-slate-400">{hasFiles ? "Dependency details are not available from this file-tree scan." : "No dependencies: this repository has no files."}</p>}
        </Card>
      )}

      {/* TAB 4: Files Tree */}
      {activeTab === "files" && (
        <Card className="bg-[#0B0F17] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-sky-400" />
                <span>Tracked Source Files ({fileTree.length})</span>
              </h2>
              <p className="text-xs text-slate-400">
                Filtered codebase tree excluding lockfiles, binary files, and build outputs
              </p>
            </div>

            <span className="text-xs font-mono text-slate-500">
              Branch: <strong className="text-slate-300">{repo.defaultBranch || "main"}</strong>
            </span>
          </div>

          <div className="rounded-lg border border-slate-800 overflow-hidden divide-y divide-slate-800/80 bg-[#080B11] text-xs font-mono">
            {!hasFiles && <p className="p-6 text-center text-sm text-slate-400">No tracked files were found on this branch.</p>}
            {fileTree.map((item, idx) => (
              <div
                key={idx}
                className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-900/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-slate-200 font-medium">{item.path || item.name}</span>
                  {item.isEntryPoint && (
                    <Badge variant="emerald" size="sm">Entry Point</Badge>
                  )}
                </div>

                <div className="flex items-center gap-6 text-slate-500 text-[11px]">
                  <span className="text-slate-400">{item.language || "TypeScript"}</span>
                  <span className="w-16 text-right">{item.lines ? `${item.lines} lines` : item.size}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
