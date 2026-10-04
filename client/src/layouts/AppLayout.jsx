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
  Cpu
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
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="h-14 border-b border-slate-800/80 bg-[#0B0F17] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
        {/* Left: Brand & Repo Selector */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-2.5">
            <DevraLogo size="sm" showText={true} />
          </Link>

          <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

          {/* Repo Switcher Dropdown */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-sky-400" />
              <span>{activeRepo}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {repoDropdownOpen && (
              <div
                className="absolute left-0 mt-1.5 w-64 bg-[#0F1420] border border-slate-800 rounded-lg shadow-xl py-1 z-50 text-xs"
                onClick={() => setRepoDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                  Switch Active Repository
                </div>
                {MOCK_REPOSITORIES.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => setActiveRepo(repo.name)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                      activeRepo === repo.name ? "bg-slate-800/50 text-sky-400 font-medium" : "text-slate-300"
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

        {/* Center: Search Bar prompt */}
        <div className="hidden lg:flex items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-400 w-72">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate">Search codebase, reviews, docs...</span>
            <kbd className="ml-auto text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Status, Notifications & User */}
        <div className="flex items-center gap-3">
          {/* Operational Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>API Online</span>
          </div>

          <button
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-sky-400 rounded-full"></span>
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
            >
              <img
                src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64"}
                alt={user?.name || "User"}
                className="w-7 h-7 rounded-md object-cover border border-slate-700"
              />
              <span className="text-xs font-medium text-slate-300 hidden sm:inline-block max-w-[100px] truncate">
                {user?.name || "Alex"}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-1.5 w-56 bg-[#0F1420] border border-slate-800 rounded-lg shadow-xl py-1 z-50 text-xs"
                onClick={() => setUserDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-800/80">
                  <p className="font-semibold text-white truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  <p className="text-[10px] font-mono text-sky-400 mt-1">{user?.organization}</p>
                </div>
                <Link
                  to="/settings"
                  className="block px-3 py-2 text-slate-300 hover:bg-slate-800/80 transition-colors"
                >
                  Account Settings
                </Link>
                <Link
                  to="/"
                  className="block px-3 py-2 text-slate-300 hover:bg-slate-800/80 transition-colors"
                >
                  Landing Page
                </Link>
                <div className="border-t border-slate-800/80 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="w-56 bg-[#090D15] border-r border-slate-800/80 flex flex-col justify-between hidden md:flex shrink-0 select-none">
          <div className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* VS Code Extension Status Pill */}
          <div className="p-3 m-3 rounded-lg bg-[#0F1420] border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-sky-400" />
                <span>VS Code</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono">
              devra-vscode v0.1.0
            </p>
            <p className="text-[10px] text-slate-500 leading-tight">
              In-editor AST sync active
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 md:hidden flex flex-col">
            <div className="p-4 bg-[#0B0F17] border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-white text-base">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2 bg-[#090D15] flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium ${
                      isActive
                        ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#080B11]">
          {children}
        </main>
      </div>
    </div>
  );
}
