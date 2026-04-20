"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export type Session = {
  id: string;
  started_at: string;
  ended_at: string | null;
  total_sales: number | null;
  total_profit: number | null;
};

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
  cost_price: number;
  selling_price: number;
  category_id: string;
  image_url?: string;
  categories?: { name: string };
  bundle_qty?: number | null;
  bundle_price?: number | null;
}

interface SessionContextType {
  activeSession: Session | null;
  loading: boolean;
  isLayoutHidden: boolean;
  setIsLayoutHidden: (hidden: boolean) => void;
  refreshSession: () => Promise<void>;
  hasSystemBooted: boolean;
  setHasSystemBooted: (val: boolean) => void;
  // Global Data Cache
  products: Product[];
  setProducts: (val: Product[]) => void;
  categories: Category[];
  setCategories: (val: Category[]) => void;
}


const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSystemBooted, setHasSystemBooted] = useState(false);

  const refreshSession = async () => {
    setLoading(true);
    try {
      const { data: sessions, error } = await supabase
        .from("store_sessions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      const current = sessions?.[0] || null;
      // If the latest session hasn't ended, it's the active one
      setActiveSession(current && !current.ended_at ? current : null);
    } catch (err) {
      console.error("Session Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const openSession = async () => {
    const { data, error } = await supabase
      .from("store_sessions")
      .insert([{ started_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) {
      console.error("Failed to open session:", error);
      return;
    }

    if (data) {
      setActiveSession(data);
    }
  };

  const closeSession = async (totalSales?: number, totalProfit?: number) => {
    if (!activeSession) return;

    let finalSales = totalSales ?? 0;
    let finalProfit = totalProfit ?? 0;

    // If totals aren't provided, calculate them from transactions
    if (totalSales === undefined || totalProfit === undefined) {
      try {
        const { data: txs, error: txErr } = await supabase
          .from("transactions")
          .select("total_amount, total_profit")
          .gte("created_at", activeSession.started_at);

        if (!txErr && txs) {
          finalSales = txs.reduce((acc: number, t: any) => acc + (t.total_amount || 0), 0);
          finalProfit = txs.reduce((acc: number, t: any) => acc + (t.total_profit || 0), 0);
        }
      } catch (err) {
        console.error("Aggregation Error during Close:", err);
      }
    }

    const { error } = await supabase
      .from("store_sessions")
      .update({
        ended_at: new Date().toISOString(),
        total_sales: finalSales,
        total_profit: finalProfit,
      })
      .eq("id", activeSession.id);

    if (error) {
      console.error("Failed to close session:", error);
      return;
    }

    setActiveSession(null);
  };

  const [isLayoutHidden, setIsLayoutHidden] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  return (
    <SessionContext.Provider value={{ 
      activeSession, 
      loading, 
      isLayoutHidden,
      setIsLayoutHidden,
      refreshSession,
      hasSystemBooted,
      setHasSystemBooted,
      products,
      setProducts,
      categories,
      setCategories
    }}>
      {children}
    </SessionContext.Provider>
  );
}


export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
