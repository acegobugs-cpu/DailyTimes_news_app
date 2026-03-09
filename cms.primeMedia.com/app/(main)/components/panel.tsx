"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../components/AuthContext";

type PanelProps = {
  panel: boolean;
};

export default function Panel({ panel }: PanelProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const handleLogout = () => {
    logout();
  };

  // Helper function to check active link
  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div
      className={`fixed top-14 left-0 w-52 h-[calc(100%-3.5rem)] bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-30 overflow-y-auto scrollbar-hide ${
        panel
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 -translate-x-full pointer-events-none"
      }`}
    >
      <div className="flex flex-col h-full p-5 pr-0">
        <div className="flex-1 space-y-2">
          <Link
            href="/dashboard"
            className={`flex items-center px-4 py-3 rounded-lg text-gray-700 font-medium transition-all ${
              isActive("/dashboard")
                ? "bg-main text-white"
                : "hover:bg-main/10 hover:text-main"
            }`}
          >
            Home
          </Link>

          <Link
            href="/articles"
            className={`flex items-center px-4 py-3 rounded-lg text-gray-700 font-medium transition-all ${
              isActive("/articles")
                ? "bg-main text-white"
                : "hover:bg-main/10 hover:text-main"
            }`}
          >
            Manage Articles
          </Link>

          <Link
            href="/categories"
            className={`flex items-center px-4 py-3 rounded-lg text-gray-700 font-medium transition-all ${
              isActive("/categories")
                ? "bg-main text-white"
                : "hover:bg-main/10 hover:text-main"
            }`}
          >
            Manage Categories
          </Link>

          <Link
            href="/files"
            className={`flex items-center px-4 py-3 rounded-lg text-gray-700 font-medium transition-all ${
              isActive("/files")
                ? "bg-main text-white"
                : "hover:bg-main/10 hover:text-main"
            }`}
          >
            Manage Files
          </Link>

          {user?.is_superuser && (
            <Link
              href="/authorize-email"
              className={`flex items-center px-4 py-3 rounded-lg text-gray-700 font-medium transition-all ${
                isActive("/authorize-email")
                  ? "bg-main text-white"
                  : "hover:bg-main/10 hover:text-main"
              }`}
            >
              Manage Users
            </Link>
          )}
        </div>

        {/* Logout */}
        <div className="pt-8 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-all"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Subtle accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-400/30 to-transparent" />
    </div>
  );
}
