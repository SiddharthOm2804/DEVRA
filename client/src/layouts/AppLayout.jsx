import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { MOCK_REPOSITORIES } from "../constants/mockData";
import Badge from "../components/ui/Badge";
import DevraLogo from "../components/ui/DevraLogo";

export default function AppLayout({ children }) {
  const { user, logout, activeRepo, setActiveRepo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

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
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col antialiased selection:bg-violet-500/25 selection:text-violet-200">
      {/* Top Futuristic Navbar */}
      <header className="h-14 border-b border-white/[0.07] bg-[#0A0E1A]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none shadow-sm shadow-black/40">
        {/* Left: Brand & Repo Selector */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-2.5">
            <DevraLogo size="sm" showText={true} />
          </Link>

          <div className="h-4 w-px bg-white/10 hidden sm:block"></div>

          {/* Repo Switcher Dropdown */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono text-slate-300 bg-[#0E1526] border border-white/10 hover:border-violet-500/40 transition-colors"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{activeRepo}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {repoDropdownOpen && (
              <div
                className="absolute left-0 mt-1.5 w-64 bg-[#0D1222] border border-white/10 rounded-lg shadow-2xl py-1 z-50 text-xs shadow-black/80"
                onClick={() => setRepoDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                  Switch Active Repository
                </div>
                {MOCK_REPOSITORIES.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => setActiveRepo(repo.name)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-violet-950/40 transition-colors ${
                      activeRepo === repo.name ? "bg-violet-950/50 text-violet-300 font-medium" : "text-slate-300"
                    }`}
                  >
                    <span className="font-mono">{repo.name}</span>
                    <span className="text-[10px] text-slate-500">{repo.language}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Quick Global Search Input */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
          <div className="w-full relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search AST symbols, reviews, files... (Cmd + K)"
              className="w-full bg-[#070B14]/80 border border-white/10 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all font-mono"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
              /
            </kbd>
          </div>
        </div>

        {/* Right: Status Indicators & Profile */}
        <div className="flex items-center gap-3">
          {/* Live Node Link Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0E1526] border border-white/10 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 text-[11px]">RAG Vector: Ready</span>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 p-px flex items-center justify-center">
                <div className="w-full h-full bg-[#0A0E1A] rounded-full flex items-center justify-center text-xs font-bold font-mono text-violet-300">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "D"}
                </div>
              </div>
              <span className="text-xs font-medium text-slate-200 hidden md:block">
                {user?.name || "Developer"}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden md:block" />
            </button>

            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-[#0D1222] border border-white/10 rounded-lg shadow-2xl py-1.5 z-50 text-xs shadow-black/80"
                onClick={() => setUserDropdownOpen(false)}
              >
                <div className="px-3.5 py-2 border-b border-white/10">
                  <p className="font-semibold text-white truncate">{user?.name || "Developer"}</p>
                  <p className="text-[11px] font-mono text-slate-400 truncate">{user?.email || "dev@devra.ai"}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                    <span className="text-[10px] uppercase font-mono text-violet-400 font-semibold">{user?.role || "Architect"}</span>
                  </div>
                </div>

                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-3.5 py-2 text-slate-300 hover:bg-violet-950/40 hover:text-white transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Account &amp; API Keys</span>
                </Link>

                <div className="border-t border-white/10 my-1"></div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-400 hover:bg-rose-950/30 transition-colors"
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
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <aside className="w-56 border-r border-white/[0.07] bg-[#080C16] p-3 hidden md:flex flex-col justify-between select-none">
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Spatial Workspace
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
                      ? "bg-gradient-to-r from-violet-950/60 to-transparent text-violet-300 font-semibold border-l-2 border-violet-500 shadow-sm shadow-violet-950/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-violet-400" : "text-slate-500"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? "bg-violet-500/20 text-violet-300" : "bg-slate-800 text-slate-400"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Bottom Extension & Infrastructure Telemetry */}
          <div className="p-3 rounded-xl bg-[#0B101E] border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">VS Code Status</span>
              <span className="text-cyan-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                v0.1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              3D AST spatial indexing synchronized with local daemon.
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-14 z-50 bg-[#060911]/95 backdrop-blur-xl p-4 flex flex-col space-y-2 border-b border-white/10">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-lg text-sm font-mono ${
                    isActive ? "bg-violet-950/60 text-violet-300 font-semibold" : "text-slate-300 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-violet-400" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded font-mono">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Main Routed Page Content */}
        <main className="flex-1 overflow-y-auto relative bg-[#060911]">
          {/* Subtle spatial background ambient lights */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
