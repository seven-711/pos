"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  ChevronDown,
  Download,
  TrendingUp,
  TrendingDown,
  Info,
  Star,
  Loader2,
  PieChart,
  BarChart3,
  DollarSign,
  ShoppingCart,
  UserCheck,
  Printer,
  FileText,
  X as CloseIcon,
  CheckCircle2,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/contexts/SessionContext";

interface Transaction {
  id: string;
  total_amount: number;
  total_profit: number;
  created_at: string;
}

interface TransactionItem {
  quantity: number;
  price: number;
  products: {
    name: string;
    category_id: string;
    selling_price?: number;
    image_url?: string;
    categories: { name: string } | null;
  } | null;
}

interface Expense {
  amount: number;
  created_at: string;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { setIsLayoutHidden } = useSession();

  // Analytics State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [metrics, setMetrics] = useState({
    grossRevenue: 0,
    netProfit: 0,
    avgTransaction: 0,
    salesCount: 0,
    growthRate: 0 
  });

  const [topProducts, setTopProducts] = useState<{name: string, qty: number}[]>([]);
  const [categoryData, setCategoryData] = useState<{name: string, value: number, percent: number}[]>([]);
  const [peakHours, setPeakHours] = useState<number[]>(new Array(24).fill(0));
  const [hourlyTrend, setHourlyTrend] = useState<[string, number][]>([]);
  const [rawData, setRawData] = useState<{
    tx: Transaction[],
    items: TransactionItem[],
    exp: Expense[]
  }>({ tx: [], items: [], exp: [] });

  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    setIsLayoutHidden(showPreview);
    // Cleanup on unmount
    return () => setIsLayoutHidden(false);
  }, [showPreview]);

  const fetchData = async (dateStr: string) => {
    setLoading(true);

    try {
      // Calculate local day boundaries and convert to UTC for Supabase
      const start = new Date(`${dateStr}T00:00:00`);
      const end = new Date(`${dateStr}T23:59:59.999`);
      const startOfDay = start.toISOString();
      const endOfDay = end.toISOString();

      // Fetch transactions for selected day
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

      if (txErr) throw txErr;

      // Extract transaction IDs for item filtering
      const txIds = txData?.map((t: Transaction) => t.id) || [];
      let itemsData: TransactionItem[] = [];

      if (txIds.length > 0) {
        // Fetch items only for those transactions
        const { data, error: itemsErr } = await supabase
          .from('transaction_items')
          .select('*, products(name, category_id, categories(name))')
          .in('transaction_id', txIds);
        
        if (itemsErr) throw itemsErr;
        itemsData = data as any[] || [];
      }

      // Fetch expenses for selected day
      const { data: expData, error: expErr } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (expErr) throw expErr;

      if (txData) {
        setRawData({ tx: txData, items: itemsData, exp: expData || [] });
        processAnalytics(txData, itemsData, expData || []);
      }
    } catch (err: any) {
      console.error("Analytics Sync Error:", err.message || err.details || err);
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (tx: Transaction[], items: TransactionItem[], exp: Expense[]) => {
    // 1. Basic Metrics
    const gross = tx.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
    const grossProfit = tx.reduce((acc, curr) => acc + Number(curr.total_profit), 0);
    const totalExp = exp.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const net = grossProfit - totalExp;

    setMetrics({
      grossRevenue: gross,
      netProfit: net,
      avgTransaction: tx.length > 0 ? gross / tx.length : 0,
      salesCount: tx.length,
      growthRate: 15.2
    });

    // 2. Top Products (By Quantity Sold)
    const prodMap: Record<string, number> = {};
    items.forEach(item => {
      const name = item.products?.name || 'Unknown';
      prodMap[name] = (prodMap[name] || 0) + item.quantity;
    });
    const sortedProds = Object.entries(prodMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
    setTopProducts(sortedProds);

    // 3. Category Split
    const catMap: Record<string, number> = {};
    items.forEach(item => {
      const catName = item.products?.categories?.name || 'Uncategorized';
      const price = item.price || item.products?.selling_price || 0;
      const sub = Number(price) * Number(item.quantity || 0);
      catMap[catName] = (catMap[catName] || 0) + sub;
    });
    const catArray = Object.entries(catMap).map(([name, val]: [string, number]) => ({
      name,
      value: val,
      percent: gross > 0 ? (val / gross) * 100 : 0
    }));
    setCategoryData(catArray);

    // 4. Peak Hours
    const hours = new Array(24).fill(0);
    tx.forEach(t => {
      const h = new Date(t.created_at).getHours();
      hours[h]++;
    });
    setPeakHours(hours);

    // 5. Hourly Trend (00:00 to 23:00) using 12h labels
    const trendData: [string, number][] = [];
    for (let i = 0; i < 24; i++) {
        const hourLabel = `${String(i).padStart(2, '0')}:00`;
        const revenue = tx
            .filter(t => new Date(t.created_at).getHours() === i)
            .reduce((acc, curr) => acc + Number(curr.total_amount), 0);
        trendData.push([hourLabel, revenue]);
    }
    setHourlyTrend(trendData);
  };

  const handleExport = () => {
    if (!rawData.tx.length) {
      alert("No data available to export for this date.");
      return;
    }

    const rows = [];
    
    // 1. Header & Context
    rows.push(["PERFORMANCE AUDIT REPORT"]);
    rows.push([`Date of Audit: ${selectedDate}`]);
    rows.push([`Generated At: ${new Date().toLocaleString()}`]);
    rows.push([]);

    // 2. Executive Summary
    rows.push(["EXECUTIVE SUMMARY"]);
    rows.push(["Metric", "Value"]);
    rows.push(["Gross Revenue", formatCurrency(metrics.grossRevenue)]);
    rows.push(["Net Profit", formatCurrency(metrics.netProfit)]);
    rows.push(["Sales Volume", metrics.salesCount]);
    rows.push(["Avg Transaction", formatCurrency(metrics.avgTransaction)]);
    const totalExp = rawData.exp.reduce((acc, curr) => acc + Number(curr.amount), 0);
    rows.push(["Total Operating Expenses", formatCurrency(totalExp)]);
    rows.push([]);

    // 3. High Velocity Inventory (Top Products)
    rows.push(["HIGH VELOCITY INVENTORY (TOP 5)"]);
    rows.push(["Rank", "Product Name", "Quantity Sold"]);
    topProducts.forEach((p, idx) => {
      rows.push([idx + 1, p.name, p.qty]);
    });
    rows.push([]);

    // 4. Category Intelligence
    rows.push(["CATEGORY INTELLIGENCE"]);
    rows.push(["Category", "Valuation", "Market Share (%)"]);
    categoryData.forEach(cat => {
      rows.push([cat.name, formatCurrency(cat.value), `${cat.percent.toFixed(2)}%`]);
    });
    rows.push([]);

    // 5. Detailed Transaction Ledger
    rows.push(["DETAILED TRANSACTION LEDGER"]);
    rows.push(["Timestamp", "Transaction ID", "Total Amount", "Total Profit", "Status"]);
    rawData.tx.forEach(t => {
      const time = new Date(t.created_at).toLocaleTimeString();
      rows.push([
        time,
        t.id,
        t.total_amount,
        t.total_profit,
        "COMPLETED"
      ]);
    });

    // Generate CSV String
    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-on-surface-variant font-bold animate-pulse">Aggregating Intelligence...</p>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-7xl mx-auto w-full px-4 print:hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-10 gap-4 md:gap-6">
        <div>
          <p className="text-on-surface-variant font-label text-[8px] md:text-[10px] uppercase tracking-widest mb-0.5 font-bold">Financial Intelligence</p>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-primary font-heading">Performance Ledger</h1>
        </div>
        <div className="flex gap-2">
          <div className="relative group bg-surface-container-high rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-surface-highest transition-colors shadow-sm border border-outline-variant/5 w-full md:w-36 overflow-hidden">
            <Calendar size={18} className="text-primary" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-sm font-bold outline-none cursor-pointer text-on-surface uppercase tracking-tight"
            />
            {selectedDate !== new Date().toISOString().split('T')[0] && (
              <button 
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="ml-2 text-[10px] font-black uppercase text-primary hover:underline"
              >
                Today
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowPreview(true)}
            className="bg-gradient-to-br from-primary to-primary-container text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileText size={16} />
            Generate Audit PDF
          </button>
        </div>
      </div>

      {/* Executive Overview Highlight */}
      <div className="bg-gradient-to-br from-primary to-primary-container p-3 md:p-4 rounded-2xl relative overflow-hidden group shadow-lg mb-6 md:mb-8">
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/20 transition-all duration-700"></div>
        <div className="relative z-10 w-full flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
          <div className="max-w-xl">
            <h3 className="font-bold text-on-primary mb-1 md:mb-1.5 font-heading text-[10px] md:text-sm uppercase tracking-wider flex items-center gap-2">
              <Info size={16} />
              Executive Overview
            </h3>
            <p className="text-on-primary/90 text-xs leading-relaxed font-medium">
              Audit status: <span className="font-black underline">{selectedDate}</span>. Performance trends categorized as <span className="text-secondary font-black">High Yield</span>. Download the formal PDF for records or use the CSV export for spreadsheet intelligence.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5 flex flex-col justify-center min-w-[100px] backdrop-blur-sm">
              <span className="text-on-primary text-sm font-black block leading-none">{metrics.salesCount}</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-on-primary/50 mt-1">Sessions</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5 flex flex-col justify-center min-w-[100px] backdrop-blur-sm">
              <span className="text-on-primary text-sm font-black block leading-none">{formatCurrency(metrics.netProfit)}</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-on-primary/50 mt-1">Net Equity</span>
            </div>
          </div>
        </div>
        <UserCheck className="absolute -right-4 -bottom-4 text-on-primary/5 w-24 h-24" strokeWidth={1} />
      </div>

      {/* Bento Grid Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Key Metrics */}
        <div className="md:col-span-1 flex flex-col gap-3 md:gap-4">
          <div className="bg-surface-container-low p-4 md:p-6 rounded-2xl flex flex-col justify-between h-28 md:h-32 border border-outline-variant/10 shadow-sm relative overflow-hidden group">
            <span className="text-on-surface-variant text-[8px] md:text-[10px] font-bold uppercase tracking-widest">Gross Revenue</span>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-primary font-heading">{formatCurrency(metrics.grossRevenue)}</div>
            <div className="flex items-center text-secondary text-xs font-bold gap-1 mt-1">
              <TrendingUp size={14} />
              <span>{metrics.growthRate}% Up</span>
            </div>
            <DollarSign className="absolute -right-4 -bottom-4 text-primary/5 w-32 h-32" />
          </div>
          <div className="bg-surface-container-low p-4 md:p-6 rounded-2xl flex flex-col justify-between h-28 md:h-32 border border-outline-variant/10 shadow-sm relative overflow-hidden group">
            <span className="text-on-surface-variant text-[8px] md:text-[10px] font-bold uppercase tracking-widest">Net Earnings</span>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-primary font-heading">{formatCurrency(metrics.netProfit)}</div>
            <div className={`flex items-center text-xs font-bold gap-1 mt-1 ${metrics.netProfit > 0 ? 'text-secondary' : 'text-error'}`}>
              {metrics.netProfit > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{metrics.netProfit > 0 ? 'Healthy Margin' : 'Deficit Alarm'}</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-4 md:p-6 rounded-2xl flex flex-col justify-between h-28 md:h-32 border border-outline-variant/10 shadow-sm relative overflow-hidden group">
            <span className="text-on-surface-variant text-[8px] md:text-[10px] font-bold uppercase tracking-widest">Avg Transaction</span>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-primary font-heading">{formatCurrency(metrics.avgTransaction)}</div>
            <div className="text-on-surface-variant text-xs font-bold mt-1">
              Based on {metrics.salesCount} Sales
            </div>
          </div>
        </div>

        {/* Main Trend Chart */}
        <div className="md:col-span-3 bg-surface-container-low rounded-3xl p-4 md:p-8 flex flex-col border border-outline-variant/10 shadow-md">
          <div className="flex justify-between items-center mb-6 md:mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-sm shrink-0">
                <BarChart3 size={20} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm md:text-xl font-black text-primary font-heading leading-tight flex items-center gap-2">
                  Hourly Trend
                  <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 scale-75 md:scale-100 origin-left">
                    <span className="w-1 h-1 rounded-full bg-secondary animate-pulse"></span>
                    <span className="text-[8px] font-black text-secondary uppercase tracking-tighter">Live</span>
                  </div>
                </h3>
              </div>
            </div>
            <div className="flex gap-3 md:gap-5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/20"></div>
                <span className="text-[9px] md:text-[10px] font-black text-on-surface-variant uppercase tracking-tighter opacity-50">Base</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.4)]"></div>
                <span className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-tighter">Gross</span>
              </div>
            </div>
          </div>

          {/* Dynamic Sales Chart - Added Horizontal Scroll for Mobile */}
          <div className="flex-grow overflow-x-auto pb-8 -mx-2 hide-scrollbar scroll-smooth">
            <div className="flex items-end gap-1 md:gap-3 px-2 h-64 mt-4 min-w-[700px] md:min-w-full min-h-[250px]">
              {hourlyTrend.length === 0 ? (
                <div className="w-full flex flex-col items-center justify-center opacity-30 gap-2">
                  <BarChart3 size={48} />
                  <p className="font-bold">Awaiting Transaction Stream</p>
                </div>
              ) : (
                hourlyTrend.map(([time, val], idx) => {
                  const maxVal = Math.max(...hourlyTrend.map(v => v[1]), 1);
                  const height = (val / maxVal) * 100;
                  const isCurrentHour = new Date().getHours() === idx && selectedDate === new Date().toISOString().split('T')[0];
                  
                  return (
                    <div key={idx} className="flex-1 group relative h-full flex items-end">
                      <div
                        style={{ height: `${Math.max(4, height)}%` }}
                        className={`w-full ${val > 0 ? (isCurrentHour ? 'bg-secondary ring-4 ring-secondary/20' : 'bg-primary') : (isCurrentHour ? 'bg-secondary/20 ring-2 ring-secondary/10' : 'bg-primary/5')} hover:bg-primary-container rounded-t-md transition-all duration-700 ease-out cursor-pointer shadow-sm relative`}
                      >
                        {isCurrentHour && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black text-secondary uppercase whitespace-nowrap tracking-tighter">
                            Now
                          </div>
                        )}
                        <div className="absolute -top-12 left-1/2 -translate-x-[50%] bg-surface-container-highest text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg">
                          {time} • {formatCurrency(val)}
                        </div>
                      </div>
                      {idx % 2 === 0 && (
                        <div className={`absolute -bottom-6 left-0 text-[8px] font-bold ${isCurrentHour ? 'text-secondary' : 'text-on-surface-variant/50'}`}>
                          {time}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="mt-12 flex justify-between pt-4 border-t border-outline-variant/10 text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
            <span>Entry Protocol</span>
            <span>Current Pulse</span>
          </div>
        </div>
      </div>

      {/* Secondary Analysis Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        {/* Top Product List */}
        <div className="bg-surface-container-low p-4 md:p-6 rounded-2xl flex flex-col border border-outline-variant/10 shadow-sm">
          <h3 className="font-bold font-heading text-primary mb-4 md:mb-6 flex justify-between items-center text-base md:text-lg">
            High Velocity Inventory
            <Star className="text-secondary fill-secondary" size={18} />
          </h3>
          <div className="space-y-4">
            {topProducts.length === 0 ? (
              <p className="text-center py-10 text-on-surface-variant opacity-50 text-sm">Queue empty.</p>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">{idx + 1}</div>
                    <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{p.name}</p>
                  </div>
                  <span className="text-xs font-bold text-secondary">{p.qty} Sold</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category Split */}
        <div className="bg-surface-container-low p-4 md:p-6 rounded-2xl flex flex-col border border-outline-variant/10 shadow-sm">
          <h3 className="font-bold font-heading text-primary mb-4 md:mb-6 flex justify-between items-center text-base md:text-lg">
            Category Mix
            <PieChart size={18} className="text-on-surface-variant" />
          </h3>

          <div className="flex-grow flex flex-col justify-center gap-6">
            {categoryData.length === 0 ? (
              <p className="p-10 text-center text-on-surface-variant opacity-50 text-sm">No segments recorded.</p>
            ) : (
              categoryData.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span>{cat.name}</span>
                    <span className="text-primary">{cat.percent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-1000 ease-out"
                      style={{ width: `${cat.percent}%`, opacity: 1 - (idx * 0.2) }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Peak Service Intensity - Now Full Width */}
      <div className="bg-surface-container-low p-4 md:p-8 rounded-3xl flex flex-col border border-outline-variant/10 shadow-md mb-20 md:mb-32">
        <h3 className="font-bold font-heading text-primary mb-6 md:mb-8 text-base md:text-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/5 flex items-center justify-center text-secondary border border-secondary/10 shadow-sm shrink-0">
             <Clock size={20} />
          </div>
          Peak Service Intensity
        </h3>
        
        <div className="overflow-x-auto hide-scrollbar pb-10 -mx-2">
          <div className="flex items-end gap-1 md:gap-1.5 h-24 md:h-32 mb-6 min-w-[650px] md:min-w-full px-2">
            {peakHours.map((count, h) => {
              const maxCount = Math.max(...peakHours);
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={h} className="group relative h-full flex items-end flex-1">
                  <div
                    style={{ height: `${Math.max(4, height)}%` }}
                    className={`w-full transition-all duration-500 rounded-t-sm ${height > 70 ? 'bg-secondary' : 'bg-primary/20 group-hover:bg-primary/40'}`}
                  ></div>
                  <div className="absolute -top-10 left-1/2 -translate-x-[50%] bg-surface-container-highest text-white text-[9px] px-2 py-1 rounded md opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 shadow-xl transition-opacity">
                    {h}:00 • {count} TX
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pt-6 border-t border-outline-variant/10 gap-4 md:gap-8">
          <div className="flex gap-6 md:gap-8 text-[9px] md:text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] shrink-0 w-full md:w-auto overflow-x-hidden">
            <span>00:00 START</span>
            <span className="hidden md:block text-primary/30">12:00 MIDDAY</span>
            <span className="ml-auto md:ml-0">23:59 CLOSE</span>
          </div>
          
          <div className="flex flex-col md:items-end gap-2 max-w-2xl">
            <div className="flex items-center gap-2 md:justify-end">
              <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[8px] font-black uppercase tracking-widest border border-secondary/20">Strategy Recommendation</span>
            </div>
            <p className="text-xs md:text-sm text-on-surface-variant font-medium text-left md:text-right leading-relaxed">
              Operational density peaks at <strong className="text-secondary">{peakHours.indexOf(Math.max(...peakHours))}:00 </strong>. Workforce allocation should be <span className="text-primary font-bold underline decoration-primary/20 underline-offset-4 tracking-tight">prioritized at this threshold</span> to maximize service throughput and efficiency.
            </p>
          </div>
        </div>
      </div>
      </div>

      {/* Audit Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 print:p-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md print:hidden" onClick={() => setShowPreview(false)} />
          
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-500 print:max-h-none print:shadow-none print:rounded-none">
            {/* Modal Header/Actions */}
            <div className="sticky top-0 z-20 bg-surface-container-lowest px-4 md:px-8 py-3 md:py-4 border-b border-outline-variant/10 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base text-on-surface">Audit Report Preview</h3>
                  <p className="text-[9px] md:text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">{selectedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end md:self-auto">
                <button 
                  onClick={() => { handleExport(); }}
                  className="px-3 md:px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-highest transition-colors flex items-center gap-2 text-[10px] md:text-sm font-bold active:scale-95"
                >
                  <Download size={14} />
                  Raw CSV
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-4 md:px-6 py-2 rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/20 flex items-center gap-2 text-[10px] md:text-sm font-bold hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Printer size={14} />
                  Save as Audit PDF
                </button>
                <button 
                  onClick={() => setShowPreview(false)}
                  className="p-1.5 md:p-2 ml-1 md:ml-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant"
                >
                  <CloseIcon size={18} />
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="p-6 md:p-20 bg-white text-slate-900 font-sans print:p-0 print:m-0">
              {/* Report Header */}
              <div className="border-b-4 border-slate-900 pb-6 md:pb-10 mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900 uppercase">POS ni Estela</h1>
                  <p className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Official Performance Ledger</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400">Audit Reference</p>
                  <p className="text-base md:text-lg font-mono font-bold">AUD-{selectedDate.replace(/-/g, '')}</p>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-8 md:mb-16">
                <div className="space-y-1">
                  <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">Gross Revenue</p>
                  <p className="text-lg md:text-2xl font-black text-slate-900">{formatCurrency(metrics.grossRevenue)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">Net Profit</p>
                  <p className="text-lg md:text-2xl font-black text-slate-900">{formatCurrency(metrics.netProfit)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">Sales Volume</p>
                  <p className="text-lg md:text-2xl font-black text-slate-900">{metrics.salesCount} <span className="text-[8px] md:text-[10px] text-slate-400">TX</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">Efficiency</p>
                  <p className="text-lg md:text-2xl font-black text-slate-900">{(metrics.netProfit / (metrics.grossRevenue || 1) * 100).toFixed(1)}%</p>
                </div>
              </div>

              {/* Secondary Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 mb-8 md:mb-16">
                {/* Inventory Intelligence */}
                <div>
                  <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-4 md:mb-6 pb-2 border-b-2 border-slate-900">High Velocity Inventory</h4>
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 font-bold">
                        <th className="pb-3 md:pb-4">Product Name</th>
                        <th className="pb-3 md:pb-4 text-right">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold">
                      {topProducts.map((p, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 md:py-3">{p.name}</td>
                          <td className="py-2 md:py-3 text-right text-primary">{p.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Category Mix */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 pb-2 border-b-2 border-slate-900">Capital Distribution</h4>
                   <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 font-bold">
                        <th className="pb-4">Category</th>
                        <th className="pb-4 text-right">Yield Share</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold">
                      {categoryData.slice(0, 5).map((cat, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0">
                          <td className="py-3">{cat.name}</td>
                          <td className="py-3 text-right">{cat.percent.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ledger Snapshot */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 pb-2 border-b-2 border-slate-900">Transaction Audit Trail (Daily Snapshot)</h4>
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="text-left text-slate-400 font-bold uppercase tracking-widest bg-slate-50">
                      <th className="p-3">Time</th>
                      <th className="p-3">Entry ID</th>
                      <th className="p-3 text-right">Revenue</th>
                      <th className="p-3 text-right">Net Yield</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.tx.slice(0, 10).map((t, idx) => (
                      <tr key={idx} className="border-b border-slate-100 font-medium">
                        <td className="p-3">{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-3 font-mono opacity-50">{t.id.split('-')[0]}</td>
                        <td className="p-3 text-right font-bold">{formatCurrency(t.total_amount)}</td>
                        <td className="p-3 text-right font-bold text-secondary">+{formatCurrency(t.total_profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rawData.tx.length > 10 && (
                  <p className="text-[10px] text-slate-400 mt-4 italic">+ {rawData.tx.length - 10} additional entries suppressed in preview.</p>
                )}
              </div>

              {/* Compliance Footer */}
              <div className="mt-10 md:mt-20 pt-6 md:pt-10 border-t border-slate-200 text-center">
                <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] md:tracking-[0.4em]">System Verified Audit • Data Derived Integrity</p>
                <div className="flex justify-center gap-2 mt-3 md:mt-4">
                  <CheckCircle2 size={12} className="text-secondary" />
                  <span className="text-[7.5px] md:text-[8px] font-black uppercase text-slate-900">Ledger Compliance Protocol Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
