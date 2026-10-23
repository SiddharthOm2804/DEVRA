import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import DevraLogo from "../components/ui/DevraLogo";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { clearError } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.resetPassword(token, password);
      if (res.success) {
        setSuccess(true);
        if (res.token) {
          localStorage.setItem("devra_token", res.token);
          if (res.user) {
            localStorage.setItem("devra_user", JSON.stringify(res.user));
          }
        }
      } else {
        setErrorMsg(res.message || "Password reset failed. Token may be invalid or expired.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        "Password reset failed. The reset link may have expired or already been used."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-abyssal-dark text-abyssal-ivory flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative antialiased">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <DevraLogo size="md" showText={false} />
            <span className="text-2xl font-bold tracking-tight text-abyssal-ivory font-sans">
              DEVRA
            </span>
          </Link>
          <h1 className="text-xl font-bold text-abyssal-ivory font-sans">
            Reset Your Password
          </h1>
          <p className="text-xs text-abyssal-secondary font-sans">
            Choose a strong, secure password for your Devra account.
          </p>
        </div>

        <Card className="p-6 sm:p-7 space-y-5 border-abyssal-border bg-abyssal-card shadow-card">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-abyssal-surface border border-abyssal-jade/40 text-abyssal-jade flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-abyssal-ivory font-sans">
                  Password Reset Successfully
                </h3>
                <p className="text-xs text-abyssal-secondary font-sans">
                  Your credentials have been securely updated. You can now access your workspace.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                className="w-full text-xs font-semibold shadow-jade-glow"
                onClick={() => navigate("/dashboard")}
                icon={ArrowRight}
              >
                Go to Console
              </Button>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-abyssal-error/40 text-xs text-rose-300 flex items-start gap-2.5 font-sans">
                  <AlertCircle className="w-4 h-4 text-abyssal-error shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-abyssal-secondary flex items-center gap-1.5 font-sans">
                    <Lock className="w-3.5 h-3.5 text-abyssal-muted" />
                    <span>New Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
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

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-abyssal-secondary flex items-center gap-1.5 font-sans">
                    <Lock className="w-3.5 h-3.5 text-abyssal-muted" />
                    <span>Confirm New Password</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-abyssal-surface border border-abyssal-border text-sm text-abyssal-ivory placeholder-abyssal-muted focus:outline-none focus:border-abyssal-jade transition-colors font-mono"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={submitting}
                  className="w-full text-xs font-semibold mt-2 shadow-jade-glow"
                  icon={ArrowRight}
                >
                  Update Password
                </Button>
              </form>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-abyssal-jade hover:underline font-sans"
                >
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
