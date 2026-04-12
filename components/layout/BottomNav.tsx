"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Package, BarChart2, Receipt } from "lucide-react";

export function BottomNav({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname();

  const coreLinks = [
    { href: "/", label: "Dash", icon: LayoutDashboard, isButton: false },
    { href: "/pos", label: "Sell", icon: Store, isButton: false },
    { href: "/inventory", label: "Stock", icon: Package, isButton: false },
    { href: "/analytics", label: "Stats", icon: BarChart2, isButton: false },
    { href: "/transactions", label: "Ledger", icon: Receipt, isButton: false },
  ];

  return (
    <nav className={`md:hidden fixed bottom-5 left-4 right-4 h-16 bg-[var(--color-surface-container-highest)]/95 backdrop-blur-xl border border-[var(--color-outline-variant)]/20 shadow-[0_12px_40px_rgba(0,0,0,0.25)] flex justify-around items-center z-[200] px-2 pb-0 rounded-3xl transition-transform duration-500 print:hidden ${hidden ? 'translate-y-[200%]' : 'translate-y-0'}`}>
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
