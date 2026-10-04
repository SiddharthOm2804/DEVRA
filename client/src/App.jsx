import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";

// Code-split pages for instant initial load performance
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
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

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

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
    </AuthProvider>
  );
}
