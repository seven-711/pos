"use client";

import React from "react";
import { useCart } from "@/lib/contexts/CartContext";
import { 
  ShoppingCart, 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight,
  Package,
  Loader2
} from "lucide-react";

export function CartQuickView({ onClose }: { onClose: () => void }) {
  const { 
    cart, 
    removeFromCart, 
    clearCart, 
    addToCart, 
    calculateSubtotal,
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
      onClose();
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="absolute top-14 right-0 w-[400px] bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-outline-variant/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[1000] hidden md:block">
      {/* Header */}
      <div className="px-5 py-4 border-b border-outline-variant/5 bg-surface-container-low/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            <h3 className="text-lg font-black font-heading text-primary uppercase tracking-tight italic">Transaction Cart</h3>
        </div>
        <button 
          onClick={clearCart}
          disabled={cart.length === 0 || isProcessing}
          className="p-2 hover:bg-error/10 rounded-lg text-error transition-colors cursor-pointer disabled:opacity-30"
          title="Clear cart"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto no-scrollbar">
        {cart.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
              <ShoppingCart size={32} />
            </div>
            <p className="text-xs font-black text-on-surface-variant uppercase tracking-widest">Cart is currently empty</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/5 px-2">
            {cart.map((item) => (
              <div key={item.id} className="p-4 flex gap-4 transition-all hover:bg-surface-container/10 group">
                <div className="w-12 h-12 bg-surface-container-high rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white/20">
                    {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                        <Package size={20} className="text-primary/40" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="text-sm font-black tracking-tight truncate text-on-surface">
                      {item.name}
                    </p>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      disabled={isProcessing}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-error/10 text-error rounded transition-all disabled:opacity-0"
                    >
                        <X size={14} />
                    </button>
                  </div>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                    {fmt(item.selling_price)} per unit
                  </p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center bg-surface-container-high rounded-lg p-1">
                      <button 
                        disabled={isProcessing}
                        onClick={() => handleUpdateQty(item, -1)}
                        className="p-1 hover:bg-white rounded flex items-center justify-center text-on-surface/60 transition-colors disabled:opacity-30"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-xs font-black text-on-surface">{item.quantity}</span>
                      <button 
                        disabled={isProcessing}
                        onClick={() => handleUpdateQty(item, 1)}
                        className="p-1 hover:bg-white rounded flex items-center justify-center text-primary transition-colors disabled:opacity-30"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-sm font-black text-primary italic">{fmt(item.selling_price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {cart.length > 0 && (
        <div className="p-5 bg-surface-container-low/50 border-t border-outline-variant/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Estimated Subtotal</span>
            <span className="text-xl font-black text-primary italic">{fmt(calculateSubtotal())}</span>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={isProcessing}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 group hover:shadow-2xl active:scale-[0.98] transition-all disabled:opacity-70 disabled:grayscale-[0.5]"
          >
            {isProcessing ? (
               <>
                 <Loader2 size={18} className="animate-spin" />
                 Processing...
               </>
            ) : (
               <>
                 Complete Sale
                 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
               </>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
