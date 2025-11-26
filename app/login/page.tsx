"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthContext";
import { apiClient } from "../lib/api";
import Cookies from "js-cookie";

export default function Login() {
  const [form, setForm] = useState({ email_or_username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login, token } = useAuth();

  useEffect(() => {
    if (token) router.push("/(main)");
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient.loginUser({
        email: form.email_or_username, // Changed to match your API expectation
        password: form.password,
      });

      // Store token in cookies for middleware access
      Cookies.set("token", response.token, {
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      login(response.token, response.user);
      router.push("/(main)");
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid email or password");
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
    <div className="w-full max-w-sm p-6 rounded-lg shadow-md bg-white dark:bg-gray-800">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
        Login
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            name="email_or_username"
            placeholder="Email or Username"
            value={form.email_or_username}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            disabled={isLoading}
          />
        </div>

        <div>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            disabled={isLoading}
          />
        </div>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
