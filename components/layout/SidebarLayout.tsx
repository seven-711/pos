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

import { useNotifications } from "@/lib/contexts/NotificationContext";
import { useSession } from "@/lib/contexts/SessionContext";
import { useCart } from "@/lib/contexts/CartContext";
import { NotificationMobileView } from "@/components/notifications/NotificationMobileView";
import { CartMobileView } from "@/components/cart/CartMobileView";


export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { showNotifications, toggleNotifications } = useNotifications();
  const { showCart, toggleCart } = useCart();
  const { isLayoutHidden } = useSession();

  // Swipe Gesture Handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [startX, setStartX] = useState<number>(0);
  const swipeThreshold = 50;
  const edgeThreshold = 60; // Distance from edge to trigger swipe

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.targetTouches[0].clientX);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > swipeThreshold;
    const isRightSwipe = distance < -swipeThreshold;

    // 1. DASHBOARD GESTURES (When nothing is open)
    if (!showNotifications && !showCart) {
      if (isRightSwipe && startX < edgeThreshold) {
        setIsMobileMenuOpen(true);
      } else if (isLeftSwipe) {
        toggleNotifications(true);
      }
    }
    // 2. NOTIFICATION GESTURES
    else if (showNotifications) {
      if (isLeftSwipe) {
        toggleCart(true); // Notifications closes automatically via effect
      } else if (isRightSwipe) {
        toggleNotifications(false); // Return to dashboard
      }
    }
    // 3. CART GESTURES
    else if (showCart) {
      if (isRightSwipe) {
        toggleNotifications(true); // Return to Notifications, Cart closes via effect
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Mutual Exclusion Watcher: Ensure sync between contexts
  useEffect(() => {
    if (showNotifications) {
      toggleCart(false);
      setIsMobileMenuOpen(false);
    }
  }, [showNotifications]);

  useEffect(() => {
    if (showCart) {
      toggleNotifications(false);
      setIsMobileMenuOpen(false);
    }
  }, [showCart]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      toggleCart(false);
      toggleNotifications(false);
    }
  }, [isMobileMenuOpen]);

  // Close menu and notifications when pathname changes
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
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[500] flex animate-in fade-in duration-300">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer panel */}
          <aside className="relative flex flex-col w-72 max-w-[85vw] bg-[var(--color-surface)] p-6 h-full shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-500 ease-ios">
            <div className="flex justify-between items-center mb-8">
              <div className="text-xl font-black tracking-tight text-[var(--color-primary)] font-heading uppercase">
                ESTELA
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
      {!isLayoutHidden && (
        <aside className="hidden md:flex flex-col w-64 shrink-0 surface-low p-6 border-r border-[var(--color-outline-variant)]/10 overflow-y-auto print:hidden">
          <div className="mb-10 text-2xl font-bold tracking-tight text-[var(--color-primary)] font-heading">
            POS ni Estela
          </div>
          <nav className="flex flex-col gap-1 flex-1 pb-6">
            {renderNavLinks()}
          </nav>
        </aside>
      )}


      <div className="flex flex-col flex-1 min-w-0 min-h-0 relative">
        {!isLayoutHidden && <TopNav onMenuClick={() => setIsMobileMenuOpen(true)} />}


        {/* ── Sliding View Container ── */}
        <div 
          className="flex-1 relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Primary Content View */}
          <main 
            className={`
              absolute inset-0 overflow-y-auto w-full p-3 md:p-6 pb-48 md:pb-40 z-0 transition-transform duration-500 ease-ios
              ${(showNotifications || showCart) ? 'translate-x-[-100%] md:translate-x-0' : 'translate-x-0'}
            `}
          >
            <div className="w-full">
              {children}
            </div>
          </main>

          {/* Dedicated Notification View (Mobile Slide from RIGHT) */}
          <div 
            className={`
              absolute inset-0 md:hidden bg-white z-[300] transition-transform duration-500 ease-ios
              ${showNotifications ? 'translate-x-0 shadow-2xl' : 'translate-x-[100%]'}
            `}
          >
            <NotificationMobileView />
          </div>


          {/* Dedicated Cart View (Mobile Slide from RIGHT) */}
          <div 
            className={`
              absolute inset-0 md:hidden bg-white z-[301] transition-transform duration-500 ease-ios
              ${showCart ? 'translate-x-0 shadow-2xl' : 'translate-x-[100%]'}
            `}
          >
            <CartMobileView />
          </div>

        </div>


      {/* ── Mobile Bottom Navigation ── */}
      {!isLayoutHidden && (
        <div className={`md:hidden print:hidden transition-transform duration-500 ${ (showNotifications || showCart) ? 'translate-y-full' : 'translate-y-0' }`}>
          <BottomNav />
        </div>
      )}


      </div>
    </div>
  );
}
