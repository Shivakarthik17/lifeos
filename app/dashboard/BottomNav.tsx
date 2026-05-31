"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { navItems } from "./navConfig";

/**
 * Mobile-only bottom navigation. Hidden on md+ screens where the
 * left Sidebar takes over. Shows all module icons with short labels.
 */
export default function BottomNav() {
  const pathname = usePathname();

  useEffect(() => {
    // Confirms the bottom nav mounted on the client (visible in browser console).
    console.log("[BottomNav] mounted — links:", navItems.map((n) => n.href));
  }, []);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-surface/95 backdrop-blur-md md:hidden"
      // Keep tap targets clear of the iOS home indicator / browser chrome.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-between">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex min-w-0 flex-1">
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-accent" : "text-muted hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="w-full truncate text-center leading-none">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
