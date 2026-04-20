"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, UserCircle, ShoppingCart, Menu, Moon, Sun } from "lucide-react";
import { useCart } from "@/lib/contexts/CartContext";
import { useNotifications } from "@/lib/contexts/NotificationContext";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { CartQuickView } from "@/components/cart/CartQuickView";


export function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const { totalQuantity, toggleCart, showCart } = useCart();
  const { unreadCount, toggleNotifications, showNotifications } = useNotifications();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
  const [isCartDesktopOpen, setIsCartDesktopOpen] = useState(false);
  const [isProfileDesktopOpen, setIsProfileDesktopOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [countdown, setCountdown] = useState(15);

  useEffect(() => { 
    setIsMounted(true); 
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Defer dispatch to avoid "setState during render" error
          setTimeout(() => window.dispatchEvent(new CustomEvent('global-sync')), 0);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);


  const handleNotificationClick = () => {
    setIsCartDesktopOpen(false); // Close other dropdowns
    setIsProfileDesktopOpen(false);
    toggleCart(false); // Close mobile cart if moving to notifications

    if (window.innerWidth < 768) {
      toggleNotifications(true);
    } else {
      setIsDesktopDropdownOpen(!isDesktopDropdownOpen);
    }
  };

  const handleCartClick = () => {
    setIsDesktopDropdownOpen(false); // Close other dropdowns
    setIsProfileDesktopOpen(false);
    toggleNotifications(false); // Close mobile notifications if moving to cart

    if (window.innerWidth < 768) {
      toggleCart(true);
    } else {
      setIsCartDesktopOpen(!isCartDesktopOpen);
    }
  };


  return (
    <header className="w-full min-h-16 h-auto shrink-0 bg-[var(--color-surface)] backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-[110] shadow-sm pointer-events-auto print:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Brand — Mobile & Desktop trigger */}
      <button
        onClick={onMenuClick}
        className="flex items-center gap-3 text-[var(--color-primary)] relative group cursor-pointer touch-manipulation active:scale-95 transition-transform md:hidden"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md shadow-primary/20 group-hover:bg-[var(--color-primary-container)] group-hover:text-[var(--color-primary)] transition-colors">
          <Menu size={20} strokeWidth={3} />
        </div>
        <span className="text-lg font-black font-heading select-none uppercase tracking-tighter hidden mini:block">
          ESTELA
        </span>
      </button>

      {/* Ecosystem Sync Indicator & Greeting */}
      <div className="flex items-center gap-4">
        {/* Desktop Greeting */}
        <div className="hidden lg:block text-sm text-[var(--color-on-surface-variant)] font-medium">
          Welcome back, Admin
        </div>

        {/* Global Sync Timer */}
        <div className="flex items-center gap-2 bg-surface-container-low px-2 md:px-3 py-1.5 rounded-full border border-outline-variant/10 shadow-sm group">
          <div className="relative w-4 h-4 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-outline-variant/10" />
              <circle 
                cx="8" cy="8" r="7" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="transparent" 
                className={`text-primary transition-all ${countdown === 15 ? 'duration-0' : 'duration-1000'} ease-linear`} 
                strokeDasharray="44" 
                strokeDashoffset={44 * (1 - countdown / 15)} 
              />
            </svg>
            <span className={`absolute text-[7px] font-black text-primary ${countdown <= 3 ? 'animate-pulse text-error' : ''}`}>{countdown}</span>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 hidden sm:block">Syncing Data</span>
        </div>
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-1 md:gap-3 text-[var(--color-on-surface-variant)] relative">
        <button
          aria-label="Toggle Theme"
          onClick={toggleTheme}
          className="p-3 rounded-full transition-colors cursor-pointer touch-manipulation hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
        </button>

        <div className="relative">
          <button
            aria-label="Notifications"
            onClick={handleNotificationClick}
            className={`p-3 rounded-full transition-colors cursor-pointer touch-manipulation relative ${isDesktopDropdownOpen || showNotifications
                ? 'bg-[var(--color-surface-container)] text-[var(--color-primary)]'
                : 'hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]'
              }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className="relative">
              <Bell size={22} className={unreadCount > 0 ? 'animate-bounce-slow' : ''} />
              {unreadCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-error text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg shadow-error/20 border-2 border-[var(--color-surface)] animate-in zoom-in-50 duration-300">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          </button>

          {/* Desktop Dropdown */}
          {isDesktopDropdownOpen && (
            <NotificationDropdown onClose={() => setIsDesktopDropdownOpen(false)} />
          )}
        </div>

        <div className="relative">
          <button
            aria-label="Shopping Cart"
            onClick={handleCartClick}
            className={`p-3 rounded-full transition-colors cursor-pointer touch-manipulation relative ${isCartDesktopOpen || showCart
                ? 'bg-[var(--color-surface-container)] text-[var(--color-primary)]'
                : 'hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]'
              }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className="relative">
              <ShoppingCart size={20} />
              {totalQuantity > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-error text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg shadow-error/20 border-2 border-[var(--color-surface)] animate-in zoom-in-50 duration-300">
                  {totalQuantity > 99 ? "99+" : totalQuantity}
                </span>
              )}
            </div>
          </button>

          {/* Cart Desktop Dropdown */}
          {isCartDesktopOpen && (
            <CartQuickView onClose={() => setIsCartDesktopOpen(false)} />
          )}
        </div>

        <div className="relative">
          <button
            aria-label="Profile Menu"
            onClick={() => {
              setIsDesktopDropdownOpen(false);
              setIsCartDesktopOpen(false);
              setIsProfileDesktopOpen(!isProfileDesktopOpen);
            }}
            className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors cursor-pointer touch-manipulation ${isProfileDesktopOpen ? 'bg-[var(--color-surface-container)] text-[var(--color-primary)]' : 'surface-highest hover:bg-[var(--color-surface-container)]'
              }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <UserCircle size={24} />
          </button>

          {isProfileDesktopOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/10 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="p-2">
                <button
                  onClick={() => {
                    setIsProfileDesktopOpen(false);
                    setShowSignOutModal(true);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-error hover:bg-error/10 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <UserCircle size={18} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showSignOutModal && isMounted && createPortal(
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-[var(--color-surface-container-lowest)] w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-[var(--color-error)]/10 animate-in zoom-in-95 duration-200">
            <h3 className="font-heading font-black text-xl text-[var(--color-error)] mb-2 uppercase tracking-tight">System Sign Out</h3>
            <p className="text-xs font-bold text-[var(--color-on-surface-variant)] opacity-80 mb-8 leading-relaxed">Are you sure you want to terminate the active session and log out securely?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSignOutModal(false)} className="flex-1 py-3.5 bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer">Cancel</button>
              <button onClick={() => { setShowSignOutModal(false); signOut(); }} className="flex-1 py-3.5 bg-[var(--color-error)] text-[var(--color-on-error)] font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-error/20 active:scale-95 transition-all cursor-pointer hover:bg-error/90">Sign Out</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </header>
  );
}
