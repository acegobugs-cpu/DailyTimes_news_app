"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import { apiClient } from "../lib/api";

export default function Login() {
  const [form, setForm] = useState({ email_or_username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setUser, isAuthenticated, refreshUser, authFetch } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authFetch("/api/proxy/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_or_username: form.email_or_username,
          password: form.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      const { user } = await response.json();
      setUser(user);

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#311B65] via-[#311B65]/95 to-[#1e1142]"></div>
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md p-10 rounded-2xl shadow-2xl bg-white/95 backdrop-blur-sm border border-white/10">
        <h1 className="text-4xl font-bold text-center mb-8 text-[#311B65] tracking-tight">
          Prime Media
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              name="email_or_username"
              placeholder="Username or Email"
              value={form.email_or_username}
              onChange={handleChange}
              required
              className="w-full px-5 py-4 rounded-xl border border-gray-300 focus:border-[#311B65] focus:ring-2 focus:ring-[#311B65]/30 bg-white/80 transition-all duration-200 text-gray-900 placeholder-gray-500 text-lg"
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-5 py-4 rounded-xl border border-gray-300 focus:border-[#311B65] focus:ring-2 focus:ring-[#311B65]/30 bg-white/80 transition-all duration-200 text-gray-900 placeholder-gray-500 text-lg"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#311B65] transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && (
            <p className="text-red-600/90 text-sm text-center font-medium bg-red-50/80 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#311B65] text-white py-4 px-6 rounded-xl text-lg font-semibold hover:bg-[#3c2478] focus:ring-4 focus:ring-[#311B65]/40 disabled:opacity-60 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Subtle accent line */}
        <div className="mt-8 h-1 bg-gradient-to-r from-transparent via-red-400/40 to-transparent rounded-full max-w-[180px] mx-auto"></div>
      </div>
    </div>
  );
}
