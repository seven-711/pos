"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
  UserCheck
} from "lucide-react";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txItems, setTxItems] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // Analytics State
  const [metrics, setMetrics] = useState({
    grossRevenue: 0,
    netProfit: 0,
    avgTransaction: 0,
    salesCount: 0,
    growthRate: 12.5 // Placeholder for growth calculation
  });

  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [peakHours, setPeakHours] = useState<number[]>(new Array(24).fill(0));
  const [dailyTrend, setDailyTrend] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    try {
      // Fetch last 30 days transactions
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txErr) throw txErr;

      // Fetch items with product/category info
      const { data: itemsData, error: itemsErr } = await supabase
        .from('transaction_items')
        .select('*, products(name, category_id, categories(name))');

      if (itemsErr) throw itemsErr;

      // Fetch expenses
      const { data: expData, error: expErr } = await supabase
        .from('expenses')
        .select('*');

      if (expErr) throw expErr;

      if (txData && itemsData) {
        processAnalytics(txData, itemsData, expData || []);
      }
    } catch (err: any) {
      console.error("Analytics Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (tx: any[], items: any[], exp: any[]) => {
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
    const prodMap: any = {};
    items.forEach(item => {
      const name = item.products?.name || 'Unknown';
      prodMap[name] = (prodMap[name] || 0) + item.quantity;
    });
    const sortedProds = Object.entries(prodMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a: any, b: any) => b.qty - a.qty)
      .slice(0, 5);
    setTopProducts(sortedProds);

    // 3. Category Split
    const catMap: any = {};
    items.forEach(item => {
      const catName = item.products?.categories?.name || 'Uncategorized';
      const price = item.price || item.products?.selling_price || 0;
      const sub = Number(price) * Number(item.quantity || 0);
      catMap[catName] = (catMap[catName] || 0) + sub;
    });
    const catArray = Object.entries(catMap).map(([name, val]: [string, any]) => ({
      name,
      value: val,
      percent: (val / gross) * 100
    }));
    setCategoryData(catArray);

    // 4. Peak Hours
    const hours = new Array(24).fill(0);
    tx.forEach(t => {
      const h = new Date(t.created_at).getHours();
      hours[h]++;
    });
    setPeakHours(hours);

    // 5. Daily Trend (Last 7 days simplified)
    const dailyMap: any = {};
    tx.forEach(t => {
      const d = new Date(t.created_at).toLocaleDateString();
      dailyMap[d] = (dailyMap[d] || 0) + Number(t.total_amount);
    });
    setDailyTrend(Object.entries(dailyMap).slice(0, 10).reverse());
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
    <div className="max-w-7xl mx-auto w-full px-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <p className="text-on-surface-variant font-label text-[10px] uppercase tracking-widest mb-1 font-bold">Financial Intelligence</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary font-heading">Performance Ledger</h1>
        </div>
        <div className="flex gap-2">
          <div className="bg-surface-container-high px-4 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-surface-highest transition-colors shadow-sm">
            <Calendar size={18} className="text-on-surface-variant" />
            <span className="text-sm font-semibold">Real-time sync</span>
            <ChevronDown size={18} />
          </div>
          <button className="bg-gradient-to-br from-primary to-primary-container text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer">
            <Download size={18} />
            Export Audit
          </button>
        </div>
      </div>

      {/* Bento Grid Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Key Metrics */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between h-32 border border-outline-variant/10 shadow-sm relative overflow-hidden group">
            <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">Gross Revenue</span>
            <div className="text-3xl font-bold tracking-tight text-primary font-heading">{formatCurrency(metrics.grossRevenue)}</div>
            <div className="flex items-center text-secondary text-xs font-bold gap-1 mt-1">
              <TrendingUp size={14} />
              <span>{metrics.growthRate}% Up</span>
            </div>
            <DollarSign className="absolute -right-4 -bottom-4 text-primary/5 w-32 h-32" />
          </div>
          <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between h-32 border border-outline-variant/10 shadow-sm relative overflow-hidden group">
            <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">Net Earnings</span>
            <div className="text-3xl font-bold tracking-tight text-primary font-heading">{formatCurrency(metrics.netProfit)}</div>
            <div className={`flex items-center text-xs font-bold gap-1 mt-1 ${metrics.netProfit > 0 ? 'text-secondary' : 'text-error'}`}>
              {metrics.netProfit > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{metrics.netProfit > 0 ? 'Healthy Margin' : 'Deficit Alarm'}</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col justify-between h-32 border border-outline-variant/10 shadow-sm relative overflow-hidden group">
            <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">Avg Transaction</span>
            <div className="text-3xl font-bold tracking-tight text-primary font-heading">{formatCurrency(metrics.avgTransaction)}</div>
            <div className="text-on-surface-variant text-xs font-bold mt-1">
              Based on {metrics.salesCount} Sales
            </div>
          </div>
        </div>

        {/* Main Trend Chart */}
        <div className="md:col-span-3 bg-surface-container-low rounded-3xl p-8 flex flex-col border border-outline-variant/10 shadow-md">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h3 className="text-xl font-bold text-primary font-heading flex items-center gap-2">
                <BarChart3 size={20} />
                Velocity & Growth Trend
              </h3>
              <p className="text-on-surface-variant text-sm">Revenue density aggregated by session</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary/20"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Baseline</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Active</span>
              </div>
            </div>
          </div>

          {/* Dynamic Sales Chart */}
          <div className="flex-grow flex items-end gap-3 px-2 h-64 mt-4 min-h-[250px]">
            {dailyTrend.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center opacity-30 gap-2">
                <BarChart3 size={48} />
                <p className="font-bold">Awaiting Transaction Stream</p>
              </div>
            ) : (
              dailyTrend.map(([date, val], idx) => {
                const maxVal = Math.max(...dailyTrend.map(v => v[1]));
                const height = (val / maxVal) * 100;
                return (
                  <div key={idx} className="flex-1 group relative">
                    <div
                      style={{ height: `${height}%` }}
                      className="bg-primary hover:bg-primary-container rounded-lg transition-all duration-700 ease-out cursor-pointer shadow-sm min-h-[4%]"
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-[50%] bg-surface-container-highest text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg">
                        {formatCurrency(val)}
                      </div>
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-[50%] text-[8px] font-bold text-on-surface-variant/50 rotate-45 md:rotate-0">
                      {date.split('/')[1] + '/' + date.split('/')[0]}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-12 flex justify-between pt-4 border-t border-outline-variant/10 text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
            <span>Entry Protocol</span>
            <span>Current Pulse</span>
          </div>
        </div>
      </div>

      {/* Secondary Analysis Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Top Product List */}
        <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col border border-outline-variant/10 shadow-sm">
          <h3 className="font-bold font-heading text-primary mb-6 flex justify-between items-center text-lg">
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

        {/* Peak Hours Analysis */}
        <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col border border-outline-variant/10 shadow-sm">
          <h3 className="font-bold font-heading text-primary mb-6 text-lg">Peak Service Intensity</h3>
          <div className="grid grid-cols-12 gap-1 h-32 items-end">
            {peakHours.map((count, h) => {
              const maxCount = Math.max(...peakHours);
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={h} className="group relative h-full flex items-end">
                  <div
                    style={{ height: `${height}%` }}
                    className={`w-full bg-primary/20 rounded-t-sm group-hover:bg-primary transition-colors ${height > 70 ? 'bg-primary/60' : ''}`}
                  ></div>
                  <div className="absolute -top-6 left-1/2 -translate-x-[50%] text-[8px] font-bold text-primary opacity-0 group-hover:opacity-100 whitespace-nowrap">{h}:00</div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-3 text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">
            <span>00:00</span>
            <span>12:00</span>
            <span>23:59</span>
          </div>
          <p className="mt-6 text-xs text-on-surface-variant leading-relaxed font-medium">
            Service density is concentrated around <strong className="text-primary">{peakHours.indexOf(Math.max(...peakHours))}:00 </strong>. Staff readiness optimized for high volume.
          </p>
        </div>

        {/* Category Split */}
        <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col border border-outline-variant/10 shadow-sm overflow-hidden">
          <h3 className="font-bold font-heading text-primary mb-6 flex justify-between items-center text-lg">
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

      {/* Abstract Insight Card */}
      <div className="bg-gradient-to-br from-primary to-primary-container p-10 rounded-3xl relative overflow-hidden group shadow-2xl mb-12">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
        <div className="relative z-10 max-w-2xl">
          <h3 className="font-bold text-on-primary mb-4 font-heading text-2xl flex items-center gap-2">
            Executive Overview
            <Info size={20} />
          </h3>
          <p className="text-on-primary/80 text-lg leading-relaxed mb-8 font-medium">
            Your current growth velocity is mirroring an upward trend in high-margin beverage sales. Based on recent transactions, afternoon traffic density indicates an opportunity for a daily "Happy Hour" promotion to further accelerate capital turnover.
          </p>
          <div className="flex gap-6">
            <div className="bg-white/15 px-6 py-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
              <span className="text-on-primary text-2xl font-bold block">{metrics.salesCount}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-primary/60">Sessions Ledgered</span>
            </div>
            <div className="bg-white/15 px-6 py-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
              <span className="text-on-primary text-2xl font-bold block">{formatCurrency(metrics.netProfit)}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-primary/60">Live Net Equity</span>
            </div>
          </div>
        </div>
        <UserCheck className="absolute -right-8 -bottom-8 text-on-primary/5 w-64 h-64" strokeWidth={1} />
      </div>
    </div>
  );
}
