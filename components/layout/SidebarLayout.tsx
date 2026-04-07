"use client";

import React, { useState, useEffect } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopNav } from "@/components/layout/TopNav";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Package,
  BarChart2,
  FolderOpen,
  ClipboardList,
  Receipt,
  Wallet,
  PieChart,
  Users,
  X
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS / Sell", icon: Store },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: FolderOpen },
  { href: "/inventory", label: "Inventory", icon: ClipboardList },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/reports", label: "Reports", icon: PieChart },
  { href: "/users", label: "Users", icon: Users },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const renderNavLinks = (onClick?: () => void) =>
    navLinks.map((link) => {
      const Icon = link.icon;
      const isActive = pathname === link.href;
      return (
        <Link
          key={link.href}
          href={link.href}
          onClick={onClick}
          className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
            isActive
              ? "bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] font-semibold"
              : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
          }`}
        >
          <Icon size={20} />
          <span>{link.label}</span>
        </Link>
      );
    });

  return (
    <div className="flex h-screen w-full bg-[var(--color-surface)] relative overflow-hidden">

      {/* ── Mobile Drawer Overlay ── */}
      {/* Raised z-index to 500 to ensure it's ABOVE the bottom nav and everything else */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[500] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer panel */}
          <aside className="relative flex flex-col w-72 max-w-[85vw] bg-[var(--color-surface)] p-6 h-full shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="text-xl font-bold tracking-tight text-[var(--color-primary)] font-heading">
                POS ni Estela
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 -m-3 rounded-full text-[var(--color-outline)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-all touch-manipulation cursor-pointer"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 flex-1 pb-24">
              {renderNavLinks(() => setIsMobileMenuOpen(false))}
            </nav>
          </aside>
        </div>
      )}

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 surface-low p-6 border-r border-[var(--color-outline-variant)]/10 overflow-y-auto">
        <div className="mb-10 text-2xl font-bold tracking-tight text-[var(--color-primary)] font-heading">
          POS ni Estela
        </div>
        <nav className="flex flex-col gap-1 flex-1 pb-6">
          {renderNavLinks()}
        </nav>
      </aside>

      {/* ── Main Content Column ── */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 relative">
        <TopNav />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto w-full p-4 md:p-8 pb-32 md:pb-8 relative z-0">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <div className="md:hidden">
        <BottomNav onMenuClick={() => {
           // Standard state toggle - alert removed for cleaner UX, but z-index fix should solve it
           setIsMobileMenuOpen(true);
        }} />
      </div>
    </div>
  );
}
