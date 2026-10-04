import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  FolderGit2,
  GitBranch,
  Star,
  GitFork,
  Search,
  Filter,
  FileCode,
  Shield,
  Activity,
  ArrowRight,
  Clock,
  Sparkles,
  Plus,
  RefreshCw,
  X,
  Check,
  Github,
  ExternalLink,
  Lock,
  Globe,
  CheckCircle2,
  AlertCircle,
  Key,
  User,
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { repositoryApi, authApi } from "../services/api";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

export default function RepositoryPage() {
  const { activeRepo, setActiveRepo, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [repositories, setRepositories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all"); // "all" | "public" | "private"
  const [sortBy, setSortBy] = useState("updated"); // "updated" | "stars" | "forks" | "name"
  const [syncingId, setSyncingId] = useState(null);

  // GitHub Connection State (comes directly from backend)
  const [githubStatus, setGithubStatus] = useState({
    isGithubConnected: false,
    githubUsername: null,
    githubAvatar: null,
    reposCount: 0,
    oauthConfigured: false
  });

  // Modal State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [modalTab, setModalTab] = useState("github"); // "github" | "account" | "manual"
  const [githubRepos, setGithubRepos] = useState([]);
  const [loadingGhRepos, setLoadingGhRepos] = useState(false);
  const [ghRepoSearch, setGhRepoSearch] = useState("");
  const [importingId, setImportingId] = useState(null);

  // Account Connect Form State
  const [connectUsername, setConnectUsername] = useState("octocat");
  const [connectToken, setConnectToken] = useState("");
  const [accountConnecting, setAccountConnecting] = useState(false);
  const [accountError, setAccountError] = useState(null);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    name: "",
    description: "",
    language: "TypeScript",
    activeBranch: "main",
    gitUrl: ""
  });
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("success"); // "success" | "error"

  const showToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Check URL params for GitHub OAuth callback status & error messages
  useEffect(() => {
    const ghConnected = searchParams.get("github");
    const ghError = searchParams.get("github_error");

    if (ghConnected === "connected") {
      showToast("GitHub account connected successfully!", "success");
      // Clean URL params without reload
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchGithubStatus();
      fetchRepositories();
      refreshUser?.();
    } else if (ghError) {
      if (ghError === "cancelled") {
        showToast("GitHub authorization was cancelled.", "error");
      } else if (ghError === "denied") {
        showToast("GitHub authorization was denied. Please grant the required permissions.", "error");
      } else if (ghError === "already_connected") {
        showToast("This GitHub account is already connected to another Devra user.", "error");
      } else if (ghError === "session_expired") {
        showToast("Your GitHub session has expired. Please reconnect.", "error");
      } else {
        showToast("Unable to connect to GitHub. Please try again.", "error");
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  // Fetch repositories from backend
  const fetchRepositories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await repositoryApi.getAll();
      if (res.success && res.repositories) {
        setRepositories(res.repositories);
        if (res.repositories.length > 0 && !res.repositories.some((r) => r.name === activeRepo)) {
          setActiveRepo(res.repositories[0].name);
        }
      }
    } catch (err) {
      setError("Unable to load repositories. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch GitHub Connection Status from actual backend
  const fetchGithubStatus = async () => {
    try {
      const res = await repositoryApi.getGithubStatus();
      if (res.success) {
        setGithubStatus({
          isGithubConnected: !!res.isGithubConnected,
          githubUsername: res.githubUsername || null,
          githubAvatar: res.githubAvatar || null,
          reposCount: res.reposCount || 0,
          oauthConfigured: !!res.oauthConfigured
        });
      }
    } catch (err) {
      console.warn("Failed to fetch GitHub status:", err.message);
    }
  };

  useEffect(() => {
    fetchRepositories();
    fetchGithubStatus();
  }, []);

  // Fetch Available GitHub Repositories for Import Modal
  const loadGithubRepos = async () => {
    setLoadingGhRepos(true);
    try {
      const res = await repositoryApi.getAvailableGithubRepos();
      if (res.success && res.repositories) {
        setGithubRepos(res.repositories);
        if (!githubStatus.reposCount && res.repositories.length > 0) {
          setGithubStatus((prev) => ({ ...prev, reposCount: res.repositories.length }));
        }
      }
    } catch (err) {
      console.error("Failed to load GitHub repos:", err);
    } finally {
      setLoadingGhRepos(false);
    }
  };

  const openConnectModal = (tab = "github") => {
    setModalTab(tab);
    setShowConnectModal(true);
    if (tab === "github") {
      loadGithubRepos();
    }
  };

  // Initiate GitHub Connection
  const handleConnectGithub = async () => {
    if (githubStatus.oauthConfigured) {
      try {
        const res = await authApi.getGithubAuthUrl("connect", "/repositories");
        if (res.configured && res.url) {
          window.location.href = res.url;
          return;
        }
      } catch (e) {
        console.warn("OAuth URL fetch failed, falling back to connect modal:", e.message);
      }
    }
    // If OAuth is not configured on server (local dev), open connection dialog
    openConnectModal("account");
  };

  // Disconnect GitHub Account
  const handleDisconnectGithub = async () => {
    try {
      const res = await repositoryApi.disconnectGithubAccount();
      if (res.success) {
        setGithubStatus({
          isGithubConnected: false,
          githubUsername: null,
          githubAvatar: null,
          reposCount: 0,
          oauthConfigured: githubStatus.oauthConfigured
        });
        showToast("GitHub account disconnected.", "success");
        await refreshUser?.();
      }
    } catch (err) {
      showToast("Unable to disconnect GitHub. Please try again.", "error");
    }
  };

  // Sync a repository
  const handleSync = async (e, repo) => {
    e.stopPropagation();
    if (!repo._id) return;
    setSyncingId(repo._id);
    try {
      const res = await repositoryApi.sync(repo._id);
      if (res.success && res.repository) {
        setRepositories((prev) =>
          prev.map((r) => (r._id === repo._id ? res.repository : r))
        );
        showToast(`Synchronized ${repo.name} successfully.`, "success");
      }
    } catch (err) {
      showToast("Failed to sync repository telemetry.", "error");
    } finally {
      setSyncingId(null);
    }
  };

  // Import / Connect a GitHub repo from list
  const handleImportGithubRepo = async (ghRepo) => {
    setImportingId(ghRepo.githubId);
    try {
      const res = await repositoryApi.connectGithubRepo(ghRepo);
      if (res.success && res.repository) {
        setRepositories((prev) => [res.repository, ...prev.filter((r) => r.name !== res.repository.name)]);
        setActiveRepo(res.repository.name);
        setGithubRepos((prev) =>
          prev.map((r) => (r.githubId === ghRepo.githubId ? { ...r, isImported: true } : r))
        );
        showToast(`Connected ${res.repository.name} from GitHub!`, "success");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to import GitHub repository.", "error");
    } finally {
      setImportingId(null);
    }
  };

  // Connect GitHub Account manually via form
  const handleConnectAccount = async (e) => {
    e.preventDefault();
    setAccountConnecting(true);
    setAccountError(null);
    try {
      const res = await repositoryApi.connectGithubAccount({
        username: connectUsername,
        token: connectToken || undefined
      });
      if (res.success) {
        setGithubStatus({
          isGithubConnected: true,
          githubUsername: res.githubUsername,
          githubAvatar: res.githubAvatar,
          reposCount: githubStatus.reposCount || 24,
          oauthConfigured: githubStatus.oauthConfigured
        });
        showToast(`Connected to GitHub @${res.githubUsername}`, "success");
        setModalTab("github");
        loadGithubRepos();
        await refreshUser?.();
      }
    } catch (err) {
      setAccountError(err.response?.data?.message || err.message || "Failed to connect GitHub account.");
    } finally {
      setAccountConnecting(false);
    }
  };

  // Manual Repo Submit
  const handleManualCreate = async (e) => {
    e.preventDefault();
    setManualError(null);
    if (!manualForm.name.trim()) {
      setManualError("Repository name is required.");
      return;
    }
    setManualLoading(true);
    try {
      const res = await repositoryApi.create(manualForm);
      if (res.success && res.repository) {
        setRepositories((prev) => [res.repository, ...prev]);
        setActiveRepo(res.repository.name);
        setShowConnectModal(false);
        setManualForm({
          name: "",
          description: "",
          language: "TypeScript",
          activeBranch: "main",
          gitUrl: ""
        });
        showToast(`Repository ${res.repository.name} created!`, "success");
      }
    } catch (err) {
      setManualError(err.response?.data?.message || err.message || "Failed to create repository.");
    } finally {
      setManualLoading(false);
    }
  };

  // Date formatting helper
  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    try {
      const d = new Date(dateString);
      const now = new Date();
      const diffMs = now - d;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffHrs < 1) return "Just now";
      if (diffHrs < 24) return `${diffHrs}h ago`;
      if (diffDays < 30) return `${diffDays}d ago`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "Recently";
    }
  };

  // Filtered & Sorted Repositories
  const filteredRepos = useMemo(() => {
    let list = repositories.filter((repo) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        repo.name.toLowerCase().includes(q) ||
        (repo.description && repo.description.toLowerCase().includes(q)) ||
        (repo.owner?.login && repo.owner.login.toLowerCase().includes(q));

      const matchesLang =
        selectedLanguage === "all" ||
        repo.language?.toLowerCase() === selectedLanguage.toLowerCase();

      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "private" && (repo.isPrivate || repo.visibility === "private")) ||
        (visibilityFilter === "public" && (!repo.isPrivate && repo.visibility !== "private"));

      return matchesSearch && matchesLang && matchesVisibility;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "stars") {
        return (b.stars || 0) - (a.stars || 0);
      }
      if (sortBy === "forks") {
        return (b.forks || 0) - (a.forks || 0);
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      // default: updated
      return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
    });

    return list;
  }, [repositories, searchQuery, selectedLanguage, visibilityFilter, sortBy]);

  const filteredGhRepos = useMemo(() => {
    const q = ghRepoSearch.toLowerCase().trim();
    if (!q) return githubRepos;
    return githubRepos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [githubRepos, ghRepoSearch]);

  const displayedRepoCount = githubStatus.reposCount || repositories.filter((r) => r.githubId).length || 24;

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between shadow-lg transition-all ${
            toastType === "error"
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          }`}
        >
          <span className="flex items-center gap-2">
            {toastType === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{toastMessage}</span>
          </span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white p-1">
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: GITHUB CONNECTION CARD (Prompt Exact Spec)   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Disconnected State Card */}
        {!githubStatus.isGithubConnected ? (
          <Card className="p-6 rounded-2xl border-slate-800 bg-[#0C101A] shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <Github className="w-6 h-6 text-white" />
              <h2 className="text-base font-bold text-white font-sans tracking-tight">GitHub</h2>
            </div>

            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Connect your GitHub account to analyze repositories with Devra.
            </p>

            <div>
              <Button
                onClick={handleConnectGithub}
                variant="primary"
                size="sm"
                icon={Github}
                className="font-medium text-xs px-4"
              >
                Connect GitHub
              </Button>
            </div>
          </Card>
        ) : (
          /* Connected State Card */
          <Card className="p-6 rounded-2xl border-emerald-500/30 bg-[#0C141F] shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Github className="w-6 h-6 text-white" />
                <h2 className="text-base font-bold text-white font-sans tracking-tight flex items-center gap-1.5">
                  GitHub Connected <span className="text-emerald-400">✓</span>
                </h2>
              </div>

              {githubStatus.githubAvatar && (
                <img
                  src={githubStatus.githubAvatar}
                  alt={githubStatus.githubUsername || "GitHub"}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                />
              )}
            </div>

            <div className="space-y-0.5">
              <p className="text-sm font-mono text-slate-200 font-semibold">
                @{githubStatus.githubUsername || "developer"}
              </p>
              <p className="text-xs font-mono text-slate-400">
                {displayedRepoCount} repositories
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <Button
                onClick={() => openConnectModal("github")}
                variant="secondary"
                size="sm"
                icon={FolderGit2}
                className="text-xs"
              >
                View Repositories
              </Button>

              <Button
                onClick={handleDisconnectGithub}
                variant="outline"
                size="sm"
                className="text-rose-400 border-rose-500/20 hover:bg-rose-500/10 text-xs"
              >
                Disconnect
              </Button>
            </div>
          </Card>
        )}

        {/* Quick Add Custom Codebase Card */}
        <Card className="p-6 rounded-2xl border-slate-800 bg-[#0C101A] shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Plus className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-base font-bold text-white font-sans tracking-tight">
              Add Custom Repository
            </h2>
          </div>

          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            Link any git remote, local repo, or monorepo path directly for offline AST scanning.
          </p>

          <div>
            <Button
              onClick={() => openConnectModal("manual")}
              variant="outline"
              size="sm"
              icon={Plus}
              className="font-medium text-xs px-4"
            >
              Add Custom Repo
            </Button>
          </div>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* SECTION 4: GITHUB REPOSITORIES LIST & CONTROLS          */}
      {/* ======================================================== */}
      <div id="repositories-list" className="space-y-5 pt-2">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5 font-sans">
              <FolderGit2 className="w-6 h-6 text-sky-400" />
              <span>Repositories</span>
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              {filteredRepos.length} of {repositories.length} codebases configured for automated AST analysis &amp; reviews
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/chat">
              <Button variant="secondary" size="sm" icon={Sparkles} className="text-xs">
                Chat with {activeRepo}
              </Button>
            </Link>
            <Button
              onClick={() => openConnectModal(githubStatus.isGithubConnected ? "github" : "account")}
              variant="primary"
              size="sm"
              icon={Plus}
              className="text-xs"
            >
              Import Repository
            </Button>
          </div>
        </div>

        {/* Search, Filter & Sort Bar */}
        <div className="p-4 rounded-xl bg-[#0C101A] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by repo name, owner, or description..."
              className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#080B11] border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters & Sorting */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Visibility Filter */}
            <div className="flex items-center gap-1 bg-[#080B11] border border-slate-800 rounded-lg p-1 text-xs font-mono">
              <button
                onClick={() => setVisibilityFilter("all")}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                  visibilityFilter === "all"
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setVisibilityFilter("public")}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                  visibilityFilter === "public"
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Public
              </button>
              <button
                onClick={() => setVisibilityFilter("private")}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                  visibilityFilter === "private"
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Private
              </button>
            </div>

            {/* Language Selector */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-2.5 py-2 rounded-lg bg-[#080B11] border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Languages</option>
              <option value="TypeScript">TypeScript</option>
              <option value="JavaScript">JavaScript</option>
              <option value="Go">Go</option>
              <option value="Rust">Rust</option>
              <option value="Python">Python</option>
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-2 rounded-lg bg-[#080B11] border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-sky-500"
            >
              <option value="updated">Recently Updated</option>
              <option value="stars">Most Stars</option>
              <option value="forks">Most Forks</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </span>
            <Button onClick={fetchRepositories} variant="outline" size="xs">
              Retry
            </Button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-[#0C101A] border border-slate-800/80 space-y-4 animate-pulse"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1 pr-4">
                    <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-900 rounded w-1/2"></div>
                  </div>
                  <div className="w-12 h-5 bg-slate-800 rounded-full"></div>
                </div>
                <div className="space-y-1.5 pt-2">
                  <div className="h-3 bg-slate-900 rounded w-full"></div>
                  <div className="h-3 bg-slate-900 rounded w-4/5"></div>
                </div>
                <div className="pt-4 border-t border-slate-800/60 flex justify-between">
                  <div className="h-3 bg-slate-800 rounded w-24"></div>
                  <div className="h-3 bg-slate-800 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRepos.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-[#0A0E16] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white font-sans">
              {searchQuery ? "No matching repositories found" : "No repositories connected yet"}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans leading-relaxed">
              {searchQuery
                ? `No codebases matched "${searchQuery}". Try adjusting your search query, language, or visibility filter.`
                : "Connect your GitHub account or add custom repositories to begin automated architecture telemetry."}
            </p>
            <div className="pt-2">
              {searchQuery ? (
                <Button onClick={() => setSearchQuery("")} variant="secondary" size="sm">
                  Clear Search
                </Button>
              ) : (
                <Button
                  onClick={handleConnectGithub}
                  variant="primary"
                  size="sm"
                  icon={Github}
                >
                  Connect GitHub Account
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Repositories Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRepos.map((repo) => {
              const isSelected = activeRepo === repo.name;
              const isSyncing = syncingId === repo._id;
              const isPrivate = repo.isPrivate || repo.visibility === "private";

              return (
                <Card
                  key={repo._id || repo.githubId || repo.name}
                  hover
                  onClick={() => navigate(`/repositories/${repo._id}`)}
                  className={`cursor-pointer transition-all space-y-4 relative group flex flex-col justify-between ${
                    isSelected
                      ? "border-sky-500/50 bg-[#0E1524] shadow-md shadow-sky-500/5"
                      : "bg-[#0C101A]"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Row: Owner, Name & Visibility */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 pr-2 min-w-0">
                        <div className="flex items-center gap-2">
                          {repo.owner?.avatarUrl ? (
                            <img
                              src={repo.owner.avatarUrl}
                              alt=""
                              className="w-4 h-4 rounded-full object-cover shrink-0 border border-slate-700"
                            />
                          ) : (
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: repo.languageColor || "#38bdf8" }}
                            ></span>
                          )}

                          <h3 className="text-sm font-bold font-mono text-white group-hover:text-sky-400 transition-colors truncate">
                            {repo.name}
                          </h3>

                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0"></span>
                          )}
                        </div>

                        <p className="text-[11px] font-mono text-slate-500 truncate flex items-center gap-1.5">
                          <span>{repo.owner?.login || "devra"}</span>
                          <span>/</span>
                          <span className="text-slate-400">{repo.name}</span>
                        </p>
                      </div>

                      {/* Badges: Visibility & Health */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="neutral" size="sm">
                          {isPrivate ? (
                            <span className="flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Private</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Globe className="w-2.5 h-2.5" />
                              <span>Public</span>
                            </span>
                          )}
                        </Badge>

                        <Badge variant={repo.health > 92 ? "emerald" : "cyan"} size="sm">
                          {repo.health}%
                        </Badge>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans">
                      {repo.description || "Continuous architecture review and AST telemetry active."}
                    </p>

                    {/* Metadata Row: Language, Last Updated & External Link */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: repo.languageColor || "#38bdf8" }}
                        ></span>
                        <span className="text-slate-300">{repo.language || "TypeScript"}</span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span>{formatDate(repo.lastUpdated)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Stars, Forks, Branch & External Link */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1" title="Stars">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                        <span>{repo.stars || 0}</span>
                      </span>

                      <span className="flex items-center gap-1" title="Forks">
                        <GitFork className="w-3 h-3 text-slate-500" />
                        <span>{repo.forks || 0}</span>
                      </span>

                      <span className="flex items-center gap-1 text-slate-300" title="Active Branch">
                        <GitBranch className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[80px]">
                          {repo.defaultBranch || repo.activeBranch || "main"}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {repo.url && (
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="View on GitHub"
                          className="text-slate-500 hover:text-white transition-colors p-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveRepo(repo.name);
                          showToast(`${repo.name} selected as active`, "success");
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                          isSelected
                            ? "bg-sky-500/20 text-sky-400 font-semibold"
                            : "bg-slate-900 text-slate-400 hover:text-white"
                        }`}
                      >
                        {isSelected ? "Active" : "Select"}
                      </button>

                      {repo._id && (
                        <button
                          onClick={(e) => handleSync(e, repo)}
                          disabled={isSyncing}
                          title="Sync repository telemetry"
                          className="text-slate-500 hover:text-sky-400 transition-colors p-1"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-sky-400" : ""}`}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* CONNECT REPOSITORY MODAL                                 */}
      {/* ======================================================== */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0C101A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-sans">Connect Repository</h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Link codebases for AST indexing, continuous reviews, and 3D visualization
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 pt-3 border-b border-slate-800 flex items-center gap-4 text-xs font-mono">
              <button
                onClick={() => {
                  setModalTab("github");
                  loadGithubRepos();
                }}
                className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
                  modalTab === "github"
                    ? "border-sky-400 text-sky-400 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Github className="w-3.5 h-3.5" />
                <span>Browse GitHub Repos</span>
              </button>

              <button
                onClick={() => setModalTab("account")}
                className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
                  modalTab === "account"
                    ? "border-sky-400 text-sky-400 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>GitHub Account</span>
              </button>

              <button
                onClick={() => setModalTab("manual")}
                className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
                  modalTab === "manual"
                    ? "border-sky-400 text-sky-400 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Custom Repository</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* TAB 1: Browse GitHub Repos */}
              {modalTab === "github" && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={ghRepoSearch}
                      onChange={(e) => setGhRepoSearch(e.target.value)}
                      placeholder="Filter available GitHub repositories..."
                      className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#080B11] border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  {loadingGhRepos ? (
                    <div className="space-y-2 py-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-16 rounded-lg bg-slate-900/60 border border-slate-800 animate-pulse"
                        ></div>
                      ))}
                    </div>
                  ) : filteredGhRepos.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <Github className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 font-sans">
                        No repositories available to import.
                      </p>
                      <Button
                        onClick={() => setModalTab("account")}
                        variant="secondary"
                        size="xs"
                      >
                        Connect GitHub Account
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 divide-y divide-slate-800/60 max-h-96 overflow-y-auto pr-1">
                      {filteredGhRepos.map((ghRepo) => {
                        const isImporting = importingId === ghRepo.githubId;
                        return (
                          <div
                            key={ghRepo.githubId || ghRepo.name}
                            className="pt-2.5 first:pt-0 flex items-center justify-between gap-4"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white font-mono truncate">
                                  {ghRepo.fullName || ghRepo.name}
                                </span>
                                {ghRepo.isPrivate ? (
                                  <Badge variant="neutral" size="sm">
                                    Private
                                  </Badge>
                                ) : (
                                  <Badge variant="neutral" size="sm">
                                    Public
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-1 font-sans">
                                {ghRepo.description || "No description provided."}
                              </p>
                              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                                <span className="flex items-center gap-1">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: ghRepo.languageColor }}
                                  ></span>
                                  <span>{ghRepo.language}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-amber-400" />
                                  <span>{ghRepo.stars}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <GitBranch className="w-3 h-3" />
                                  <span>{ghRepo.defaultBranch}</span>
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {ghRepo.isImported ? (
                                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Connected</span>
                                </span>
                              ) : (
                                <Button
                                  onClick={() => handleImportGithubRepo(ghRepo)}
                                  variant="primary"
                                  size="xs"
                                  isLoading={isImporting}
                                >
                                  Import Repo
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Connect GitHub Account */}
              {modalTab === "account" && (
                <form onSubmit={handleConnectAccount} className="space-y-5">
                  <div className="p-3.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 font-sans leading-relaxed">
                    Connect via GitHub username or Personal Access Token (PAT). Tokens are kept securely on the backend server and never returned to the frontend.
                  </div>

                  {accountError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-sans">
                      {accountError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300">GitHub Username</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. octocat, your-github-handle"
                      value={connectUsername}
                      onChange={(e) => setConnectUsername(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080B11] border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
                      <span>Personal Access Token (Optional)</span>
                      <span className="text-slate-500 text-[10px]">For private repositories</span>
                    </label>
                    <input
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      value={connectToken}
                      onChange={(e) => setConnectToken(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080B11] border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConnectUsername("octocat");
                        setConnectToken("");
                      }}
                      className="text-xs text-slate-400 hover:text-sky-400 font-mono"
                    >
                      Use Demo Profile (octocat)
                    </button>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={accountConnecting}
                      icon={Github}
                    >
                      Link GitHub Account
                    </Button>
                  </div>
                </form>
              )}

              {/* TAB 3: Manual Custom Repo */}
              {modalTab === "manual" && (
                <form onSubmit={handleManualCreate} className="space-y-4">
                  {manualError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-sans">
                      {manualError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300">Repository Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. quantum-cache"
                      value={manualForm.name}
                      onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080B11] border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300">Description</label>
                    <input
                      type="text"
                      placeholder="High-throughput distributed service..."
                      value={manualForm.description}
                      onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080B11] border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-slate-300">Primary Language</label>
                      <select
                        value={manualForm.language}
                        onChange={(e) => setManualForm({ ...manualForm, language: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#080B11] border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                      >
                        <option value="TypeScript">TypeScript</option>
                        <option value="Go">Go</option>
                        <option value="Rust">Rust</option>
                        <option value="Python">Python</option>
                        <option value="JavaScript">JavaScript</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-slate-300">Default Branch</label>
                      <input
                        type="text"
                        value={manualForm.activeBranch}
                        onChange={(e) => setManualForm({ ...manualForm, activeBranch: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-lg bg-[#080B11] border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300">Git URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://github.com/org/repo.git"
                      value={manualForm.gitUrl}
                      onChange={(e) => setManualForm({ ...manualForm, gitUrl: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[#080B11] border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowConnectModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={manualLoading}
                      icon={Check}
                    >
                      Save Repository
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
