"use client";

import { NavLink } from "react-router-dom";
import { RandomLetterSwap } from "@/components/ui/random-letter-swap";
import { cn } from "@/lib/utils";

export interface LetterSwapNavLink { to: string; label: string; end?: boolean }

// Sergio's wrapper, adapted to react-router links for the desktop top nav.
export function LetterSwapNav({ links, label = "Main", className }: { links: LetterSwapNavLink[]; label?: string; className?: string }) {
  return (
    <nav aria-label={label} className={cn("flex items-center gap-8", className)}>
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn("lsn-link", isActive && "active")}>
          {({ isActive }) => (
            <RandomLetterSwap
              className={cn("cursor-pointer font-medium text-sm hover:text-foreground", isActive ? "text-foreground" : "text-muted-foreground")}
              label={l.label}
              staggerDuration={0.025}
              transition={{ duration: 0.6, type: "spring" }}
            />
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default LetterSwapNav;
