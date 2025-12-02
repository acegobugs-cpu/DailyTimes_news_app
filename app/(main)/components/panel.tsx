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
  console.log("stored", user);
  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Helper function to check active link
  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div
      className={`fixed top-14 left-0 w-52 h-full bg-custom-nav border-r transition-all duration-300 ease-in-out scrollbar-hide z-30 ${
        panel
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 -translate-x-full pointer-events-none"
      }`}
    >
      <div className="flex space-x-2 h-full">
        <div className="text-main border-top border-left p-4 shadow-lg">
          <div className="flex flex-col space-y-4 items-start">
            <Link
              href="/dashboard"
              className={`border-2 border-white border-r-0 ml-4 p-2 w-full transition-colors ${
                isActive("/dashboard")
                  ? "bg-main text-custom-nav"
                  : "hover:bg-purple-600"
              }`}
            >
              <button className="w-full text-left">Home</button>
            </Link>

            <Link
              href="/articles"
              className={`border-2 border-white border-r-0 ml-4 p-2 w-full transition-colors ${
                isActive("/articles")
                  ? "bg-main text-custom-nav"
                  : "hover:bg-purple-600"
              }`}
            >
              <button className="w-full text-left">Manage Articles</button>
            </Link>

            <Link
              href="/categories"
              className={`border-2 border-white border-r-0 ml-4 p-2 w-full transition-colors ${
                isActive("/categories")
                  ? "bg-main text-custom-nav"
                  : "hover:bg-purple-600"
              }`}
            >
              <button className="w-full text-left">Manage Categories</button>
            </Link>

            <Link
              href="/files"
              className={`border-2 border-white border-r-0 ml-4 p-2 w-full transition-colors ${
                isActive("/files")
                  ? "bg-main text-custom-nav"
                  : "hover:bg-purple-600"
              }`}
            >
              <button className="w-full text-left">Manage Files</button>
            </Link>

            {user?.is_superuser && (
              <Link
                href="/authorize-email"
                className={`border-2 border-white border-r-0 ml-4 p-2 w-full transition-colors ${
                  isActive("/authorize-email")
                    ? "bg-main text-custom-nav"
                    : "hover:bg-purple-600"
                }`}
              >
                <button className="w-full text-left">Manage Users</button>
              </Link>
            )}
          </div>

          {/* Logout Button */}
          <div className="mt-36 w-full">
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 text-white ml-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
