import React, { Component, Suspense, lazy, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import PageTransition from "./components/ui/PageTransition";

// Code-split pages for instant initial load performance
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const RepositoryPage = lazy(() => import("./pages/RepositoryPage"));
const RepositoryDetailsPage = lazy(() => import("./pages/RepositoryDetailsPage"));
const CodeReviewPage = lazy(() => import("./pages/CodeReviewPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#080B11] flex flex-col items-center justify-center p-6 space-y-4">
      <div className="w-10 h-10 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin" />
      <span className="text-xs font-mono text-slate-400 tracking-wider">Loading Devra...</span>
    </div>
  );
}

class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Devra] Page render failed:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main role="alert" className="min-h-dvh bg-abyssal-dark text-abyssal-ivory flex items-center justify-center p-6">
          <section className="max-w-xl rounded-2xl border border-abyssal-error/40 bg-abyssal-card p-6 space-y-3">
            <h1 className="text-lg font-semibold">This page could not be displayed</h1>
            <p className="text-sm text-abyssal-secondary">Reload the page. If the problem continues, contact your Devra administrator.</p>
            {import.meta.env.DEV && (
              <pre className="overflow-auto whitespace-pre-wrap text-xs text-rose-300">{this.state.error.message}</pre>
            )}
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const recentActionClicks = useRef(new WeakMap());

  const guardRapidClicks = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const action = target?.closest("button, a[href], [role='button']");
    if (!action || action.hasAttribute("data-allow-rapid-click")) return;

    const now = performance.now();
    const previousClick = recentActionClicks.current.get(action);
    if (previousClick !== undefined && now - previousClick < 220) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    recentActionClicks.current.set(action, now);
  };

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <div className="contents" onClickCapture={guardRapidClicks}>
          <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public Pages */}
          <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
          <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
          <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
          <Route path="/reset-password/:token" element={<PageTransition><ResetPasswordPage /></PageTransition>} />

          {/* Protected Application Console Pages */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/dashbord" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/repositories"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <RepositoryPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/repositories/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <RepositoryDetailsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/repository" element={<Navigate to="/repositories" replace />} />
          <Route
            path="/reviews"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CodeReviewPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/review" element={<Navigate to="/reviews" replace />} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ChatPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback to Landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </div>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
