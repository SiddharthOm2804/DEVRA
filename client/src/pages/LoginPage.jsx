import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Github,
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  Check
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import DevraLogo from "../components/ui/DevraLogo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const { login, demoLogin, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // Check URL params for GitHub OAuth callback errors or cancellations
  useEffect(() => {
    const ghError = searchParams.get("github_error");
    if (ghError) {
      if (ghError === "cancelled") {
        setLocalError("GitHub authorization was cancelled.");
      } else if (ghError === "denied") {
        setLocalError("GitHub authorization was denied. Please grant the required permissions.");
      } else if (ghError === "not_configured") {
        setLocalError("GitHub OAuth credentials are not configured in the server environment (.env).");
      } else if (ghError === "already_connected") {
        setLocalError("This GitHub account is already connected to another Devra user.");
      } else if (ghError === "session_expired") {
        setLocalError("Your developer session has expired. Please log in again.");
      } else {
        setLocalError("Unable to connect to GitHub. Please try again.");
      }
    }
  }, [searchParams]);

  // Redirect authenticated users away from Login page
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError("Please provide both email and password.");
      return;
    }

    setSubmitting(true);
    const res = await login(email.trim(), password, rememberMe);
    setSubmitting(false);

    if (res.success) {
      navigate(redirectTo);
    } else {
      setLocalError(res.message || "Invalid email or password.");
    }
  };

  const handleDemoAccess = async () => {
    setLocalError(null);
    clearError();
    setSubmitting(true);

    const res = await demoLogin();
    setSubmitting(false);

    if (res.success) {
      navigate(redirectTo);
    } else {
      setLocalError(res.message || "Demo login failed. Please try again.");
    }
  };

  const handleGitHubSignIn = async () => {
    setLocalError(null);
    clearError();
    setGithubLoading(true);

    try {
      const res = await authApi.getGithubAuthUrl("login", redirectTo);
      if (res.configured && res.url) {
        window.location.href = res.url;
      } else {
        // Fallback message when client ID is not configured in .env
        setLocalError("GitHub OAuth credentials (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET) are not set in server .env. Use email sign in or Instant Demo Access.");
        setGithubLoading(false);
      }
    } catch (err) {
      setLocalError("Unable to connect to GitHub. Please try again.");
      setGithubLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* ======================================================== */}
      {/* LEFT COLUMN: Premium Devra Branding & Visual             */}
      {/* ======================================================== */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 border-r border-slate-800/80 bg-[#06090F] overflow-hidden">
        {/* Subtle Ambient Lighting & Grid */}
        <div className="absolute inset-0 bg-devra-grid pointer-events-none opacity-40"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Top Branding */}
        <div className="relative z-10 space-y-4">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <DevraLogo size="md" showText={false} />
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-white font-sans group-hover:text-sky-400 transition-colors">
                DEVRA
              </span>
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
                Developer Console
              </span>
            </div>
          </Link>

          <div className="pt-8 max-w-lg space-y-3">
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Your AI Engineering Companion.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed font-sans">
              Continuous AST code review, WebGL codebase intelligence, and vector-backed repository reasoning in a unified developer console.
            </p>
          </div>
        </div>

        {/* Middle Feature Telemetry Card */}
        <div className="relative z-10 my-8 max-w-lg">
          <div className="p-5 rounded-2xl bg-[#0B0F19]/90 border border-slate-800/90 shadow-2xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs font-mono font-medium text-slate-300">
                  Devra Architecture Engine v2.4
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                ACTIVE
              </span>
            </div>

            {/* Terminal snippet */}
            <div className="p-3 rounded-xl bg-[#05070B] border border-slate-900 font-mono text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-sky-400">$</span>
                <span>devra analyze --active-repo core</span>
              </div>
              <div className="text-emerald-400 flex items-center gap-1.5 text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>AST Graph indexed (24,810 semantic nodes)</span>
              </div>
              <div className="text-emerald-400 flex items-center gap-1.5 text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>Continuous PR telemetry initialized</span>
              </div>
              <div className="text-sky-400 flex items-center gap-1.5 text-[11px]">
                <Cpu className="w-3.5 h-3.5" />
                <span>Zero architectural circularities detected</span>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">AST Vulnerability Scans</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">3D Dependency Topology</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>&copy; {new Date().getFullYear()} DEVRA Inc.</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            All Systems Operational
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: Modern Login Card                          */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 py-12 relative overflow-y-auto">
        {/* Subtle mobile brand header */}
        <div className="lg:hidden w-full max-w-md text-center mb-8 space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <DevraLogo size="sm" showText={false} />
            <span className="text-xl font-bold tracking-tight text-white font-sans">
              DEVRA
            </span>
          </Link>
          <p className="text-xs text-slate-400 font-sans">
            Your AI Engineering Companion.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Card Header */}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              Sign in to DEVRA
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              Welcome back. Enter your credentials to access your repositories.
            </p>
          </div>

          {/* Login Card */}
          <Card className="p-6 sm:p-7 space-y-5 border-slate-800 bg-[#0C101A] shadow-xl">
            {/* Friendly Error Banner */}
            {displayError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug font-sans">{displayError}</span>
              </motion.div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Work Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 font-sans">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Work Email</span>
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@company.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#080B11] border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors font-mono"
                />
              </div>

              {/* Password Field with Show/Hide Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 font-sans">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Password</span>
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocalError("For demo environments, use Instant Demo Sign-In below or reset via local administrator.");
                    }}
                    className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors font-sans"
                  >
                    Forgot password?
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-[#080B11] border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Session Checkbox */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500/20 focus:ring-offset-0 cursor-pointer accent-sky-500"
                  />
                  <span className="text-xs text-slate-400 font-sans">
                    Remember session on this device
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={submitting}
                className="w-full text-xs font-semibold mt-2"
                icon={ArrowRight}
              >
                Sign In to Devra
              </Button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center pt-2">
              <div className="w-full border-t border-slate-800"></div>
              <span className="absolute bg-[#0C101A] px-3 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                Or continue with
              </span>
            </div>

            {/* Continue with GitHub Button */}
            <Button
              onClick={handleGitHubSignIn}
              disabled={githubLoading || submitting}
              isLoading={githubLoading}
              type="button"
              variant="secondary"
              size="md"
              className="w-full text-xs font-medium border-slate-800 hover:bg-slate-900 text-white"
              icon={Github}
            >
              Continue with GitHub
            </Button>

            {/* Instant Demo Sign-In Button */}
            <div className="pt-1">
              <button
                onClick={handleDemoAccess}
                disabled={submitting || githubLoading}
                type="button"
                className="w-full py-2 px-3 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-300 text-xs font-medium flex items-center justify-center gap-2 transition-all group disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
                <span>Instant Demo Sign-In (Architect Access)</span>
              </button>
            </div>
          </Card>

          {/* Link to Register */}
          <div className="text-center text-xs text-slate-400 font-sans">
            Don't have a Devra workspace yet?{" "}
            <Link
              to="/register"
              className="text-sky-400 hover:text-sky-300 font-medium underline-offset-4 hover:underline"
            >
              Create account
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
