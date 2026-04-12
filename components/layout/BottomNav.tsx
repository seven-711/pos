"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Package, BarChart2, Tag } from "lucide-react";

export function BottomNav({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname();

  const coreLinks = [
    { href: "/", label: "Dash", icon: LayoutDashboard, isButton: false },
    { href: "/pos", label: "Sell", icon: Store, isButton: false },
    { href: "/inventory", label: "Stock", icon: Package, isButton: false },
    { href: "/analytics", label: "Stats", icon: BarChart2, isButton: false },
    { href: "/products", label: "Products", icon: Tag, isButton: false },
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
            className={`flex flex-col items-center justify-center h-full transition-all duration-500 active:scale-90 touch-manipulation cursor-pointer select-none ${
              isActive ? "flex-[1.35] z-10" : "flex-1 z-0"
            }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className={`flex flex-col items-center justify-center gap-[3px] rounded-3xl transition-all duration-500 ${
              isActive 
                ? "bg-[var(--color-primary)] text-white shadow-lg shadow-primary/30 py-2 w-[90%] scale-100" 
                : "text-[var(--color-on-surface-variant)] py-1.5 w-auto scale-90 opacity-70 hover:opacity-100 hover:text-[var(--color-on-surface)]"
            }`}>
              <Icon size={isActive ? 18 : 22} className={`pointer-events-none transition-all ${isActive ? 'mb-0' : ''}`} />
              <span className={`font-bold uppercase tracking-widest pointer-events-none transition-all duration-500 ${
                isActive ? 'text-[9px] max-w-full truncate px-1' : 'text-[9px]'
              }`}>
                {item.label}
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
