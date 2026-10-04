import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("devra_token"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("devra_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRepo, setActiveRepo] = useState("devra-core");

  // On mount: Check for OAuth callback token or verify stored session
  useEffect(() => {
    const verifyUserSession = async () => {
      // 1. Check if token was returned via OAuth callback query param
      const urlParams = new URLSearchParams(window.location.search);
      const oauthToken = urlParams.get("oauth_token");
      
      let effectiveToken = oauthToken || localStorage.getItem("devra_token") || sessionStorage.getItem("devra_token");
      
      if (oauthToken) {
        localStorage.setItem("devra_token", oauthToken);
        setToken(oauthToken);
        // Clean up URL without full page reload
        urlParams.delete("oauth_token");
        const remainingQuery = urlParams.toString();
        const cleanedUrl = window.location.pathname + (remainingQuery ? `?${remainingQuery}` : "");
        window.history.replaceState({}, document.title, cleanedUrl);
      }

      if (!effectiveToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authApi.getMe();
        if (response.success && response.user) {
          setUser(response.user);
          localStorage.setItem("devra_user", JSON.stringify(response.user));
          setToken(effectiveToken);
        }
      } catch (err) {
        console.warn("[Auth] Token expired or invalid, clearing local session.");
        localStorage.removeItem("devra_token");
        sessionStorage.removeItem("devra_token");
        localStorage.removeItem("devra_user");
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyUserSession();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh current user profile from server
  const refreshUser = async () => {
    try {
      const response = await authApi.getMe();
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem("devra_user", JSON.stringify(response.user));
        return response.user;
      }
    } catch (err) {
      console.warn("[Auth] Failed to refresh user profile:", err.message);
    }
    return null;
  };

  // Helper for friendly error messages
  const formatAuthError = (err, defaultMsg = "Something went wrong. Please try again.") => {
    const serverMsg = err.response?.data?.message || err.message;
    if (!serverMsg) return defaultMsg;
    if (serverMsg.toLowerCase().includes("invalid email or password")) {
      return "Invalid email or password.";
    }
    if (serverMsg.toLowerCase().includes("already exists")) {
      return "An account with this email address already exists.";
    }
    if (serverMsg.toLowerCase().includes("password")) {
      return "Password must be at least 6 characters long.";
    }
    return serverMsg;
  };

  // Login handler
  const login = async (email, password, rememberMe = true) => {
    setError(null);
    try {
      const data = await authApi.login({ email, password });
      if (data.success && data.token) {
        setToken(data.token);
        setUser(data.user);
        if (rememberMe) {
          localStorage.setItem("devra_token", data.token);
          localStorage.setItem("devra_user", JSON.stringify(data.user));
          sessionStorage.removeItem("devra_token");
        } else {
          sessionStorage.setItem("devra_token", data.token);
          localStorage.setItem("devra_user", JSON.stringify(data.user));
          localStorage.removeItem("devra_token");
        }
        return { success: true };
      }
      const friendlyMsg = data.message || "Invalid email or password.";
      setError(friendlyMsg);
      return { success: false, message: friendlyMsg };
    } catch (err) {
      const friendlyMsg = formatAuthError(err, "Invalid email or password.");
      setError(friendlyMsg);
      return { success: false, message: friendlyMsg };
    }
  };

  // Demo Login helper
  const demoLogin = async () => {
    setError(null);
    try {
      const loginRes = await login("architect@devra.ai", "SuperSecretPassword123!", true);
      if (loginRes.success) return loginRes;

      // If not yet registered, register it
      const regRes = await register({
        name: "Devra Architect",
        email: "architect@devra.ai",
        password: "SuperSecretPassword123!",
        organization: "Devra Systems"
      });
      return regRes;
    } catch (err) {
      const msg = "Something went wrong during demo login. Please try again.";
      setError(msg);
      return { success: false, message: msg };
    }
  };

  // Register handler
  const register = async (userData) => {
    setError(null);
    try {
      const data = await authApi.register(userData);
      if (data.success && data.token) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("devra_token", data.token);
        localStorage.setItem("devra_user", JSON.stringify(data.user));
        return { success: true };
      }
      const msg = data.message || "Unable to create account. Please try again.";
      setError(msg);
      return { success: false, message: msg };
    } catch (err) {
      const msg = formatAuthError(err, "Unable to create account. Please try again.");
      setError(msg);
      return { success: false, message: msg };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem("devra_token");
      sessionStorage.removeItem("devra_token");
      localStorage.removeItem("devra_user");
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token && !!user,
        isLoading,
        error,
        clearError,
        login,
        demoLogin,
        register,
        logout,
        refreshUser,
        activeRepo,
        setActiveRepo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
