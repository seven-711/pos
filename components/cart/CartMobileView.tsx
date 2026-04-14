"use client";

import React, { useState } from "react";
import { useNotifications } from "@/lib/contexts/NotificationContext";
import { useCart } from "@/lib/contexts/CartContext";
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight,
  Package,
  ChevronLeft,
  ShoppingCart,
  Receipt,
  Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";

export function CartMobileView() {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const { 
    cart, 
    removeFromCart, 
    clearCart, 
    addToCart, 
    calculateSubtotal,
    getItemTotal,
    toggleCart,
    completeSale,
    isProcessing 
  } = useCart();

  const handleUpdateQty = (item: any, delta: number) => {
    if (item.quantity + delta > 0) {
      addToCart(item, delta);
    } else {
      removeFromCart(item.id);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(n);

  const handleCheckout = async () => {
    const result = await completeSale();
    if (result.success) {
      if (result.subtotal !== undefined) {
        addNotification({
          title: 'Sale Completed',
          message: `A transaction of ₱${result.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} was ledgered.`,
          type: 'success',
          action: { label: 'Details', href: '/transactions' }
        });
        window.dispatchEvent(new CustomEvent('global-toast', { 
          detail: { 
            msg: `Sale complete! ₱${result.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ledgered.`, 
            type: 'success' 
          } 
        }));
      }
      toggleCart(false);
    } else {
      alert(result.message); // Fallback for error if no toast context yet
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface-container-lowest)] relative overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-outline-variant/10 flex items-center justify-between bg-surface-base sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => toggleCart(false)}
            className="p-2 -ml-2 hover:bg-surface-container rounded-full text-primary active:scale-90 transition-all cursor-pointer"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-black font-heading text-primary uppercase tracking-tight italic">Your Cart</h2>
        </div>
        <button 
          onClick={clearCart}
          disabled={cart.length === 0 || isProcessing}
          className="p-2 text-error hover:bg-error/10 rounded-xl transition-all flex items-center gap-1 cursor-pointer disabled:opacity-30"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto pb-60">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 px-10 text-center">
            <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mb-6 opacity-20">
              <ShoppingCart size={48} />
            </div>
            <h3 className="text-lg font-black font-heading text-on-surface uppercase mb-2">Cart is Empty</h3>
            <p className="text-sm text-on-surface-variant font-bold leading-relaxed opacity-60">Add items from the POS or Inventory to start a transaction.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/5">
            {cart.map((item) => (
              <div key={item.id} className="px-6 py-6 flex gap-5 active:bg-surface-container/10 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant/10 overflow-hidden">
                   {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                        <Package size={24} className="text-primary/40" />
                    )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="text-base font-black tracking-tight text-on-surface truncate pr-4">
                      {item.name}
                    </p>
                    <span className="text-sm font-black text-primary italic whitespace-nowrap">{fmt(getItemTotal(item))}</span>
                  </div>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-4">
                    {item.bundle_qty && item.bundle_price && item.quantity >= item.bundle_qty
                      ? `${fmt(item.bundle_price)} / ${item.bundle_qty}pcs bundle`
                      : `${fmt(item.selling_price)} / unit`}
                  </p>
                  
                  <div className="flex items-center justify-between">
                     <div className="flex items-center bg-surface-container rounded-xl p-1 gap-1">
                        <button 
                          disabled={isProcessing}
                          onClick={() => handleUpdateQty(item, -1)}
                          className="w-8 h-8 flex items-center justify-center bg-[var(--color-surface-container-lowest)] rounded-lg shadow-sm active:scale-90 transition-all text-on-surface-variant disabled:opacity-50"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-10 text-center text-sm font-black text-on-surface leading-none">{item.quantity}</span>
                        <button 
                          disabled={isProcessing}
                          onClick={() => handleUpdateQty(item, 1)}
                          className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-lg shadow-sm active:scale-95 transition-all disabled:opacity-50"
                        >
                          <Plus size={14} />
                        </button>
                     </div>
                     <button 
                       disabled={isProcessing}
                       onClick={() => removeFromCart(item.id)}
                       className="text-[10px] font-black uppercase text-error tracking-widest p-2 hover:bg-error/5 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                     >
                       Remove
                     </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Checkout Section */}
      {cart.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 bg-[var(--color-surface-container-lowest)] border-t border-outline-variant/10 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] z-20 space-y-4">
           <div className="flex items-center justify-between px-2">
              <div className="flex flex-col">
                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Total Billable</span>
                 <span className="text-2xl font-black text-primary italic tracking-tight">{fmt(calculateSubtotal())}</span>
              </div>
              <div className="bg-primary/5 px-4 py-2 rounded-xl flex items-center gap-2">
                 <Receipt size={16} className="text-primary" />
                 <span className="text-[10px] font-black text-primary uppercase tracking-widest">{cart.length} SKUs</span>
              </div>
           </div>
           
           <button 
             onClick={handleCheckout}
             disabled={isProcessing}
             className="w-full py-5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-70 disabled:grayscale-[0.5]"
           >
             {isProcessing ? (
               <>
                 <Loader2 size={24} className="animate-spin" />
                 Processing...
               </>
             ) : (
               <>
                 Complete Sale
                 <ArrowRight size={20} />
               </>
             )}
           </button>
        </div>
      )}

    </div>
  );
}
