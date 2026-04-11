"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getLocalTimestamp } from "@/lib/utils/time";


export interface Product {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
  cost_price: number;
  selling_price: number;
  bundle_qty?: number | null;
  bundle_price?: number | null;
  category_id: string;
  image_url?: string;
  categories?: { name: string };
}

export interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  getItemTotal: (item: CartItem) => number;
  getItemProfit: (item: CartItem) => number;
  calculateSubtotal: () => number;
  calculateProfit: () => number;
  totalQuantity: number;
  showCart: boolean;
  toggleCart: (force?: boolean) => void;
  isProcessing: boolean;
  recordServiceTransaction: (params: {
    type: string;
    amount: number;
    fee: number;
    payment_method: string;
    notes?: string;
  }) => Promise<{ success: boolean; message: string }>;
  completeSale: () => Promise<{ success: boolean; message: string }>;
}



const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);



  const addToCart = (product: Product, quantity: number) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      } else {
        return [...prevCart, { ...product, quantity }];
      }
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const getItemTotal = (item: CartItem) => {
    if (item.bundle_qty && item.bundle_price && item.quantity >= item.bundle_qty) {
      const bundleCount = Math.floor(item.quantity / item.bundle_qty);
      const remainder = item.quantity % item.bundle_qty;
      return bundleCount * item.bundle_price + remainder * item.selling_price;
    }
    return item.selling_price * item.quantity;
  };

  const getItemProfit = (item: CartItem) => {
    const revenue = getItemTotal(item);
    const totalCost = item.cost_price * item.quantity;
    return revenue - totalCost;
  };

  const calculateSubtotal = () =>
    cart.reduce((acc, item) => acc + getItemTotal(item), 0);

  const calculateProfit = () =>
    cart.reduce((acc, item) => acc + getItemProfit(item), 0);

  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);

  const toggleCart = (force?: boolean) => {
    setShowCart(prev => force !== undefined ? force : !prev);
  };

  const completeSale = async (): Promise<{ success: boolean; message: string }> => {
    if (cart.length === 0) return { success: false, message: "Cart is empty" };
    setIsProcessing(true);

    try {
      const subtotal = Number(calculateSubtotal().toFixed(2)) || 0;
      const profit = Number(calculateProfit().toFixed(2)) || 0;

      // 1. Create Transaction
      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .insert([{
          total_amount: subtotal,
          total_profit: profit,
          payment_method: 'Cash',
          created_at: getLocalTimestamp()
        }])
        .select()
        .single();

      if (txErr) throw new Error(`Transaction Error: ${txErr.message}`);
      if (!tx) throw new Error("Transaction verification failed.");

      // 2. Create Transaction Items
      const txItems = cart.map(item => {
        const qty = Number(item.quantity) || 1;
        const totalLinePrice = getItemTotal(item);
        const totalLineProfit = getItemProfit(item);
        
        return {
          transaction_id: tx.id,
          product_id: item.id,
          quantity: qty,
          price: Number((totalLinePrice / qty).toFixed(2)),
          cost_price: Number(item.cost_price) || 0,
          profit: Number(totalLineProfit.toFixed(2))
        };
      });

      const { error: itemsErr } = await supabase.from('transaction_items').insert(txItems);
      if (itemsErr) throw new Error(`Items Error: ${itemsErr.message}`);

      // 3. Update Stock
      for (const item of cart) {
        // Attempt RPC, then fallback to direct update
        const { error: stockErr } = await supabase.rpc('decrement_stock', {
          row_id: item.id,
          amount: Number(item.quantity)
        });

        if (stockErr) {
          await supabase
            .from('products')
            .update({
              stock: Math.max(0, (Number(item.stock) || 0) - (Number(item.quantity) || 0))
            })
            .eq('id', item.id);
        }
      }

      clearCart();
      setShowCart(false);
      
      // Emit a global event for pages to refresh their local stock/data
      window.dispatchEvent(new Event('transaction-completed'));
      
      return { success: true, message: "Sale completed successfully!" };
    } catch (err: any) {
      console.error("Sale Processing Error:", err);
      return { success: false, message: err.message || "Unknown transaction error" };
    } finally {
      setIsProcessing(false);
    }
  };


  const recordServiceTransaction = async (params: {
    type: string;
    amount: number;
    fee: number;
    payment_method: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string }> => {
    setIsProcessing(true);
    try {
      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .insert([{
          total_amount: params.amount + params.fee,
          total_profit: params.fee,
          payment_method: params.payment_method,
          created_at: getLocalTimestamp()
        }])
        .select()
        .single();

      if (txErr) throw txErr;

      // For service transactions, we add a single item to transaction_items describing the service
      const { error: itemErr } = await supabase
        .from('transaction_items')
        .insert([{
          transaction_id: tx.id,
          product_id: null,
          quantity: 1,
          price: params.amount + params.fee,
          cost_price: params.amount,
          profit: params.fee
        }]);

      if (itemErr) {
        console.warn("Service item recording failed, but transaction succeeded:", itemErr.message);
      }

      window.dispatchEvent(new Event('transaction-completed'));
      return { success: true, message: `${params.type} ledgered successfully.` };
    } catch (err: any) {
      console.error("Service Recording Error:", err);
      return { success: false, message: err.message || "Failed to record service." };
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        getItemTotal,
        getItemProfit,
        calculateSubtotal,
        calculateProfit,
        totalQuantity,
        showCart,
        toggleCart,
        completeSale,
        isProcessing,
        recordServiceTransaction
      }}


    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
