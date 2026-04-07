"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  PlusCircle,
  Download,
  Receipt,
  Loader2,
  Trash2,
  AlertCircle,
  PieChart,
  Wallet,
  ArrowUpRight,
  TrendingDown,
  X
} from "lucide-react";

const EXPENSE_CATEGORIES = ["Operations", "Marketing", "Logistics", "Maintenance", "Utilities", "Other"];

const CATEGORY_COLORS: Record<string, string> = {
  Logistics: "bg-primary",
  Marketing: "bg-secondary",
  Maintenance: "bg-tertiary",
  Operations: "bg-primary-container",
  Utilities: "bg-secondary-container",
  Other: "bg-outline-variant",
};

interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  created_at: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    category: EXPENSE_CATEGORIES[0],
    amount: "",
  });

  // Derived stats
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);

  // Allocation by category
  const categoryTotals = expenses.reduce((acc: Record<string, number>, e: Expense) => {
    const cat = e.category || "Other";
    acc[cat] = (acc[cat] || 0) + Number(e.amount || 0);
    return acc;
  }, {});
  
  const categoryPcts = Object.entries(categoryTotals).map(([cat, total]) => ({
    cat,
    val: total,
    pct: totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0,
  })).sort((a, b) => b.pct - a.pct).slice(0, 4);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      if (data) setExpenses(data);
    } catch (err: any) {
      console.error("Expenses Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;
    setSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from("expenses")
        .insert([{ 
          title: form.title, 
          category: form.category, 
          amount: parseFloat(form.amount) 
        }])
        .select()
        .single();

      if (data) {
        setExpenses([data, ...expenses]);
        setForm({ title: "", category: EXPENSE_CATEGORIES[0], amount: "" });
      } else if (error) {
        alert("Error: " + error.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (!error) setExpenses(expenses.filter(e => e.id !== id));
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 2 
    }).format(n);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="max-w-4xl mx-auto w-full pt-4 pb-12 px-4">

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
        <div>
          <p className="text-secondary font-label text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block">Capital Outflow</p>
          <h1 className="text-4xl font-extrabold font-heading tracking-tight text-primary">Expenses</h1>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-surface-container-low border border-outline-variant/10 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-white transition-all cursor-pointer shadow-sm">
            <Download size={16} />
            Export Audit
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="md:col-span-1 bg-gradient-to-br from-primary to-primary-container p-6 rounded-3xl shadow-xl shadow-primary/10 relative overflow-hidden group">
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.15em] text-on-primary/70 mb-1">Cumulative Burn</p>
          <div className="flex items-end justify-between relative z-10">
            {loading ? (
              <Loader2 className="animate-spin text-on-primary/50" size={32} />
            ) : (
              <div>
                <h2 className="font-heading text-3xl font-extrabold tracking-tight text-on-primary">{fmt(totalExpenses)}</h2>
                <div className="flex items-center text-on-primary/80 text-[10px] font-bold mt-2 bg-white/10 w-fit px-2 py-0.5 rounded-full">
                   {expenses.length} Records Ledgered
                </div>
              </div>
            )}
          </div>
          <Wallet className="absolute -right-6 -bottom-6 text-white/5 w-32 h-32" />
        </div>

        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
          <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Month to Date</p>
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-2xl font-bold text-on-surface">
              {loading ? "-" : fmt(
                expenses.filter(e => new Date(e.created_at).getMonth() === new Date().getMonth())
                  .reduce((acc, e) => acc + Number(e.amount), 0)
              )}
            </h3>
            <TrendingDown className="text-error opacity-40" />
          </div>
        </div>

        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
          <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Current Session</p>
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-2xl font-bold text-tertiary">
              {loading ? "-" : fmt(
                expenses.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString())
                  .reduce((acc, e) => acc + Number(e.amount), 0)
              )}
            </h3>
            <ArrowUpRight className="text-tertiary opacity-40" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Allocation */}
        <div className="md:col-span-5 space-y-8">
          {/* Add Expense Form */}
          <section className="bg-surface-container p-8 rounded-3xl border border-outline-variant/10 shadow-lg relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-8 text-primary relative z-10">
              <PlusCircle size={24} className="fill-primary text-surface-container" />
              <h3 className="font-heading text-xl font-bold">New Entry</h3>
            </div>
            
            <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-on-surface-variant tracking-widest ml-1">Description</label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-white border border-outline-variant/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 text-on-surface outline-none transition-all shadow-sm"
                  placeholder="e.g. Raw Milk Supply"
                  type="text"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-on-surface-variant tracking-widest ml-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-white border border-outline-variant/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 text-on-surface outline-none transition-all shadow-sm appearance-none"
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-on-surface-variant tracking-widest ml-1">Amount (₱)</label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-bold text-lg">₱</span>
                  <input
                    required
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-white border border-outline-variant/10 rounded-xl p-4 pl-10 text-2xl font-extrabold focus:ring-2 focus:ring-primary/20 text-on-surface outline-none transition-all shadow-sm"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <button
                disabled={submitting}
                className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary py-5 rounded-2xl font-heading font-extrabold text-sm tracking-[0.2em] uppercase shadow-xl shadow-primary/20 active:scale-[0.97] transition-all cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                type="submit"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Receipt size={20} />}
                Process Entry
              </button>
            </form>
          </section>

          {/* Allocation Breakdown */}
          {!loading && categoryPcts.length > 0 && (
            <section className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
              <h3 className="font-heading text-lg font-bold mb-8 flex items-center gap-2">
                 <PieChart className="text-secondary" size={20} />
                 Allocation Ratio
              </h3>
              <div className="space-y-6">
                {categoryPcts.map(({ cat, pct, val }) => (
                  <div key={cat} className="group">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant mb-2">
                       <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat] || 'bg-primary'}`}></div>
                         <span>{cat}</span>
                       </div>
                       <div className="flex gap-2">
                         <span className="opacity-40">{fmt(val)}</span>
                         <span className="text-primary">{pct}%</span>
                       </div>
                    </div>
                    <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className={`h-full ${CATEGORY_COLORS[cat] || "bg-primary"} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Ledger Stream */}
        <div className="md:col-span-7">
          <section className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-heading text-xs font-bold text-on-surface-variant uppercase tracking-widest">Audit Ledger Stream</h3>
              <div className="bg-surface-container text-primary font-bold text-[10px] px-2 py-1 rounded shadow-sm">LIVE FEED</div>
            </div>

            <div className="rounded-3xl border border-outline-variant/10 bg-white shadow-sm overflow-hidden divide-y divide-outline-variant/5">
              {loading ? (
                <div className="py-24 flex flex-col items-center justify-center text-primary gap-4">
                  <Loader2 className="animate-spin" size={40} />
                  <p className="font-bold text-sm tracking-widest animate-pulse">SYNCING CAPITAL...</p>
                </div>
              ) : expenses.length === 0 ? (
                <div className="py-24 text-center text-on-surface-variant">
                  <Receipt size={48} className="mx-auto mb-6 opacity-10" />
                  <p className="text-lg font-bold">No Records Ledgered</p>
                  <p className="text-sm opacity-50">Operational costs will appear here upon entry.</p>
                </div>
              ) : (
                expenses.map((expense, idx) => (
                  <div
                    key={expense.id}
                    className={`flex items-center justify-between p-6 hover:bg-surface-container-low transition-colors group cursor-pointer ${idx % 2 === 0 ? "bg-white" : "bg-surface/10"}`}
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                        <Receipt size={22} className="opacity-60 group-hover:opacity-100" />
                      </div>
                      <div>
                        <p className="font-bold text-base text-on-surface group-hover:text-primary transition-colors leading-tight">{expense.title || "Untitled"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{formatDate(expense.created_at)}</span>
                          <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{expense.category || "General"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <p className="font-heading font-extrabold text-lg text-primary">{fmt(Number(expense.amount))}</p>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl hover:bg-error-container/20 text-error transition-all cursor-pointer active:scale-90"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {expenses.length > 5 && (
              <button className="w-full py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60 bg-surface-container-low hover:text-primary hover:bg-surface-container-highest rounded-2xl transition-all cursor-pointer active:scale-95 border border-dashed border-outline-variant/30">
                End of Ledger Archives
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
