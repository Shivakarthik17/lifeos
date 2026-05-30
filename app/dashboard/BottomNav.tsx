"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./navConfig";

/**
 * Mobile-only bottom navigation. Hidden on md+ screens where the
 * left Sidebar takes over. Shows all module icons with short labels.
 */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-surface/90 backdrop-blur-md md:hidden">
      <ul className="flex items-stretch justify-between px-1">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-accent" : "text-muted hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
