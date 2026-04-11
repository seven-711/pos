"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Package, BarChart2, Receipt } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const coreLinks = [
    { href: "/", label: "Dash", icon: LayoutDashboard, isButton: false },
    { href: "/pos", label: "Sell", icon: Store, isButton: false },
    { href: "/inventory", label: "Stock", icon: Package, isButton: false },
    { href: "/analytics", label: "Stats", icon: BarChart2, isButton: false },
    { href: "/transactions", label: "Ledger", icon: Receipt, isButton: false },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-[var(--color-surface-container-highest)] border-t border-[var(--color-outline-variant)]/20 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] flex justify-around items-center z-[200] px-2 pb-safe rounded-t-2xl">
      {coreLinks.map((item, idx) => {
        const Icon = item.icon;
        const isActive = !item.isButton && pathname === item.href;
        
        return (
          <Link 
            key={item.href || idx} 
            href={item.href}
            onClick={(e) => {
              if (item.isButton) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all active:scale-90 touch-manipulation cursor-pointer select-none ${
              isActive ? "text-[var(--color-primary)] font-bold" : "text-[var(--color-on-surface-variant)]"
            }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Icon size={isActive ? 24 : 22} className="pointer-events-none" />
            <span className="text-[10px] font-bold uppercase tracking-widest pointer-events-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
