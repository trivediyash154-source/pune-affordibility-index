"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";

const LINKS: [string, string][] = [
  ["/explorer", "Explorer"],
  ["/compare", "Compare"],
  ["/personas", "Personas"],
  ["/custom", "My Profile"],
  ["/methodology", "Methodology"],
  ["/research", "Research"],
];

export function Navigation() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-30 border-b border-[var(--border)] bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm">🏙️</span>
          <span className="font-display text-lg font-semibold text-text-primary">Pune Index</span>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent">IEEE Research</span>
        </Link>

        <div className="hidden gap-7 md:flex items-center">
          {LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`relative text-sm transition-colors ${
                path === href ? "text-accent" : "text-text-muted hover:text-text-primary"
              }`}
            >
              {label}
              {path === href && <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-accent" />}
            </Link>
          ))}
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-center gap-4 md:hidden">
          <ThemeToggle />
          <button className="text-text-muted" onClick={() => setOpen((o) => !o)} aria-label="menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-1 border-t border-[var(--border)] px-5 py-3 md:hidden">
          {LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`py-1 text-sm ${path === href ? "text-accent" : "text-text-muted"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
