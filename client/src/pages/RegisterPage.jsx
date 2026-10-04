import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Github,
  ArrowRight,
  User,
  Mail,
  Lock,
  Building2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Check
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import DevraLogo from "../components/ui/DevraLogo";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const { register, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setLocalError("Please fill in all required fields.");
      return;
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setLocalError("Please provide a valid email address.");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    const res = await register({
      name: trimmedName,
      email: trimmedEmail,
      organization: org.trim() || "Devra Engineering",
      password
    });
    setSubmitting(false);

    if (res.success) {
      navigate("/dashboard");
    } else {
      setLocalError(res.message || "Failed to create account. Please try again.");
    }
  };

  const handleGitHubSignUp = async () => {
    setLocalError(null);
    clearError();
    setGithubLoading(true);

    try {
      const res = await authApi.getGithubAuthUrl("login", "/dashboard");
      if (res.configured && res.url) {
        window.location.href = res.url;
      } else {
        setLocalError("GitHub OAuth credentials are not configured in the server environment (.env). Please register using the form.");
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
      {/* LEFT COLUMN: Devra Branding */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 border-r border-slate-800/80 bg-[#06090F] overflow-hidden">
        <div className="absolute inset-0 bg-devra-grid pointer-events-none opacity-40"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-[120px] pointer-events-none"></div>

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
              Create your Devra workspace.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed font-sans">
              Join engineering teams utilizing continuous AST review, automated pull request audits, and interactive 3D codebase topology graphs.
            </p>
          </div>
        </div>

        {/* Feature List */}
        <div className="relative z-10 my-8 max-w-lg space-y-3 font-sans">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0B0F19]/90 border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-white">Full AST Dependency Intelligence</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Automatically maps call graphs, circular imports, and architecture drift.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0B0F19]/90 border border-slate-800">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-white">Automated Security Audits</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Scan for API vulnerabilities, memory leaks, and antipatterns before merge.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>&copy; {new Date().getFullYear()} DEVRA Inc.</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Ready for Developer Onboarding
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: Registration Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 py-12 relative overflow-y-auto">
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
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              Get Started with Devra
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              Set up your developer profile and initialize your codebase environment.
            </p>
          </div>

          <Card className="p-6 sm:p-7 space-y-4 border-slate-800 bg-[#0C101A] shadow-xl">
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

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 font-sans">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Vance"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#080B11] border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 font-sans">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Organization / Team (Optional)</span>
                </label>
                <input
                  type="text"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="e.g. Acme Engineering"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#080B11] border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 font-sans">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Work Email</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@company.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#080B11] border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 font-sans">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Password (min. 6 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-[#080B11] border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={submitting}
                className="w-full text-xs font-semibold mt-2"
                icon={ArrowRight}
              >
                Create Devra Workspace
              </Button>
            </form>

            <div className="relative flex items-center justify-center pt-1">
              <div className="w-full border-t border-slate-800"></div>
              <span className="absolute bg-[#0C101A] px-3 text-[11px] font-mono text-slate-500 uppercase">
                Or
              </span>
            </div>

            <Button
              onClick={handleGitHubSignUp}
              disabled={githubLoading || submitting}
              isLoading={githubLoading}
              type="button"
              variant="secondary"
              size="md"
              className="w-full text-xs font-medium border-slate-800 hover:bg-slate-900 text-white"
              icon={Github}
            >
              Sign up with GitHub
            </Button>
          </Card>

          <div className="text-center text-xs text-slate-400 font-sans">
            Already have a Devra workspace?{" "}
            <Link
              to="/login"
              className="text-sky-400 hover:text-sky-300 font-medium underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
