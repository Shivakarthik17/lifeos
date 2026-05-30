"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { SVGProps } from "react";
import { navItems } from "./navConfig";

type IconProps = SVGProps<SVGSVGElement>;

function SettingsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8L4.2 7A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}
function LogOutIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] flex-col border-r border-border/60 bg-surface/50 px-4 py-6 backdrop-blur-md md:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2 text-lg font-semibold tracking-tight text-white transition-colors hover:text-accent">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-glow">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M4 12h4l2-7 4 14 2-7h4" />
          </svg>
        </span>
        LifeOS
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent-soft text-white"
                  : "text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-accent" : ""}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-1 border-t border-border/60 pt-4">
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname === "/dashboard/settings"
              ? "bg-accent-soft text-white"
              : "text-muted hover:bg-white/5 hover:text-white"
          }`}
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOutIcon className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
