import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
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
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import DevraLogo from "../components/ui/DevraLogo";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [searchParams] = useSearchParams();
  const accountNotFound = searchParams.get("notice") === "account_not_found";
  const suggestedEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(suggestedEmail);
  const [org, setOrg] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-abyssal-dark text-abyssal-ivory flex flex-col lg:flex-row antialiased">
      {/* LEFT COLUMN: Devra Branding */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 border-r border-abyssal-border bg-abyssal-dark overflow-hidden">
        <div className="absolute inset-0 bg-devra-grid-dark pointer-events-none opacity-40"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-abyssal-jade/10 rounded-full blur-[140px] pointer-events-none"></div>

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
              Create your spatial engineering workspace.
            </h2>
            <p className="text-sm text-abyssal-secondary leading-relaxed font-sans">
              Join engineering teams utilizing continuous AST review, automated pull request audits, and interactive 3D codebase topology graphs.
            </p>
          </div>
        </div>

        {/* Feature List */}
        <div className="relative z-10 my-8 max-w-lg space-y-3 font-sans">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-abyssal-card border border-abyssal-border shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-abyssal-jade shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-abyssal-ivory">Full AST Dependency Intelligence</h4>
              <p className="text-[11px] text-abyssal-muted leading-relaxed">
                Automatically maps call graphs, circular imports, and architecture drift.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-abyssal-card border border-abyssal-border shadow-lg">
            <ShieldCheck className="w-5 h-5 text-abyssal-citron shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-abyssal-ivory">Automated Security Audits</h4>
              <p className="text-[11px] text-abyssal-muted leading-relaxed">
                Scan for API vulnerabilities, memory leaks, and antipatterns before merge.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-abyssal-muted font-mono">
          <span>&copy; {new Date().getFullYear()} DEVRA Inc.</span>
          <span className="flex items-center gap-1.5 text-abyssal-jade">
            <span className="w-1.5 h-1.5 rounded-full bg-abyssal-jade animate-pulse"></span>
            Ready for Developer Onboarding
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: Registration Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 py-12 relative overflow-y-auto bg-abyssal-dark">
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
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-abyssal-ivory tracking-tight font-sans">
              Get Started with Devra
            </h1>
            <p className="text-xs text-abyssal-secondary font-sans">
              Set up your developer profile and initialize your codebase environment.
            </p>
          </div>

          <Card className="p-6 sm:p-7 space-y-4 border-abyssal-border bg-abyssal-card shadow-card">
            {accountNotFound && (
              <div role="status" className="p-3.5 rounded-xl bg-abyssal-jade/10 border border-abyssal-jade/30 text-sm text-abyssal-secondary flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-abyssal-jade shrink-0 mt-0.5" />
                  <span>No account exists for <strong className="text-abyssal-ivory break-all">{suggestedEmail}</strong>. Create an account first to continue.</span>
              </div>
            )}
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

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-abyssal-secondary flex items-center gap-1.5 font-sans">
                  <User className="w-3.5 h-3.5 text-abyssal-muted" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Vance"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-abyssal-surface border border-abyssal-border text-sm text-abyssal-ivory placeholder-abyssal-muted focus:outline-none focus:border-abyssal-jade font-sans transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-abyssal-secondary flex items-center gap-1.5 font-sans">
                  <Building2 className="w-3.5 h-3.5 text-abyssal-muted" />
                  <span>Organization / Team (Optional)</span>
                </label>
                <input
                  type="text"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="e.g. Acme Engineering"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-abyssal-surface border border-abyssal-border text-sm text-abyssal-ivory placeholder-abyssal-muted focus:outline-none focus:border-abyssal-jade font-sans transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-abyssal-secondary flex items-center gap-1.5 font-sans">
                  <Mail className="w-3.5 h-3.5 text-abyssal-muted" />
                  <span>Work Email</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@company.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-abyssal-surface border border-abyssal-border text-sm text-abyssal-ivory placeholder-abyssal-muted focus:outline-none focus:border-abyssal-jade font-mono transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-abyssal-secondary flex items-center gap-1.5 font-sans">
                  <Lock className="w-3.5 h-3.5 text-abyssal-muted" />
                  <span>Password (min. 6 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-abyssal-surface border border-abyssal-border text-sm text-abyssal-ivory placeholder-abyssal-muted focus:outline-none focus:border-abyssal-jade transition-colors font-mono"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-abyssal-muted hover:text-abyssal-ivory transition-colors"
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
                className="w-full text-xs font-semibold mt-2 shadow-jade-glow"
                icon={ArrowRight}
              >
                Create Account
              </Button>
            </form>
          </Card>

          <div className="text-center text-xs text-abyssal-muted font-sans">
            Already have a Devra workspace?{" "}
            <Link
              to="/login"
              className="text-abyssal-jade hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
