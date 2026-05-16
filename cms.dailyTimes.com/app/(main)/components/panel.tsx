"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../components/AuthContext";
import {
  ArrowBigRightDash,
  LayoutDashboard,
  Newspaper,
  Group,
  HardDrive,
  Users,
} from "lucide-react";

interface PanelProps {
  panel: boolean;
  setPanel: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export default function Panel({ panel, setPanel }: PanelProps) {
  return (
    <>
      <section className="fixed top-14 left-0 w-16 h-full bg-white text-white z-50">
        <div className="flex flex-col items-center space-y-6 h-full py-5">
          <Link
            href="/dashboard"
            className="bg-main rounded-md p-2"
            aria-label="Dashboard"
          >
            <LayoutDashboard />
          </Link>
          <Link
            href="/articles/view"
            className="bg-main rounded-md p-2"
            aria-label="Articles"
          >
            <Newspaper />
          </Link>
          <Link
            href="/categories"
            className="bg-main rounded-md p-2"
            aria-label="Categories"
          >
            <Group />
          </Link>
          <Link
            href="/files"
            className="bg-main rounded-md p-2"
            aria-label="Files"
          >
            <HardDrive />
          </Link>
          <Link
            href="/users"
            className="bg-main rounded-md p-2"
            aria-label="Users"
          >
            <Users />
          </Link>
        </div>
      </section>
      <FullPanel panel={panel} />
      {/* Arrow button - outside & centered */}
      <button
        className={`fixed top-14 left-16 z-40 transition-all text-main ${
          panel ? "rotate-180 left-68" : ""
        }`}
        onClick={() => setPanel((prev) => !prev)}
      >
        <ArrowBigRightDash size={20} />
      </button>
    </>
  );
}

interface FullPanelProps {
  panel: boolean;
}

export function FullPanel({ panel }: FullPanelProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  // State to track which dropdown is open (null = none)
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const isActive = (path: string) => pathname === path;

  const navGroups = [
    {
      label: "Articles",
      links: [
        { name: "Analytics", href: "/articles/analytics" },
        { name: "View", href: "/articles/view" },
        { name: "Write", href: "/articles/write" },
        { name: "Manage", href: "/articles/manage" },
      ],
    },
    {
      label: "Categories",
      links: [
        { name: "Overview", href: "/categories" },
        { name: "Create", href: "/categories/new" },
      ],
    },
    {
      label: "Files",
      links: [
        { name: "Library", href: "/files" },
        { name: "Upload", href: "/files/upload" },
      ],
    },
    ...(user?.is_superuser
      ? [
          {
            label: "Users",
            links: [
              { name: "Authorize", href: "/authorize-email" },
              { name: "Permissions", href: "/users/permissions" },
            ],
          },
        ]
      : []),
  ];

  return (
    <div
      className={`fixed top-14 left-16 w-52 h-[calc(100%-3.5rem)] bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-30 overflow-visible ${
        panel
          ? "opacity-100 translate-x-0"
          : "opacity-0 -translate-x-full pointer-events-none"
      }`}
    >
      <div className="flex flex-col h-full p-5 pl-0 space-y-2">
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

        {navGroups.map((group) => (
          <div key={group.label} className="relative">
            <button
              onClick={() =>
                setOpenMenu(openMenu === group.label ? null : group.label)
              }
              className={`w-full flex justify-between items-center px-4 py-3 rounded-lg text-gray-700 font-medium transition-all hover:bg-main/10 hover:text-main ${
                openMenu === group.label ? "bg-gray-100" : ""
              }`}
            >
              {group.label}
              <span className="text-xs">
                {openMenu === group.label ? "▲" : "▼"}
              </span>
            </button>

            {/* Absolute Dropdown Overlay */}
            {openMenu === group.label && (
              <div className="absolute left-0 top-full w-4/5 bg-white text-main border border-gray-200 rounded-lg shadow-xl z-50">
                <div className="">
                  {group.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpenMenu(null)}
                      className={`block px-4 py-2 border-b text-sm transition-colors ${
                        isActive(link.href)
                          ? "bg-main text-white"
                          : "hover:bg-main/5"
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
