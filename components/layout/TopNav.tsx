"use client";

import React, { useState } from "react";
import { Bell, UserCircle, ShoppingCart, Menu } from "lucide-react";
import { useCart } from "@/lib/contexts/CartContext";
import { useNotifications } from "@/lib/contexts/NotificationContext";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { CartQuickView } from "@/components/cart/CartQuickView";


export function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const { totalQuantity, toggleCart, showCart } = useCart();
  const { unreadCount, toggleNotifications, showNotifications } = useNotifications();
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
  const [isCartDesktopOpen, setIsCartDesktopOpen] = useState(false);


  const handleNotificationClick = () => {
    setIsCartDesktopOpen(false); // Close other dropdowns
    toggleCart(false); // Close mobile cart if moving to notifications
    
    if (window.innerWidth < 768) {
      toggleNotifications(true);
    } else {
      setIsDesktopDropdownOpen(!isDesktopDropdownOpen);
    }
  };

  const handleCartClick = () => {
    setIsDesktopDropdownOpen(false); // Close other dropdowns
    toggleNotifications(false); // Close mobile notifications if moving to cart
    
    if (window.innerWidth < 768) {
      toggleCart(true);
    } else {
      setIsCartDesktopOpen(!isCartDesktopOpen);
    }
  };


  return (
    <header className="w-full h-16 shrink-0 surface-low flex items-center justify-between px-4 md:px-8 z-[100] border-b border-[var(--color-outline-variant)]/10 shadow-sm relative pointer-events-auto print:hidden">
      {/* Brand — Mobile & Desktop trigger */}
      <button 
        onClick={onMenuClick}
        className="flex items-center gap-3 text-[var(--color-primary)] relative group cursor-pointer touch-manipulation active:scale-95 transition-transform"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md shadow-primary/20 group-hover:bg-[var(--color-primary-container)] group-hover:text-[var(--color-primary)] transition-colors">
          <Menu size={20} strokeWidth={3} />
        </div>
        <span className="text-lg font-black font-heading select-none uppercase tracking-tighter hidden mini:block">
          ESTELA
        </span>
      </button>

      {/* Desktop greeting */}
      <div className="hidden md:block text-sm text-[var(--color-on-surface-variant)]">
        Welcome back, Admin
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-3 text-[var(--color-on-surface-variant)] relative">
        <div className="relative">
          <button
            aria-label="Notifications"
            onClick={handleNotificationClick}
            className={`p-3 rounded-full transition-colors cursor-pointer touch-manipulation relative ${
              isDesktopDropdownOpen || showNotifications 
                ? 'bg-[var(--color-surface-container)] text-[var(--color-primary)]' 
                : 'hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]'
            }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Bell size={20} className={unreadCount > 0 ? 'animate-bounce-slow' : ''} />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 bg-error text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-surface-base shadow-sm">
                {unreadCount}
              </span>
            )}
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
            className={`p-3 rounded-full transition-colors cursor-pointer touch-manipulation relative ${
              isCartDesktopOpen || showCart 
                ? 'bg-[var(--color-surface-container)] text-[var(--color-primary)]' 
                : 'hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]'
            }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className="relative">
              <ShoppingCart size={20} />
              {totalQuantity > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-error text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg shadow-error/20 border-2 border-surface-container animate-in zoom-in-50 duration-300">
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
