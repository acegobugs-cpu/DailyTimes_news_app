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

interface HeaderProps {
  panel: boolean;
  setPanel: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export default function Nav({ panel, setPanel }: HeaderProps) {
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
    <header className="fixed top-0 inset-x-0 w-full h-14 backdrop-blur-lg bg-custom-nav text-black flex items-center justify-between z-50 pl-6">
      {/* Left side: Panel toggle + Search */}
      <div className="flex items-center justify-between w-lg">
        <div className="flex items-center justify-start">
          {/* Panel Toggle */}
          <button
            type="button"
            className={`text-blue-500 p-1 rounded transition-all duration-200 ease-in-out transform hover:scale-110 ${
              panel ? "rotate-180" : ""
            }`}
            onClick={() => setPanel((prev) => !prev)}
            aria-label="Expand navigation panel"
          >
            <Logs size={20} />
          </button>
        </div>

        <h1 className="text-2xl text-blue-500">The daily times</h1>

        {/* Search */}
        <div className="hidden sm:flex items-center px-2 border border-gray-600 rounded-md hover:border-blue-500 focus:placeholder-blue-500 transition-all">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search..."
            className="bg-transparent outline-none px-2 py-1 placeholder-black focus:placeholder-blue-500 transition-colors w-36 md:w-52"
            aria-label="Search"
          />
        </div>
      </div>

      {/* Right side: actions + user */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Action Buttons */}
        <div className="flex items-center space-x-2 text-blue-500">
          <button
            className="hidden md:block p-1 rounded hover:bg-blue-500 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>
          <button
            className="p-1 rounded hover:bg-blue-500 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Notifications"
          >
            <BellDot size={20} />
          </button>
          <Link
            href="/settings"
            className="hidden md:block p-1 rounded hover:bg-blue-500 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Settings"
          >
            <Settings size={20} />
          </Link>
        </div>

        {/* User Section */}
        <div
          ref={userMenuRef}
          className="relative flex items-center space-x-2 sm:space-x-3 border-l border-[var(--Gray-fr)] pl-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
        >
          <button
            type="button"
            className="flex items-center space-x-2 sm:space-x-3 rounded pr-1"
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
            aria-label="Open user menu"
            onClick={() => setIsUserMenuOpen((v) => !v)}
          >
            <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold transition-transform duration-200 ease-in-out hover:scale-105">
              <span>A</span>
            </div>
            <div className="hidden md:flex flex-col items-start">
              <p className="text-blue-500 text-sm font-bold leading-none">
                {user ? user?.username : "NoNe"}
              </p>
              <p className="text-[var(--Gray-fr)] text-xs leading-none">
                {user ? user?.email : "NONE"}
              </p>
            </div>
            <ChevronDown
              className={`hidden md:block transition-transform duration-200 ${
                isUserMenuOpen ? "rotate-180" : ""
              }`}
              size={18}
              stroke="var(--Gray-fr)"
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
