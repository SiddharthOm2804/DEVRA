import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Lock,
  Mail,
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
  const [localError, setLocalError] = useState(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState(null);
  const [forgotErrorMsg, setForgotErrorMsg] = useState(null);

  const { login, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

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
    } else if (
      res.code === "ACCOUNT_NOT_FOUND" ||
      res.message?.toLowerCase().includes("no account exists for this email")
    ) {
      clearError();
      navigate(`/register?email=${encodeURIComponent(email.trim())}&notice=account_not_found`);
    } else {
      setLocalError(res.message || "Invalid email or password.");
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotErrorMsg(null);
    setForgotSuccessMsg(null);

    if (!forgotEmail.trim()) {
      setForgotErrorMsg("Please provide your work email address.");
      return;
    }

    setForgotSubmitting(true);
    try {
      const res = await authApi.forgotPassword(forgotEmail.trim());
      setForgotSuccessMsg(res.message || "If an account with that email exists, reset instructions have been dispatched.");
    } catch (err) {
      setForgotErrorMsg(err.response?.data?.message || "Failed to process password reset request.");
    } finally {
      setForgotSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* ======================================================== */}
      {/* LEFT COLUMN: Premium Devra Branding & Visual             */}
      {/* ======================================================== */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 border-r border-abyssal-border bg-abyssal-dark overflow-hidden">
        {/* Subtle Ambient Lighting & Grid */}
        <div className="absolute inset-0 bg-devra-grid-dark pointer-events-none opacity-40"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-abyssal-jade/10 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-abyssal-citron/10 rounded-full blur-[140px] pointer-events-none"></div>

        {/* Top Branding */}
        <div className="relative z-10 space-y-4">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <DevraLogo size="md" showText={false} />
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-abyssal-ivory font-sans group-hover:text-abyssal-jade transition-colors">
                DEVRA
              </span>
              <span className="text-[11px] font-mono text-abyssal-muted uppercase tracking-widest">
                Developer Console
              </span>
            </div>
          </Link>

          <div className="pt-8 max-w-lg space-y-3">
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-abyssal-ivory leading-tight">
              Spatial AI Engineering Workspace.
            </h2>
            <p className="text-sm text-abyssal-secondary leading-relaxed font-sans">
              Continuous AST code review, WebGL codebase intelligence, and vector-backed repository reasoning in a unified developer console.
            </p>
          </div>
        </div>

        {/* Middle Feature Telemetry Card */}
        <div className="relative z-10 my-8 max-w-lg">
          <div className="p-5 rounded-2xl bg-abyssal-card border border-abyssal-border shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-abyssal-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-abyssal-jade animate-pulse"></div>
                <span className="text-xs font-mono font-medium text-abyssal-ivory">
                  Devra Architecture Engine v2.4
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-abyssal-jade/15 text-abyssal-jade border border-abyssal-jade/30">
                ACTIVE
              </span>
            </div>

            {/* Terminal snippet */}
            <div className="p-3 rounded-xl bg-abyssal-dark border border-abyssal-border font-mono text-xs text-abyssal-muted space-y-1.5 shadow-inner">
              <div className="flex items-center gap-2 text-abyssal-ivory">
                <span className="text-abyssal-jade">$</span>
                <span>devra analyze --active-repo core</span>
              </div>
              <div className="text-abyssal-jade flex items-center gap-1.5 text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>AST Graph indexed (24,810 semantic nodes)</span>
              </div>
              <div className="text-abyssal-jade flex items-center gap-1.5 text-[11px]">
                <Check className="w-3.5 h-3.5" />
                <span>Continuous PR telemetry initialized</span>
              </div>
              <div className="text-abyssal-citron flex items-center gap-1.5 text-[11px]">
                <Cpu className="w-3.5 h-3.5 text-abyssal-citron" />
                <span>Zero architectural circularities detected</span>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 text-[11px] font-mono text-abyssal-muted">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-abyssal-surface border border-abyssal-border">
                <ShieldCheck className="w-3.5 h-3.5 text-abyssal-jade shrink-0" />
                <span className="truncate text-abyssal-secondary">AST Security Scans</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-abyssal-surface border border-abyssal-border">
                <Layers className="w-3.5 h-3.5 text-abyssal-citron shrink-0" />
                <span className="truncate text-abyssal-secondary">3D Dependency Graph</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-abyssal-muted font-mono">
          <span>&copy; {new Date().getFullYear()} DEVRA Inc.</span>
          <span className="flex items-center gap-1.5 text-abyssal-jade">
            <span className="w-1.5 h-1.5 rounded-full bg-abyssal-jade animate-pulse"></span>
            All Systems Operational
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: Abyssal Jade Login Card                    */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 py-12 relative overflow-y-auto bg-abyssal-dark">
        {/* Subtle mobile brand header */}
        <div className="lg:hidden w-full max-w-md text-center mb-8 space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <DevraLogo size="sm" showText={false} />
            <span className="text-xl font-bold tracking-tight text-abyssal-ivory font-sans">
              DEVRA
            </span>
          </Link>
          <p className="text-xs text-abyssal-secondary font-sans">
            Spatial AI Engineering Workspace.
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
            <h1 className="text-2xl font-bold text-abyssal-ivory tracking-tight font-sans">
              Sign in to DEVRA
            </h1>
            <p className="text-xs text-abyssal-secondary font-sans font-mono">
              Welcome back. Enter your credentials to access your repositories.
            </p>
          </div>

          {/* Login Card */}
          <Card className="p-6 sm:p-7 space-y-5 border-abyssal-border bg-abyssal-card shadow-card">
            {/* Friendly Error Banner */}
            {displayError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-3.5 rounded-xl bg-rose-950/40 border border-abyssal-error/40 text-xs text-rose-300 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-abyssal-error shrink-0 mt-0.5" />
                <span className="leading-snug font-sans">{displayError}</span>
              </motion.div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Work Email Field */}
              <div className="space-y-1.5">
                <label htmlFor="work-email" className="text-xs font-medium text-abyssal-secondary flex items-center gap-1.5 font-sans">
                  <Mail className="w-3.5 h-3.5 text-abyssal-muted" />
                  <span>Work Email</span>
                </label>
                <input
                  id="work-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@company.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-abyssal-surface border border-abyssal-border text-sm text-abyssal-ivory placeholder-abyssal-muted focus:outline-none focus:border-abyssal-jade transition-colors font-mono"
                />
              </div>

              {/* Password Field with Show/Hide Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password-input" className="text-xs font-medium text-abyssal-secondary flex items-center gap-1.5 font-sans">
                    <Lock className="w-3.5 h-3.5 text-abyssal-muted" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotErrorMsg(null);
                      setForgotSuccessMsg(null);
                      setShowForgotModal(true);
                    }}
                    className="text-[11px] text-abyssal-jade hover:underline transition-colors font-sans"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-abyssal-surface border border-abyssal-border text-sm text-abyssal-ivory placeholder-abyssal-muted focus:outline-none focus:border-abyssal-jade transition-colors font-mono"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-abyssal-muted hover:text-abyssal-ivory transition-colors"
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
                    className="w-3.5 h-3.5 rounded bg-abyssal-surface border-abyssal-border text-abyssal-jade focus:ring-abyssal-jade/20 focus:ring-offset-0 cursor-pointer accent-abyssal-jade"
                  />
                  <span className="text-xs text-abyssal-secondary font-sans">
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
                className="w-full text-xs font-semibold mt-2 shadow-jade-glow"
                icon={ArrowRight}
              >
                Sign In to Devra
              </Button>
            </form>
          </Card>

          {/* Forgot Password Modal */}
          {showForgotModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-abyssal-dark/80 backdrop-blur-sm">
              <div className="bg-abyssal-card rounded-2xl border border-abyssal-border shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-abyssal-border">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-abyssal-ivory font-sans">
                      Reset Your Password
                    </h3>
                    <p className="text-xs text-abyssal-secondary font-sans">
                      Enter your account email to receive a secure recovery link.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="text-abyssal-muted hover:text-abyssal-ivory text-sm font-semibold p-1"
                  >
                    &times;
                  </button>
                </div>

                {forgotSuccessMsg ? (
                  <div className="space-y-4 py-2">
                    <div className="p-3.5 rounded-xl bg-abyssal-surface border border-abyssal-jade/40 text-xs text-abyssal-jade flex items-start gap-2.5 font-sans">
                      <CheckCircle2 className="w-4 h-4 text-abyssal-jade shrink-0 mt-0.5" />
                      <span>{forgotSuccessMsg}</span>
                    </div>
                    <Button
                      variant="secondary"
                      size="md"
                      className="w-full text-xs font-medium"
                      onClick={() => setShowForgotModal(false)}
                    >
                      Close
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    {forgotErrorMsg && (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-abyssal-error/40 text-xs text-rose-300 flex items-start gap-2 font-sans">
                        <AlertCircle className="w-4 h-4 text-abyssal-error shrink-0 mt-0.5" />
                        <span>{forgotErrorMsg}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-abyssal-secondary flex items-center gap-1.5 font-sans">
                        <Mail className="w-3.5 h-3.5 text-abyssal-muted" />
                        <span>Account Email</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="developer@company.com"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-abyssal-surface border border-abyssal-border text-sm text-abyssal-ivory placeholder-abyssal-muted focus:outline-none focus:border-abyssal-jade transition-colors font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        className="flex-1 text-xs"
                        onClick={() => setShowForgotModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={forgotSubmitting}
                        className="flex-1 text-xs font-semibold shadow-jade-glow"
                      >
                        Send Instructions
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
          {/* Link to Register */}
          <div className="text-center text-xs text-abyssal-muted font-sans">
            Don't have a Devra workspace yet?{" "}
            <Link
              to="/register"
              className="text-abyssal-jade hover:text-abyssal-ivory font-medium underline-offset-4 hover:underline"
            >
              Create account
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
