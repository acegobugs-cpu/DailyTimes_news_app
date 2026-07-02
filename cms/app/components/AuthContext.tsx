"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { User } from "../types/types";
import { fetchWithAuth } from "../lib/fetchWithAuth";

// -----------------
// Auth Context Types
// -----------------
interface AuthContextType {
  user: Partial<User> | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

// -----------------
// Create Context
// -----------------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// -----------------
// Auth Provider
// -----------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Partial<User> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use a mutable ref to store the CSRF token in memory securely (hidden from global window scripts)
  const csrfTokenRef = useRef<string | null>(null);

  // Helper to fetch a fresh CSRF token
  const fetchCSRFToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/proxy/auth/csrf/token", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        csrfTokenRef.current = data.csrf_token;
        return data.csrf_token;
      }
    } catch (err) {
      console.error("Failed to fetch CSRF token:", err);
    }
    return null;
  }, []);

  // Fetch user profile from Go backend backend
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy/auth/me", {
        cache: "no-store",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data ?? null);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to refresh user:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run initialization sequentially on app mount
  useEffect(() => {
    const initializeAuth = async () => {
      // 1. Fetch CSRF token first so it's ready in memory for any immediate mutations
      await fetchCSRFToken();
      // 2. Hydrate user session
      await refreshUser();
    };

    initializeAuth();
  }, [fetchCSRFToken, refreshUser]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (csrfTokenRef.current) {
        headers["X-CSRF-Token"] = csrfTokenRef.current;
      }

      await fetch("/api/proxy/auth/logout", {
        method: "POST",
        credentials: "include",
        headers,
      });
    } catch (err) {
      console.error("Logout backend notification failed:", err);
    } finally {
      // Always wipe memory tokens and redirect regardless of clean network responses
      csrfTokenRef.current = null;
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  // Intercepting Fetch Wrapper
  const authFetch = useCallback(
    async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
      const method = (init?.method || "GET").toUpperCase();
      const stateChangingMethods = ["POST", "PUT", "DELETE", "PATCH"];

      // Setup headers mapping
      const headers = new Headers(init?.headers);

      // Automatically inject the CSRF token for mutations if present in memory
      if (stateChangingMethods.includes(method)) {
        // If we missing a token mid-session, attempt an on-the-fly recovery fetch
        if (!csrfTokenRef.current) {
          await fetchCSRFToken();
        }
        if (csrfTokenRef.current) {
          headers.set("X-CSRF-Token", csrfTokenRef.current);
        }
      }

      // Execute request through token auto-refresh lifecycle framework
      const response = await fetchWithAuth(input, {
        ...init,
        headers,
        updateUser: refreshUser,
      });

      // Edge case handling: If server returns a 403 Forbidden due to an expired/invalid CSRF token,
      // refresh it automatically and try the request exactly one more time.
      if (response.status === 403 && stateChangingMethods.includes(method)) {
        const freshToken = await fetchCSRFToken();
        if (freshToken) {
          headers.set("X-CSRF-Token", freshToken);
          return fetchWithAuth(input, { ...init, headers, updateUser: refreshUser });
        }
      }

      return response;
    },
    [refreshUser, fetchCSRFToken],
  );

  const value: AuthContextType = {
    user,
    setUser,
    logout,
    isAuthenticated: !!user,
    isLoading,
    refreshUser,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// -----------------
// Custom Hook
// -----------------
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}