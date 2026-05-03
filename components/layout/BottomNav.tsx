"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Package, BarChart2, Tag } from "lucide-react";
import { useTheme } from "@/lib/contexts/ThemeContext";

export function BottomNav({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname();
  const { theme } = useTheme();

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
                ? `text-white py-2 w-[90%] scale-100 ${
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#1E40AF] shadow-[0_10px_20px_rgba(37,99,235,0.2)]'
                      : 'bg-gradient-to-br from-[#0052D4] via-[#4364F7] to-[#6FB1FC] shadow-[0_10px_20px_rgba(0,82,212,0.2)]'
                  }`
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
