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
  CheckCircle2,
  AlertCircle
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

  // Global Toast State
  const [toast, setToast] = useState<{show: boolean, msg: string, type: 'success' | 'error'}>({show: false, msg: '', type: 'success'});

  useEffect(() => {
    const handleToast = (e: any) => {
      // Defer state update to avoid 'component hasn't mounted yet' sync collisions during context re-renders
      setTimeout(() => {
        setToast({ show: true, msg: e.detail.msg, type: e.detail.type });
        setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
      }, 10);
    };
    window.addEventListener('global-toast', handleToast);
    return () => window.removeEventListener('global-toast', handleToast);
  }, []);

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
    <div className="flex h-dvh w-full bg-[var(--color-surface)] relative overflow-hidden">


      {/* ── Mobile Drawer Overlay ── */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[500] flex animate-in fade-in duration-300">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer panel */}
          <aside className="relative flex flex-col w-72 max-w-[85vw] bg-[var(--color-surface)] p-6 h-full shadow-2xl overflow-y-auto custom-scrollbar animate-in slide-in-from-left duration-500 ease-ios">
            <div className="flex justify-between items-start mb-8">
              <div className="w-11 h-auto shrink-0 relative flex items-center justify-center dark:hidden mb-8">
                <img src="/logo.png" alt="POS ni Estela Logo" className="w-11 h-11 object-contain drop-shadow-md" />
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
        <aside className="hidden md:flex flex-col w-64 shrink-0 surface-low p-6 border-r border-[var(--color-outline-variant)]/10 overflow-y-auto custom-scrollbar print:hidden">
          <div className="mb-8 w-16 h-auto shrink-0 relative flex items-center justify-start dark:hidden">
            <img src="/logo.png" alt="POS ni Estela Logo" className="w-16 h-16 object-contain drop-shadow-md" />
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
            id="main-scroll"
            className={`
              absolute inset-0 overflow-y-auto custom-scrollbar w-full p-3 md:p-6 pb-48 md:pb-40 z-0 transition-transform duration-500 ease-ios
              ${(showNotifications || showCart) ? 'translate-x-[-100%] md:translate-x-0' : 'translate-x-0'}
            `}
          >
            <div className="w-full">
              {children}
            </div>
          </main>

          {/* Dedicated Notification View (Mobile Slide) */}
          <div 
            className={`
              absolute inset-0 md:hidden bg-white z-[300] transition-transform duration-500 ease-ios
              ${showNotifications ? 'translate-x-0 shadow-2xl' : (showCart ? 'translate-x-[-100%]' : 'translate-x-[100%]')}
            `}
          >
            <NotificationMobileView />
          </div>


          {/* Dedicated Cart View (Mobile Slide) */}
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
        <BottomNav hidden={showNotifications || showCart} />
      )}

      </div>

      {/* ── Global Toast ── */}
      {toast.show && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 md:bottom-auto md:top-6 md:right-6 md:left-auto md:translate-x-0 z-[600] ${toast.type === 'success' ? 'bg-secondary' : 'bg-error'} text-on-secondary px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 md:slide-in-from-top-2 duration-300 w-full max-w-[280px] md:max-w-xs border border-white/10`}>
          <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            {toast.type === 'success' ? <CheckCircle2 size={16} strokeWidth={3} /> : <AlertCircle size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[11px] tracking-tight uppercase opacity-80">{toast.type === 'success' ? 'Success' : 'Error'}</p>
            <p className="text-[12px] font-bold leading-tight truncate">{toast.msg}</p>
          </div>
          <button onClick={() => setToast(prev => ({...prev, show: false}))} className="opacity-40 hover:opacity-100 transition-opacity p-1 ml-1 cursor-pointer touch-manipulation">
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  );
}
