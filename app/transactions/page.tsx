"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/contexts/SessionContext";
import {
  Search,
  Calendar,
  Tag,
  Banknote,
  Filter,
  ChevronRight,
  ChevronLeft,
  Download,
  Loader2,
  Receipt,
  CheckCircle2,
  TrendingUp,
  History,
  Activity,
  CreditCard,
  Wallet
} from "lucide-react";

interface TransactionItem {
  quantity: number;
  products: { name: string } | null;
}

interface Transaction {
  id: string;
  created_at: string;
  total_amount: number;
  total_profit: number;
  payment_method: string;
  transaction_items: TransactionItem[];
}

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { hasSystemBooted, setHasSystemBooted } = useSession();
  const [loading, setLoading] = useState(!hasSystemBooted);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);

  // Global Enterprise Stats
  const [globalStats, setGlobalStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalTransactions: 0,
    todaySales: 0
  });

  useEffect(() => {
    fetchTransactions();
  }, [page, searchQuery, paymentFilter]);

  useEffect(() => {
    fetchGlobalStats();

    // Global Sync Listener
    const handleSync = () => {
      fetchGlobalStats();
      fetchTransactions(true);
    };
    window.addEventListener('global-sync', handleSync);
    return () => window.removeEventListener('global-sync', handleSync);
  }, []);

  const fetchGlobalStats = async () => {
    // 1. Fetch All-Time Macro Data
    const { data: allTx } = await supabase
      .from("transactions")
      .select("total_amount, total_profit, created_at");

    if (allTx) {
      const today = new Date().toDateString();
      const revenue = (allTx as any[]).reduce((acc, t) => acc + Number(t.total_amount || 0), 0);
      const profit = (allTx as any[]).reduce((acc, t) => acc + Number(t.total_profit || 0), 0);
      const todaySales = (allTx as any[])
        .filter(t => new Date(t.created_at).toDateString() === today)
        .reduce((acc, t) => acc + Number(t.total_amount || 0), 0);

      setGlobalStats({
        totalRevenue: revenue,
        totalProfit: profit,
        totalTransactions: allTx.length,
        todaySales: todaySales
      });
    }
  };

  const fetchTransactions = async (silent = false) => {
    if (!silent) setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("transactions")
      .select("*, transaction_items(quantity, products(name))", { count: "exact" });

    if (searchQuery) {
      if (!isNaN(parseFloat(searchQuery))) {
        query = query.eq('total_amount', parseFloat(searchQuery));
      } else {
        query = query.ilike('id', `%${searchQuery}%`);
      }
    }

    if (paymentFilter) {
      query = query.eq('payment_method', paymentFilter);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error && data) {
      setTransactions(data);
      setTotalCount(count || 0);
    }
    setLoading(false);
    setHasSystemBooted(true);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 2 
    }).format(n);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }),
      time: d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const getItemsSummary = (tx: Transaction) => {
    const items = tx.transaction_items || [];
    if (tx.payment_method === "Balance Adjustment") return "System: Balance Adjustment";
    if (tx.payment_method === "GCash" && items.length > 0 && !items[0].products) return "GCash Service: Cash Out";
    if (tx.payment_method === "Cash" && items.length > 0 && !items[0].products) return "GCash Service: Cash In / Load";
    
    if (!items || items.length === 0) return "No items recorded";
    const firstName = items[0]?.products?.name || "Service Rendered";
    return items.length > 1 ? `${firstName} + ${items.length - 1} others` : firstName;
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto w-full relative px-4 pb-12">

      {/* Enterprise Macro Summary Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
        <div>
          <p className="text-secondary font-label text-[10px] font-bold uppercase tracking-[0.25em] mb-2 block">Enterprise Growth Protocol</p>
          <h1 className="text-4xl font-extrabold font-heading tracking-tight text-primary">System Ledger</h1>
        </div>
        
        {/* Progress Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
          <div className="bg-surface-container-low px-5 py-4 rounded-2xl border border-outline-variant/10 shadow-sm group hover:border-primary/20 transition-all">
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Global Revenue</span>
            <span className="text-xl font-bold font-heading text-primary group-hover:scale-105 transition-transform block">{fmt(globalStats.totalRevenue)}</span>
          </div>
          <div className="bg-emerald-500/10 px-5 py-4 rounded-2xl border border-emerald-500/20 shadow-sm group hover:border-emerald-500/40 transition-all">
            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block mb-1">Net Earnings</span>
            <span className="text-xl font-bold font-heading text-emerald-600 dark:text-emerald-300 group-hover:scale-105 transition-transform block">{fmt(globalStats.totalProfit)}</span>
          </div>
          <div className="bg-surface-container-low px-5 py-4 rounded-2xl border border-outline-variant/10 shadow-sm">
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Total Sales</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-heading text-on-surface">{globalStats.totalTransactions}</span>
              <Activity size={14} className="text-primary opacity-40 animate-pulse" />
            </div>
          </div>
          <div className="bg-surface-container-low px-5 py-4 rounded-2xl border border-outline-variant/10 shadow-sm">
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Today's Pulse</span>
            <div className="flex items-center gap-1.5 text-secondary">
               <TrendingUp size={14} />
               <span className="text-sm font-bold">{fmt(globalStats.todaySales)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Intelligence Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant/10 p-2 md:p-1.5 rounded-3xl mb-8 shadow-sm flex flex-col md:flex-row items-center gap-2 md:gap-1">
         {/* Search Input Integrated */}
         <div className="relative flex-1 w-full h-14 md:h-12 bg-surface-container-low rounded-2xl flex items-center px-2 md:px-4 overflow-hidden group border border-transparent focus-within:border-primary/20 transition-all">
            <Search className="text-on-surface-variant/40 group-hover:text-primary transition-colors" size={20} />
            <input 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Search Global Ledger by Receipt ID or Amount..."
              className="bg-transparent border-none w-full h-full text-on-surface placeholder:text-on-surface-variant/40 text-sm font-medium outline-none p-3 md:px-4"
            />
         </div>
         
         <div className="flex items-center gap-1 w-full md:w-auto">
            <div className="flex bg-surface-container-low p-1 rounded-2xl w-full border border-outline-variant/5">
              {['All', 'Cash', 'Digital'].map(item => (
                <button 
                  key={item}
                  onClick={() => { setPaymentFilter(item === 'All' ? null : item); setPage(0); }}
                  className={`flex-1 px-2 md:px-6 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all ${
                    (item === 'All' && !paymentFilter) || paymentFilter === item 
                    ? 'bg-primary text-on-primary shadow-md shadow-primary/20 scale-[1.02]' 
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            
            <button className="bg-surface-container-low hover:bg-primary/10 hover:text-primary p-3.5 rounded-2xl text-on-surface-variant transition-all cursor-pointer active:scale-95 border border-outline-variant/5 hover:border-primary/20">
               <Download size={20} />
            </button>
         </div>
      </div>

      {/* Audit Manifest Table */}
      <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-outline-variant/10">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-container text-on-surface-variant border-b border-outline-variant/15">
                <th className="px-8 py-5 font-label text-[10px] font-bold uppercase tracking-widest">Entry Protocol</th>
                <th className="px-8 py-5 font-label text-[10px] font-bold uppercase tracking-widest">Global Manifest</th>
                <th className="px-8 py-5 font-label text-[10px] font-bold uppercase tracking-widest text-center">Qty</th>
                <th className="px-8 py-5 font-label text-[10px] font-bold uppercase tracking-widest text-right">Capital Gross</th>
                <th className="px-8 py-5 font-label text-[10px] font-bold uppercase tracking-widest text-right">Net Yield</th>
                <th className="px-8 py-5 font-label text-[10px] font-bold uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-32 text-center text-primary">
                    <Loader2 className="animate-spin inline-block" size={48} />
                    <p className="mt-4 font-heading font-extrabold text-sm tracking-[0.3em] uppercase animate-pulse">Syncing Global intelligence...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-32 text-center text-on-surface-variant/40">
                    <History size={64} className="mx-auto mb-6 opacity-10" />
                    <p className="text-xl font-bold">Ledger Archives Empty</p>
                    <p className="text-sm">Initiate a transaction to begin audit tracking.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx, idx) => {
                  const { date, time } = formatDateTime(tx.created_at);
                  const items: any[] = tx.transaction_items || [];
                  const totalQty = items.reduce((acc: number, i: any) => acc + Number(i.quantity || 0), 0);
                  
                  return (
                    <tr
                      key={tx.id}
                      className={`transition-all ${idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface/20'}`}
                    >
                      <td className="px-8 py-7">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-on-surface">{date}</span>
                          <span className="text-[10px] font-extrabold text-on-surface-variant/40 uppercase tracking-tighter">{time}</span>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center flex-shrink-0 transition-all">
                            <Receipt size={22} className="opacity-40 transition-opacity" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-on-surface transition-colors leading-tight">
                              {getItemsSummary(tx)}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-on-surface-variant/30 lowercase mt-0.5">
                              {tx.payment_method === "Balance Adjustment" ? "vault_sync" : `ref:${tx.id.split("-")[0]}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-7 text-center">
                         <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-surface-container-high text-xs font-black text-primary min-w-[2.5rem]">
                            {totalQty}
                         </span>
                      </td>
                      <td className="px-8 py-7 text-right font-heading font-extrabold text-primary text-base">{fmt(tx.total_amount)}</td>
                      <td className="px-8 py-7 text-right font-heading font-bold text-secondary text-base">+{fmt(tx.total_profit)}</td>
                      <td className="px-8 py-7 text-right">
                         <div className="flex flex-col items-end gap-1.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-[9px] font-bold uppercase tracking-widest border border-secondary/10">
                               <CheckCircle2 size={12} />
                               Ledgered
                            </span>
                            <span className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-tighter">{tx.payment_method}</span>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Global Pagination Bar */}
        <div className="px-8 py-6 bg-surface-container-low text-on-surface-variant flex flex-col md:flex-row items-center justify-between border-t border-outline-variant/10 gap-4">
          <div className="flex items-center gap-3">
             <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
             <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
               System Archives: <span className="text-primary">{page * PAGE_SIZE + 1}</span> to <span className="text-primary">{Math.min((page + 1) * PAGE_SIZE, totalCount)}</span> of {totalCount} Records
             </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="w-11 h-11 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-90"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            
            <div className="flex items-center gap-1.5 mx-2">
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                let p = i;
                if (totalPages > 3 && page > 1) p = page - 1 + i;
                if (p >= totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-11 h-11 rounded-2xl text-xs font-black transition-all active:scale-90 cursor-pointer ${p === page ? "bg-primary text-on-primary shadow-xl shadow-primary/20 scale-105" : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/15"}`}
                  >
                    {p + 1}
                  </button>
                );
              })}
            </div>

            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="w-11 h-11 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-90"
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
