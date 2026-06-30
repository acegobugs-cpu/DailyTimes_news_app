"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
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

  // Fetch user from /api/auth/me
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data?? null);
        console.log("api/me", user);
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

  // Run on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.replace("/login");
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }, [router]);

  // Wrap fetchWithAuth so it automatically updates AuthContext
  const authFetch = useCallback(
    async (input: RequestInfo, init?: RequestInit) => {
      return fetchWithAuth(input, {
        ...init,
        updateUser: refreshUser, // automatically sync user after refresh
      });
    },
    [refreshUser],
  );

  // Context value
  const value: AuthContextType = {
    user,
    setUser,
    logout,
    isAuthenticated: !!user,
    isLoading,
    refreshUser,
    authFetch,
  };

  console.log("AUTH CONTEXT VALUE:", value);

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
