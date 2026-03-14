"use client";

import {
  ChevronRight,
  BellDot,
  Menu,
  Search,
  Settings,
  LogOut,
  Logs,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/components/AuthContext";

export default function Nav() {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsUserMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 w-full h-14 backdrop-blur-md bg-white border-b border-red-200 flex items-center justify-between z-50 pl-6 pr-6 text-[#311B65]">
      {/* Left */}
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-semibold ">Prime Media</h1>

        <div className="hidden sm:flex items-center px-3 py-1.5 bg-gray-50 border border-red-200 rounded-md hover:border-red-300 transition-all">
          <Search size={16} className="" />
          <input
            type="search"
            placeholder="Search news..."
            className="bg-transparent outline-none px-2 text-sm focus:placeholder-gray-400 w-40 md:w-64"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button
            className="p-2 rounded hover:bg-gray-100 transition-all"
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>
          <button
            className="p-2 rounded hover:bg-gray-100 transition-all"
            aria-label="Notifications"
          >
            <BellDot size={20} />
          </button>
          <Link
            href="/settings"
            className="hidden md:block p-2 rounded hover:bg-gray-100 transition-all"
            aria-label="Settings"
          >
            <Settings size={20} />
          </Link>
        </div>

        <div className="relative flex items-center gap-3 border-l border-red-200 pl-4">
          <button
            type="button"
            className="flex items-center gap-3"
            onClick={() => setIsUserMenuOpen((v) => !v)}
          >
            <div className="h-8 w-8 rounded-full bg-[#311B65] flex items-center justify-center text-white text-sm font-medium">
              A
            </div>
            <div className="hidden md:flex flex-col items-start">
              <p className="text-sm font-medium text-gray-900">
                {user ? user.username : "Guest"}
              </p>
              <p className="text-xs">{user ? user.email : ""}</p>
            </div>
            <ChevronDown
              stroke="fill"
              size={16}
              className={`transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`}
            />
          </button>
          <Dropdown
            isOpen={isUserMenuOpen}
            setIsUserMenuOpen={setIsUserMenuOpen}
          />
        </div>
      </div>
    </header>
  );
}

// ChevronDown component (since it was used but not imported)
const ChevronDown = ({
  className,
  size,
  stroke,
}: {
  className?: string;
  size: number;
  stroke: string;
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

interface DropdownProps {
  isOpen: boolean;
  setIsUserMenuOpen: (value: boolean) => void;
}

function Dropdown({ isOpen, setIsUserMenuOpen }: DropdownProps) {
  const router = useRouter();

  const handleLogout = () => {
    try {
      localStorage.removeItem("auth");
      sessionStorage.removeItem("auth");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (_) {}
    router.replace("/login");
  };

  return (
    <div
      role="menu"
      className={`absolute top-[calc(100%+6px)] right-0 w-52 sm:w-60 p-2 bg-[var(--background-block)] backdrop-blur border border-[var(--border-light)] rounded-xl shadow-xl z-50 max-h-[70vh] overflow-hidden transition-all duration-150 origin-top-right ${
        isOpen
          ? "opacity-100 scale-100 pointer-events-auto"
          : "opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div className="px-2 py-1 text-xs text-[var(--Gray2-fr)]">
        Signed in as <span className="font-semibold text-blue-500">Alula</span>
      </div>
      <div className="my-1 h-px bg-[var(--border-light)]" />
      <Link
        href="/profile"
        className="block w-full text-sm text-blue-500 hover:bg-blue-500 hover:text-white transition-colors rounded-md px-2 py-1"
        role="menuitem"
        onClick={() => setIsUserMenuOpen(false)}
      >
        Profile
      </Link>
      <Link
        href="/settings"
        className="block w-full text-sm text-blue-500 hover:bg-blue-500 hover:text-white transition-colors rounded-md px-2 py-1"
        role="menuitem"
        onClick={() => setIsUserMenuOpen(false)}
      >
        Settings
      </Link>
      <div className="my-1 h-px bg-[var(--border-light)]" />
      <button
        type="button"
        onClick={handleLogout}
        className="w-full text-red-600 flex items-center justify-center rounded-md px-2 py-1 transition-transform duration-150 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Logout"
      >
        <LogOut size={18} className="mr-1" /> Log out
      </button>
    </div>
  );
}
