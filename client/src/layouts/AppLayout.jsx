import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderGit2,
  GitPullRequest,
  MessageSquareCode,
  Settings,
  ChevronDown,
  Terminal,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Sparkles,
  Layers
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { repositoryApi } from "../services/api";
import Badge from "../components/ui/Badge";
import DevraLogo from "../components/ui/DevraLogo";
import PageTransition from "../components/ui/PageTransition";

export default function AppLayout({ children }) {
  const { user, logout, activeRepo, setActiveRepo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userRepos, setUserRepos] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchRepos = async () => {
      try {
        const res = await repositoryApi.getAll();
        if (isMounted && res.success && Array.isArray(res.repositories)) {
          setUserRepos(res.repositories);
          if (res.repositories.length > 0 && (!activeRepo || activeRepo === "devra-core")) {
            // Synchronize active repo with user's genuine first repository if available
            setActiveRepo(res.repositories[0].name);
          }
        }
      } catch (err) {
        if (isMounted) setUserRepos([]);
      }
    };
    fetchRepos();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setRepoDropdownOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);


  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Repositories", path: "/repositories", icon: FolderGit2, badge: "14" },
    { label: "Code Reviews", path: "/reviews", icon: GitPullRequest, badge: "3" },
    { label: "AI Assistant", path: "/chat", icon: MessageSquareCode },
    { label: "Settings", path: "/settings", icon: Settings }
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-dvh bg-abyssal-dark text-abyssal-ivory flex flex-col antialiased">
      {/* Top Professional Dark Navbar */}
      <header className="h-14 border-b border-abyssal-border bg-abyssal-dark/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none shadow-sm">
        {/* Left: Brand & Repo Selector */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close workspace navigation" : "Open workspace navigation"}
            aria-expanded={mobileMenuOpen}
            aria-controls="workspace-mobile-navigation"
            className="md:hidden p-1.5 text-abyssal-secondary hover:text-abyssal-ivory rounded-lg hover:bg-abyssal-card transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-2.5">
            <DevraLogo size="sm" showText={true} theme="dark" />
          </Link>

          <div className="h-4 w-px bg-abyssal-border hidden sm:block"></div>

          {/* Repo Switcher Dropdown */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono text-abyssal-secondary bg-abyssal-card border border-abyssal-border hover:border-abyssal-jade transition-colors"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-abyssal-jade" />
              <span>{activeRepo}</span>
              <ChevronDown className="w-3 h-3 text-abyssal-muted" />
            </button>

            {repoDropdownOpen && (
              <div
                className="absolute left-0 mt-1.5 w-64 bg-abyssal-card border border-abyssal-border rounded-lg shadow-xl py-1 z-50 text-xs shadow-black/60"
                onClick={() => setRepoDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-mono text-abyssal-muted tracking-wider border-b border-abyssal-border mb-1">
                  Active Repositories ({userRepos.length})
                </div>
                {userRepos.length === 0 ? (
                  <div className="px-3 py-2 text-center text-abyssal-muted">
                    <p className="text-[11px] mb-1.5">No repositories found</p>
                    <Link to="/repositories" className="text-abyssal-jade hover:underline text-[10px]">
                      + Import a repository
                    </Link>
                  </div>
                ) : (
                  userRepos.map((repo) => (
                    <button
                      key={repo._id || repo.id || repo.name}
                      onClick={() => setActiveRepo(repo.name)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-abyssal-surface transition-colors ${
                        activeRepo === repo.name ? "bg-abyssal-surface text-abyssal-jade font-semibold" : "text-abyssal-secondary"
                      }`}
                    >
                      <span className="font-mono">{repo.name}</span>
                      <span className="text-[10px] text-abyssal-muted">{repo.language || "TypeScript"}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>


        {/* Center: Quick Global Search Input */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
          <div className="w-full relative">
            <Search className="w-3.5 h-3.5 text-abyssal-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search AST symbols, reviews, files... (Cmd + K)"
              className="w-full bg-abyssal-card border border-abyssal-border rounded-lg pl-9 pr-8 py-1.5 text-xs text-abyssal-ivory placeholder-abyssal-muted focus:outline-none focus:border-abyssal-jade focus:ring-1 focus:ring-abyssal-jade transition-all font-mono"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-abyssal-muted bg-abyssal-surface px-1.5 py-0.5 rounded border border-abyssal-border">
              /
            </kbd>
          </div>
        </div>

        {/* Right: Status Indicators & Profile */}
        <div className="flex items-center gap-3">
          {/* Live Node Link Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-abyssal-card border border-abyssal-border text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-abyssal-jade animate-pulse"></span>
            <span className="text-abyssal-secondary text-[11px]">RAG Vector: Ready</span>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-abyssal-card transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-abyssal-jade flex items-center justify-center text-xs font-bold font-mono text-abyssal-dark">
                {user?.name ? user.name.charAt(0).toUpperCase() : "D"}
              </div>
              <span className="text-xs font-medium text-abyssal-secondary hidden md:block">
                {user?.name || "Developer"}
              </span>
              <ChevronDown className="w-3 h-3 text-abyssal-muted hidden md:block" />
            </button>

            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-abyssal-card border border-abyssal-border rounded-lg shadow-xl py-1.5 z-50 text-xs shadow-black/60"
                onClick={() => setUserDropdownOpen(false)}
              >
                <div className="px-3.5 py-2 border-b border-abyssal-border">
                  <p className="font-semibold text-abyssal-ivory truncate">{user?.name || "Developer"}</p>
                  <p className="text-[11px] font-mono text-abyssal-muted truncate">{user?.email || "dev@devra.ai"}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-abyssal-jade"></span>
                    <span className="text-[10px] uppercase font-mono text-abyssal-jade font-semibold">{user?.role || "Architect"}</span>
                  </div>
                </div>

                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-3.5 py-2 text-abyssal-secondary hover:bg-abyssal-surface hover:text-abyssal-ivory transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-abyssal-muted" />
                  <span>Account &amp; API Keys</span>
                </Link>

                <div className="border-t border-abyssal-border my-1"></div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-abyssal-error hover:bg-rose-950/30 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect Session</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Desktop Abyssal Sidebar Navigation */}
        <aside className="w-56 border-r border-abyssal-border bg-abyssal-dark p-3 hidden md:flex flex-col justify-between select-none">
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-abyssal-muted font-semibold">
              Workspace
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all duration-150 ${
                    isActive
                      ? "bg-abyssal-card text-abyssal-jade font-semibold border-l-2 border-abyssal-jade shadow-sm"
                      : "text-abyssal-secondary hover:text-abyssal-ivory hover:bg-abyssal-surface"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-abyssal-jade" : "text-abyssal-muted"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? "bg-abyssal-jade/20 text-abyssal-jade" : "bg-abyssal-surface text-abyssal-muted"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Bottom Extension & Infrastructure Telemetry */}
          <div className="p-3 rounded-xl bg-abyssal-card border border-abyssal-border space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-abyssal-secondary">VS Code Daemon</span>
              <span className="text-abyssal-citron flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-abyssal-citron animate-pulse"></span>
                v0.1.0
              </span>
            </div>
            <p className="text-[10px] text-abyssal-muted leading-tight">
              AST spatial indexing synchronized with local server.
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.button
                type="button"
                aria-label="Close workspace navigation"
                className="md:hidden fixed inset-x-0 bottom-0 top-14 z-40 bg-black/50 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.nav
                id="workspace-mobile-navigation"
                aria-label="Workspace navigation"
                className="md:hidden fixed inset-x-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto bg-abyssal-dark p-4 flex flex-col space-y-2 border-b border-abyssal-border shadow-2xl"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center justify-between p-3 rounded-lg text-sm font-mono transition-colors duration-200 ${
                        isActive ? "bg-abyssal-card text-abyssal-jade font-semibold" : "text-abyssal-secondary hover:bg-abyssal-surface"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-abyssal-jade" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-xs bg-abyssal-jade/20 text-abyssal-jade px-2 py-0.5 rounded font-mono">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </motion.nav>
            </>
          )}
        </AnimatePresence>

        {/* Main Routed Page Content */}
        <main data-route-scroll className="flex-1 min-w-0 overflow-y-auto overscroll-contain relative bg-abyssal-dark">
          <div className="relative z-10 min-h-full"><PageTransition>{children}</PageTransition></div>
        </main>
      </div>
    </div>
  );
}
