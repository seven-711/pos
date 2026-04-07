"use client";

import React from "react";
import { Bell, UserCircle } from "lucide-react";

export function TopNav() {
  return (
    <header className="w-full h-16 shrink-0 surface-low flex items-center justify-between px-4 md:px-8 z-[40] border-b border-[var(--color-outline-variant)]/10 shadow-sm relative pointer-events-auto">
      {/* Brand — Mobile & Desktop (Hamburger removed from here as per user request to move to BottomNav) */}
      <div className="flex items-center gap-3 text-[var(--color-primary)] relative">
        <span className="text-xl font-bold font-heading select-none">
          POS ni Estela
        </span>
      </div>

      {/* Desktop greeting */}
      <div className="hidden md:block text-sm text-[var(--color-on-surface-variant)]">
        Welcome back, Admin
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-3 text-[var(--color-on-surface-variant)] relative">
        <button
          aria-label="Notifications"
          className="p-3 rounded-full hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)] transition-colors cursor-pointer touch-manipulation"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Bell size={20} />
        </button>
        <button
          aria-label="Profile"
          className="h-10 w-10 rounded-full surface-highest flex items-center justify-center hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer touch-manipulation"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <UserCircle size={24} />
        </button>
      </div>
    </header>
  );
}
