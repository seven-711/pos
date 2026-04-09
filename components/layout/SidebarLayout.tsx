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
  X,
  PlayCircle,
  Clock
} from "lucide-react";
import { useSession } from "@/lib/contexts/SessionContext";

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
  const [isStatusExpanded, setIsStatusExpanded] = useState(false);
  const { activeSession, openSession, closeSession, isLayoutHidden } = useSession();

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
      <aside className="hidden md:flex flex-col w-64 shrink-0 surface-low p-6 border-r border-[var(--color-outline-variant)]/10 overflow-y-auto print:hidden">
        <div className="mb-10 text-2xl font-bold tracking-tight text-[var(--color-primary)] font-heading">
          POS ni Estela
        </div>
        <nav className="flex flex-col gap-1 flex-1 pb-6">
          {renderNavLinks()}
        </nav>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 min-h-0 relative">
        <TopNav />

        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto w-full p-3 md:p-6 pb-48 md:pb-40 relative z-0">
          <div className={`transition-all duration-700 w-full ${(!activeSession && (pathname === '/pos' || pathname === '/')) ? 'opacity-40 blur-sm grayscale pointer-events-none select-none' : 'opacity-100 blur-0'}`}>
            {children}
          </div>
        </main>

        {/* ── Desktop Terminal Status Footer (Original Structure) ── */}
        {!isLayoutHidden && (
          <div className="hidden md:flex fixed bottom-0 left-64 right-0 z-[10] p-4 bg-[var(--color-surface-container-low)] shadow-[0_-4px_24px_rgba(0,0,0,0.05)] border-t border-[var(--color-outline-variant)]/10 print:hidden">
            <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-4">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${activeSession ? 'bg-secondary/10 border-secondary/20 text-secondary' : 'bg-surface-container border-outline-variant/10 text-on-surface-variant opacity-40'}`}>
                <Clock size={22} className={activeSession ? 'animate-pulse' : ''} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-2 h-2 rounded-full ${activeSession ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"}`} />
                  <h3 className="font-black text-sm font-heading text-[var(--color-primary)] uppercase tracking-tight">
                    {activeSession ? "System Active" : "Terminal Offline"}
                  </h3>
                </div>
                <p className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase opacity-60">
                  {activeSession ? "Ready for Transactions" : "Session Required to Enable UI"}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => closeSession()} 
                disabled={!activeSession}
                className={`px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  activeSession 
                  ? "bg-[var(--color-error)] text-white hover:scale-105 active:scale-95 shadow-lg shadow-error/20 cursor-pointer" 
                  : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] opacity-20 cursor-not-allowed"
                }`}
              >
                CLOSE
              </button>
              <button
                onClick={() => openSession()}
                disabled={!!activeSession}
                className={`px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  !activeSession 
                  ? "bg-[var(--color-primary)] text-white hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 cursor-pointer" 
                  : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] opacity-20 cursor-not-allowed"
                }`}
              >
                <PlayCircle size={14} />
                OPEN
              </button>
            </div>
            </div>
          </div>
        )}

        {/* ── Mobile Terminal Status Orb ── */}
        {!isLayoutHidden && (
          <div 
            onClick={() => !isStatusExpanded && setIsStatusExpanded(true)}
            className={`
              md:hidden fixed z-[10] transition-all duration-700 ease-in-out cursor-pointer overflow-hidden print:hidden
              ${isStatusExpanded 
                ? "bottom-24 left-4 right-4 h-16 rounded-full p-2 bg-[var(--color-surface-container-low)]/95 backdrop-blur-2xl border-[var(--color-outline-variant)]/20 shadow-2xl" 
                : `bottom-24 left-4 w-14 h-14 rounded-full p-0 flex items-center justify-center shadow-xl border-2 ${activeSession ? "bg-red-500 border-red-400 shadow-red-500/40 text-white" : "bg-green-600 border-green-500 shadow-green-600/40 text-white"}`}
              border shadow-[0_-4px_24px_rgba(0,0,0,0.05)]
            `}
          >
           <div className={`flex items-center h-full transition-all duration-500 ${isStatusExpanded ? "justify-between px-2 gap-4" : "justify-center"}`}>
             <div className="flex items-center gap-3 shrink-0">
               <div className={`
                 flex items-center justify-center transition-all duration-500 relative
                 ${isStatusExpanded ? "w-10 h-10 rounded-xl border bg-surface-container" : "w-full h-full rounded-full"}
                 ${isStatusExpanded ? (activeSession ? 'text-secondary' : 'text-on-surface-variant opacity-40') : 'text-white'}
               `}>
                 <Clock size={isStatusExpanded ? 20 : 28} className={activeSession ? 'animate-pulse' : ''} />
               </div>
               <div className={`transition-all duration-500 origin-left ${isStatusExpanded ? "scale-100 opacity-100 block" : "hidden"}`}>
                 <div className="flex items-center gap-2 mb-0.5">
                   <div className={`w-2 h-2 rounded-full ${activeSession ? "bg-red-500" : "bg-green-500"}`} />
                   <h3 className="font-black text-[10px] font-heading text-[var(--color-primary)] uppercase tracking-tight leading-none">
                     {activeSession ? "ACTIVE" : "OFFLINE"}
                   </h3>
                 </div>
               </div>
             </div>
             
             <div className={`
               flex items-center gap-2 transition-all duration-500
               ${isStatusExpanded ? "scale-100 opacity-100" : "translate-x-20 scale-0 opacity-0"}
             `}>
               <button
                 onClick={(e) => { e.stopPropagation(); closeSession(); setIsStatusExpanded(false); }} 
                 disabled={!activeSession}
                 className={`px-6 py-2.5 rounded-full font-black text-[9px] uppercase tracking-widest transition-all ${
                   activeSession ? "bg-[var(--color-error)] text-white" : "bg-surface-container text-on-surface-variant opacity-20"
                 }`}
               >
                 CLOSE
               </button>
               <button
                 onClick={(e) => { e.stopPropagation(); openSession(); setIsStatusExpanded(false); }}
                 disabled={!!activeSession}
                 className={`px-6 py-2.5 rounded-full font-black text-[9px] uppercase tracking-widest transition-all ${
                   !activeSession ? "bg-[var(--color-primary)] text-white" : "bg-surface-container text-on-surface-variant opacity-20"
                 }`}
               >
                 OPEN
               </button>
               <button onClick={(e) => { e.stopPropagation(); setIsStatusExpanded(false); }} className="p-2 text-on-surface-variant opacity-40">
                 <X size={20} />
               </button>
             </div>
           </div>
        </div>
      )}

      {/* ── Mobile Bottom Navigation ── */}
      <div className="md:hidden print:hidden">
        <BottomNav onMenuClick={() => setIsMobileMenuOpen(true)} />
      </div>
      </div>
    </div>
  );
}
