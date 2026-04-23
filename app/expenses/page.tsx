"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Plus,
  Trash2,
  Calendar,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Loader2,
  FileText,
  X,
  Package,
  Search,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/contexts/SessionContext";

interface Expense {
  id: string;
  amount: number;
  description: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  stock: number;
  cost_price: number;
  selling_price: number;
  image_url?: string;
  categories?: { name: string };
}

export default function ExpensesPage() {
  const {
    hasSystemBooted,
    setHasSystemBooted,
    expenses, setExpenses,
    totalProfit, setTotalProfit,
    totalExpenses, setTotalExpenses,
    products, setProducts
  } = useSession();

  const [loading, setLoading] = useState(!hasSystemBooted);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));

  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Restock State
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRestock, setShowRestock] = useState(false);
  const [restockMode, setRestockMode] = useState<'restock' | 'consume'>('restock');

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.categories?.name && p.categories.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const fetchData = async (dateStr: string, silent = false) => {
    // Only show full loading spinner if we literally have no data and system hasn't booted
    if (!silent && !hasSystemBooted && expenses.length === 0) setLoading(true);
    try {
      const startOfDay = `${dateStr}T00:00:00+08:00`;
      const endOfDay = `${dateStr}T23:59:59.999+08:00`;

      // 1. Fetch Expenses
      const { data: expData, error: expErr } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

      if (expErr) throw expErr;

      // Ensure description exists in the fallback or mapping
      const mappedExpenses = (expData || []).map((e: any) => ({
        id: e.id,
        amount: Number(e.amount),
        description: e.description || 'Uncategorized Expense',
        created_at: e.created_at
      }));
      setExpenses(mappedExpenses);

      const expTotal = mappedExpenses.reduce((acc: number, curr: any) => acc + curr.amount, 0);
      setTotalExpenses(expTotal);

      // 2. Fetch Transactions for Profit calculation
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select('total_profit')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (txErr) throw txErr;

      const profTotal = (txData || []).reduce((acc: number, curr: any) => acc + Number(curr.total_profit || 0), 0);
      setTotalProfit(profTotal);

      // 3. Fetch Products for Quick Restock
      const { data: prodData } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('name');

      if (prodData) setProducts(prodData);

    } catch (error) {
      console.error("Error fetching expenses data:", error);
    } finally {
      setLoading(false);
      setHasSystemBooted(true);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || isNaN(Number(newAmount))) return;

    setLoading(true);
    try {
      // Create date at current time but matching the selectedDate with +08:00 offset
      const now = new Date();
      const pad = (n: number) => n < 10 ? '0' + n : n;
      const [year, month, day] = selectedDate.split('-');
      const localIsoString = `${year}-${month}-${day}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}+08:00`;

      const { error } = await supabase
        .from('expenses')
        .insert({
          amount: Number(newAmount),
          description: newDescription || 'Uncategorized Expense',
          created_at: localIsoString
        });

      if (error) {
        // Fallback if description column doesn't exist
        if (error.message && error.message.includes('description')) {
          const { error: fallbackError } = await supabase
            .from('expenses')
            .insert({
              amount: Number(newAmount),
              created_at: localIsoString
            });
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }

      setNewAmount("");
      setNewDescription("");
      setIsAdding(false);
      fetchData(selectedDate); // Refresh local data
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("Failed to add expense. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestockExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTarget || restockQty <= 0) return;

    setLoading(true);
    try {
      const now = new Date();
      const pad = (n: number) => n < 10 ? '0' + n : n;
      const [year, month, day] = selectedDate.split('-');
      const localIsoString = `${year}-${month}-${day}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}+08:00`;

      const restockAmount = restockTarget.cost_price * restockQty;
      const isConsume = restockMode === 'consume';

      // 1. Log as Expense
      const { error } = await supabase
        .from('expenses')
        .insert({
          amount: restockAmount,
          description: `${isConsume ? 'Consumed' : 'Restock'}: ${restockTarget.name} (x${restockQty})`,
          created_at: localIsoString
        });

      if (error) {
        if (error.message && error.message.includes('description')) {
          const { error: fallbackError } = await supabase
            .from('expenses')
            .insert({
              amount: restockAmount,
              created_at: localIsoString
            });
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }

      // 2. Update Stock
      const stockChange = isConsume ? -restockQty : restockQty;
      const { error: stockErr } = await supabase
        .from('products')
        .update({ stock: restockTarget.stock + stockChange })
        .eq('id', restockTarget.id);

      if (stockErr) console.error("Stock update error:", stockErr);

      setRestockTarget(null);
      setRestockQty(1);
      setRestockMode('restock'); // Reset mode
      fetchData(selectedDate);
    } catch (error) {
      console.error("Error adding restock expense:", error);
      alert("Failed to process transaction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData(selectedDate);
    } catch (error) {
      console.error("Error deleting expense:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
  };

  const netProfit = totalProfit - totalExpenses;

  if (loading && !hasSystemBooted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-on-surface-variant font-bold animate-pulse">Initializing System Core...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-4 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-8 gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-primary font-heading">Expenses</h1>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="md:hidden bg-primary text-on-primary w-11 h-11 rounded-full shadow-lg flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex gap-3">
          <div className="relative group bg-surface-container-high rounded-xl px-4 py-2 md:py-2.5 flex items-center gap-2 shadow-sm border border-outline-variant/5 w-full md:w-auto">
            <Calendar size={18} className="text-primary shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-sm font-bold outline-none cursor-pointer text-on-surface uppercase tracking-tight w-full"
            />
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="hidden md:flex bg-primary text-on-primary px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all items-center justify-center gap-2 shrink-0"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        {/* Gross Profit */}
        <div className="bg-surface-container-low p-4 md:p-6 rounded-2xl flex flex-col justify-between h-28 md:h-32 border border-outline-variant/10 shadow-sm relative overflow-hidden group">
          <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">Gross Profit</span>
          <div className="text-2xl md:text-3xl font-bold tracking-tight text-on-surface font-heading truncate">{formatCurrency(totalProfit)}</div>
          <div className="flex items-center text-secondary text-[10px] md:text-xs font-bold gap-1 mt-1 truncate">
            <TrendingUp size={12} className="shrink-0" />
            <span className="truncate">Revenue - cost</span>
          </div>
          <TrendingUp className="absolute -right-4 -bottom-4 text-on-surface/5 w-20 h-20 md:w-24 md:h-24" />
        </div>

        {/* Total Expenses */}
        <div className="bg-surface-container-low p-4 md:p-6 rounded-2xl flex flex-col justify-between h-28 md:h-32 border border-outline-variant/10 shadow-sm relative overflow-hidden group">
          <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">Total Expenses</span>
          <div className="text-2xl md:text-3xl font-bold tracking-tight text-error font-heading truncate">{formatCurrency(totalExpenses)}</div>
          <div className="flex items-center text-error text-[10px] md:text-xs font-bold gap-1 mt-1 truncate">
            <TrendingDown size={12} className="shrink-0" />
            <span className="truncate">Money out</span>
          </div>
          <Wallet className="absolute -right-4 -bottom-4 text-error/5 w-20 h-20 md:w-24 md:h-24" />
        </div>

        {/* Net Profit */}
        <div className={`col-span-2 md:col-span-1 p-5 md:p-6 rounded-2xl flex flex-col justify-between h-32 border shadow-md relative overflow-hidden group transition-colors ${netProfit >= 0 ? 'bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/20' : 'bg-gradient-to-br from-error/20 to-error/5 border-error/20'}`}>
          <span className="text-on-surface text-[10px] font-bold uppercase tracking-widest opacity-80">Net Profit (Take Home)</span>
          <div className={`text-4xl font-black tracking-tight font-heading truncate ${netProfit >= 0 ? 'text-secondary' : 'text-error'}`}>
            {formatCurrency(netProfit)}
          </div>
          <div className={`flex items-center text-xs font-bold gap-1 mt-1 truncate ${netProfit >= 0 ? 'text-secondary' : 'text-error'}`}>
            <DollarSign size={14} className="shrink-0" />
            <span className="truncate">{netProfit >= 0 ? 'Profitable Day!' : 'Operating at a loss'}</span>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAdding && (
        <div className="sticky inset-0 z-[500] flex items-end md:items-center justify-center p-1 sm:p-6 pb-20 md:pb-6 animate-in fade-in duration-300">
          <form onSubmit={handleAddExpense} className="relative w-full max-w-md bg-surface-base/95 backdrop-blur-xl p-6 md:p-8 rounded-[1rem] shadow-2xl border border-white/10 animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-4 duration-500 ease-ios overflow-hidden">
            {/* Decorative gradient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                  <Wallet size={24} className="drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl md:text-2xl text-on-surface font-heading leading-tight">
                    Expense
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="w-10 h-10 rounded-full bg-surface-container-highest/50 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-all cursor-pointer border border-outline-variant/10 hover:scale-105 active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative z-10 flex flex-col gap-6">
              <div className="group">
                <label className="block text-[10px] font-black uppercase text-on-surface-variant tracking-[0.2em] mb-2 pl-1 group-focus-within:text-primary transition-colors">Amount (₱)</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-black text-2xl drop-shadow-sm">₱</div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-surface-container-lowest/50 backdrop-blur-sm px-5 pl-12 py-5 rounded-2xl border border-outline-variant/20 outline-none font-black text-4xl text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/30 shadow-inner"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-[10px] font-black uppercase text-on-surface-variant tracking-[0.2em] mb-2 pl-1 group-focus-within:text-primary transition-colors">Description / Category</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Electricity, Supplies, Rent..."
                  className="w-full bg-surface-container-lowest/50 backdrop-blur-sm px-5 py-4 rounded-2xl border border-outline-variant/20 outline-none font-bold text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/40 shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !newAmount}
                className="w-full mt-4 bg-gradient-to-r from-primary to-primary/80 text-on-primary py-5 rounded-2xl font-black text-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-1 active:shadow-md disabled:opacity-50 disabled:transform-none disabled:shadow-none transition-all flex items-center justify-center gap-3 cursor-pointer border border-white/10"
              >
                {loading ? <Loader2 size={24} className="animate-spin" /> : 'Confirm Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Restock Modal */}
      {restockTarget && (
        <div className="sticky inset-0 z-[500] flex items-end md:items-center justify-center p-4 sm:p-6 md:pb-6 animate-in fade-in duration-300">
          <form onSubmit={handleRestockExpense} className="relative w-full max-w-sm bg-surface-base/95 backdrop-blur-xl p-6 md:p-8 rounded-[1rem] shadow-2xl border border-white/10 animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-4 duration-500 ease-ios overflow-hidden">
            {/* Decorative gradient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary shadow-inner overflow-hidden">
                  {restockTarget.image_url ? (
                    <img
                      src={restockTarget.image_url}
                      alt={restockTarget.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <Package size={24} className="drop-shadow-sm" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-m text-on-surface font-heading leading-tight truncate max-w-[150px] md:max-w-[180px]">
                    {restockTarget.name}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-error">
                    ₱{Number(restockTarget.cost_price).toLocaleString(undefined, { minimumFractionDigits: 2 })} / unit
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestockTarget(null)}
                className="w-10 h-10 shrink-0 rounded-full bg-surface-container-highest/50 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-all cursor-pointer border border-outline-variant/10 hover:scale-105 active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative z-10 flex flex-col gap-4 mt-5">
              {/* Restock Mode Toggle */}
              <div className="bg-surface-container-high/50 p-1 rounded-xl flex gap-1 border border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setRestockMode('restock')}
                  className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${restockMode === 'restock' ? 'bg-primary text-on-primary shadow-lg scale-[1.02]' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Restock (+)
                </button>
                <button
                  type="button"
                  onClick={() => setRestockMode('consume')}
                  className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${restockMode === 'consume' ? 'bg-error text-on-error shadow-lg scale-[1.02]' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Consume (-)
                </button>
              </div>

              <div className="group">
                <label className="block text-[10px] font-black uppercase text-on-surface-variant tracking-[0.2em] mb-2 pl-1 group-focus-within:text-primary transition-colors">
                  {restockMode === 'restock' ? 'Quantity to Add' : 'Quantity to Remove'}
                </label>
                <div className="flex items-center justify-between bg-surface-container-lowest/50 backdrop-blur-sm p-2 rounded-2xl border border-outline-variant/20 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setRestockQty(Math.max(1, restockQty - 1))}
                    className="w-12 h-12 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all active:scale-95 cursor-pointer"
                  >
                    <span className="font-bold text-2xl leading-none -mt-1">-</span>
                  </button>
                  <span className="font-black text-3xl text-primary">{restockQty}</span>
                  <button
                    type="button"
                    onClick={() => setRestockQty(restockQty + 1)}
                    className="w-12 h-12 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all active:scale-95 cursor-pointer"
                  >
                    <span className="font-bold text-2xl leading-none -mt-1">+</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 bg-error/5 py-3 rounded-xl border border-error/10">
                <span className="text-[11px] font-black uppercase tracking-widest text-error">Total Cost</span>
                <span className="font-black text-xl text-error">₱{Number(restockTarget.cost_price * restockQty).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-primary to-primary/80 text-on-primary py-4 rounded-2xl font-black text-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-1 active:shadow-md disabled:opacity-50 disabled:transform-none disabled:shadow-none transition-all flex items-center justify-center gap-3 cursor-pointer border border-white/10"
              >
                {loading ? <Loader2 size={24} className="animate-spin" /> : 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Restock Options */}
      <div className="bg-surface-container-lowest rounded-3xl p-4 md:p-6 flex flex-col border border-outline-variant/10 shadow-sm mb-8 transition-all duration-300">
        <div
          className="flex items-center justify-between cursor-pointer group select-none"
          onClick={() => setShowRestock(!showRestock)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-105 transition-transform">
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg md:text-xl text-on-surface font-heading leading-tight">Quick Restock</h3>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Log inventory purchases</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
            {showRestock ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>

        {showRestock && (
          <div className="mt-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Search products to restock..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container pl-11 pr-4 py-3 rounded-xl border border-outline-variant/10 font-bold text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="py-8 text-center bg-surface-container/50 rounded-2xl border border-dashed border-outline-variant/20">
                <p className="font-bold text-on-surface-variant">No products found for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 pb-1">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setRestockTarget(product);
                      setRestockQty(1);
                    }}
                    className="bg-surface-container border border-outline-variant/10 rounded-2xl p-4 hover:border-primary/30 hover:shadow-lg transition-all active:scale-95 group text-left cursor-pointer flex flex-col h-full gap-2"
                  >
                    <div>
                      <h4 className="font-bold text-on-surface text-sm truncate">{product.name}</h4>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest truncate mt-0.5">
                        {product.categories?.name || 'General'}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-0.5 mt-auto pt-2 border-t border-outline-variant/10">
                      <span className="text-[10px] font-bold text-error/60">₱</span>
                      <span className="text-sm font-black text-error">
                        {Number(product.cost_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] font-bold text-on-surface-variant ml-1">/ unit</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expense Ledger */}
      <div className="bg-surface-container-low rounded-[2rem] p-5 md:p-8 flex flex-col border border-outline-variant/10 shadow-lg relative overflow-hidden">
        {/* Decorative background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-error/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-error/20 to-error/5 border border-error/20 flex items-center justify-center text-error shadow-inner shrink-0">
              <FileText size={24} className="drop-shadow-sm" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl md:text-2xl text-on-surface font-heading leading-tight">Expense Ledger</h3>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{selectedDate}</p>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end bg-error/5 md:bg-transparent p-4 md:p-0 rounded-xl border border-error/10 md:border-none">
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Total Day Expenses</span>
            <div className="text-xl md:text-2xl font-black text-error drop-shadow-sm">
              {formatCurrency(totalExpenses)}
            </div>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="relative z-10 flex flex-col items-center justify-center py-20 px-4 text-center bg-surface-container-lowest/50 rounded-3xl border border-dashed border-outline-variant/20">
            <div className="w-20 h-20 rounded-full bg-surface-container mb-6 flex items-center justify-center">
              <Wallet size={32} className="text-on-surface-variant/50" />
            </div>
            <p className="font-bold text-lg text-on-surface">No expenses recorded</p>
            <p className="text-sm font-medium text-on-surface-variant mt-2 max-w-xs">Your ledger is clean for today. Add an expense or restock a product to see it here.</p>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col gap-3">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="group bg-surface-container-lowest hover:bg-surface-container-lowest/80 border border-outline-variant/10 rounded-2xl p-4 md:p-5 flex items-center justify-between transition-all hover:shadow-md hover:border-error/20"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:bg-error/10 group-hover:text-error transition-colors">
                    <TrendingDown size={18} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-bold text-base text-on-surface truncate pr-4">
                      {expense.description}
                    </span>
                    <span className="text-xs font-semibold text-on-surface-variant mt-0.5">
                      {new Date(expense.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-black text-lg md:text-xl text-error tracking-tight">
                    {formatCurrency(expense.amount)}
                  </span>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-error/40 hover:bg-error/10 hover:text-error transition-all sm:opacity-0 sm:group-hover:opacity-100 active:scale-95"
                    title="Delete expense"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
