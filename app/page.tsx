"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  Clock,
  Loader2,
  PlayCircle,
  Activity,
  AlertCircle,
  CheckCircle2,
  Receipt,
  ArrowRight
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

type Session = {
  id: string;
  started_at: string;
  ended_at: string | null;
  total_sales: number | null;
  total_profit: number | null;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  // KPIs
  const [totalSales, setTotalSales] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [txCount, setTxCount] = useState(0);

  // Current active session
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessionDuration, setSessionDuration] = useState("");

  // Feed & Alerts
  const [recentTX, setRecentTX] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);

  // Chart data
  const [hourlyProfitLabels, setHourlyProfitLabels] = useState<string[]>([]);
  const [hourlyProfitData, setHourlyProfitData] = useState<number[]>([]);
  const [dailyVolumeLabels, setDailyVolumeLabels] = useState<string[]>([]);
  const [dailyVolumeData, setDailyVolumeData] = useState<number[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<number[]>([]);
  const [categoryChartData, setCategoryChartData] = useState<any>({ labels: [], datasets: [] });
  const [error, setError] = useState<string | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setIsTimeout(true);
    }, 10000); // 10s timeout fallback
    
    fetchDashboardData();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      const started = new Date(activeSession.started_at);
      const now = new Date();
      const diffMs = now.getTime() - started.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setSessionDuration(`${hours}h ${minutes}m active`);
    }, 30000);

    // Initial Calc
    const started = new Date(activeSession.started_at);
    const now = new Date();
    const diffMs = now.getTime() - started.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    setSessionDuration(`${hours}h ${minutes}m active`);
    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    setIsTimeout(false);

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // 1. Transactions Today & Activity Feed
      const { data: txData, error: txErr } = await supabase
        .from("transactions")
        .select("*, transaction_items(quantity, price, profit, products(name, categories(name)))")
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString())
        .order("created_at", { ascending: true });

      if (txErr) throw txErr;

      if (txData) {
        setTxCount(txData.length);
        setRecentTX([...txData].reverse().slice(0, 5));
        const sales = txData.reduce((acc, t) => acc + Number(t.total_amount || 0), 0);
        const profit = txData.reduce((acc, t) => acc + Number(t.total_profit || 0), 0);
        setTotalSales(sales);
        setTotalProfit(profit);

        // Hourly aggregation
        const hourlyMap: Record<string, number> = {};
        txData.forEach((t) => {
          const hour = new Date(t.created_at).getHours();
          const label = `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "am" : "pm"}`;
          hourlyMap[label] = (hourlyMap[label] || 0) + Number(t.total_profit || 0);
        });
        setHourlyProfitLabels(Object.keys(hourlyMap));
        setHourlyProfitData(Object.values(hourlyMap));

        // Peak hours (9am to 8pm)
        const peakMap: number[] = new Array(12).fill(0);
        txData.forEach((t) => {
          const hour = new Date(t.created_at).getHours();
          if (hour >= 9 && hour <= 20) peakMap[hour - 9]++;
        });
        setPeakHoursData(peakMap);

        // Category Intelligence
        const categoryMap: Record<string, number> = {};
        txData.forEach(tx => {
          tx.transaction_items?.forEach((item: any) => {
            const catName = item.products?.categories?.name || 'Uncategorized';
            const price = item.price || item.products?.selling_price || 0;
            const qty = item.quantity || 0;
            const sub = Number(price) * Number(qty);
            categoryMap[catName] = (categoryMap[catName] || 0) + sub;
          });
        });

        const labels = Object.keys(categoryMap);
        const vals = Object.values(categoryMap);

        setCategoryChartData({
          labels,
          datasets: [{
            data: vals,
            backgroundColor: ["#00286d", "#046b5e", "#693527", "#8c6e5e", "#003d9b"],
            borderWidth: 0,
            cutout: "75%",
          }]
        });
      }

      // 2. Today's Expenses
      const { data: expData, error: expErr } = await supabase
        .from("expenses")
        .select("amount")
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString());

      if (expErr) throw expErr;
      if (expData) {
        setTotalExpenses(expData.reduce((acc, e) => acc + Number(e.amount || 0), 0));
      }

      // 3. Weekly Volume
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: weekTx, error: weekErr } = await supabase
        .from("transactions")
        .select("total_amount, created_at")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (weekErr) throw weekErr;
      if (weekTx) {
        const dayMap: Record<string, number> = {};
        const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        weekTx.forEach((t) => {
          const day = dayLabels[new Date(t.created_at).getDay()];
          dayMap[day] = (dayMap[day] || 0) + Number(t.total_amount || 0);
        });
        setDailyVolumeLabels(Object.keys(dayMap));
        setDailyVolumeData(Object.values(dayMap));
      }

      // 4. Low Stock Alerts
      const { data: stockData, error: stockErr } = await supabase
        .from("products")
        .select("name, stock, sku")
        .lte("stock", 10)
        .limit(3);
      if (stockErr) throw stockErr;
      if (stockData) setLowStock(stockData.map(s => ({ ...s, quantity: s.stock })));

      // 5. Active Session
      const { data: sessionData, error: sessionErr } = await supabase
        .from("store_sessions")
        .select("*")
        .is("ended_at", null)
        .limit(1);
      if (sessionErr) throw sessionErr;
      if (sessionData?.length) setActiveSession(sessionData[0]);

    } catch (err: any) {
      console.error("Dashboard Sync Error:", err);
      setError(err.message || "Connection failure");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async () => {
    const { data, error } = await supabase
      .from("store_sessions")
      .insert([{ started_at: new Date().toISOString() }])
      .select()
      .single();
    if (data) setActiveSession(data);
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    const { error } = await supabase
      .from("store_sessions")
      .update({
        ended_at: new Date().toISOString(),
        total_sales: totalSales,
        total_profit: totalProfit,
      })
      .eq("id", activeSession.id);
    if (!error) setActiveSession(null);
  };

  const netProfit = totalProfit - totalExpenses;
  const roi = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(0) : "0";

  const profitData = {
    labels: hourlyProfitLabels.length > 0 ? hourlyProfitLabels : ["--"],
    datasets: [{
      label: "Profit",
      data: hourlyProfitData.length > 0 ? hourlyProfitData : [0],
      borderColor: "#00286d",
      borderWidth: 3,
      fill: true,
      backgroundColor: "rgba(0, 40, 109, 0.1)",
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 6,
    }],
  };

  const salesData = {
    labels: dailyVolumeLabels.length > 0 ? dailyVolumeLabels : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    datasets: [{
      data: dailyVolumeData.length > 0 ? dailyVolumeData : [0, 0, 0, 0, 0, 0, 0],
      backgroundColor: "#046b5e",
      borderRadius: 4,
      barThickness: 12,
    }],
  };

  const peakData = {
    labels: ["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm", "7pm", "8pm"],
    datasets: [{
      data: peakHoursData.length > 0 ? peakHoursData : new Array(12).fill(0),
      backgroundColor: peakHoursData.map((val) => val > 5 ? "#00286d" : val > 2 ? "#003d9b" : "#dae2ff"),
      borderRadius: 2,
    }],
  };

  const cleanOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { display: false },
      x: { grid: { display: false }, ticks: { font: { size: 10, family: "Inter" } } },
    },
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(n);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[var(--color-surface)] z-[1000] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
        <div className="max-w-md w-full">
          {isTimeout || error ? (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-error-container text-error rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <AlertCircle size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-black font-heading text-on-surface tracking-tight">Sync Encountered a Glitch</h1>
                <p className="text-on-surface-variant text-sm mt-1">{error || "The operational matrix handshake timed out. Check your internet or local network connection."}</p>
              </div>
              <button 
                onClick={() => fetchDashboardData()}
                className="px-8 py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 cursor-pointer"
              >
                Retry System Handshake
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8 relative">
                <div className="w-24 h-24 rounded-full border-4 border-primary/10 border-t-primary animate-spin mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity size={28} className="text-primary animate-pulse" />
                </div>
              </div>
              <h1 className="text-4xl font-black text-primary tracking-tighter mb-2 font-heading">POS NI ESTELA</h1>
              <div className="h-[2px] w-12 bg-primary mx-auto mb-6"></div>
              <div className="flex items-center justify-center gap-3 text-secondary font-bold text-xs uppercase tracking-widest">
                <Loader2 className="animate-spin" size={16} />
                <span>Syncing Operational Matrix</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4">
      {/* Dashboard Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-secondary font-label text-[10px] font-bold uppercase tracking-[0.25em] mb-1">Status Protocol</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-primary font-heading uppercase">Dashboard</h1>
          </div>
          <div className="hidden md:flex bg-surface-container rounded-2xl p-1 gap-1 border border-outline-variant/10">
            <div className="flex items-center px-4 py-2 gap-2 text-xs font-bold text-secondary">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
              SYSTEM LIVE
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="col-span-2 md:col-span-1 bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 shadow-sm relative overflow-hidden group">
          <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-4">Total Sales Today</span>
          <div className="text-3xl font-extrabold text-primary font-heading mb-1">{fmt(totalSales)}</div>
          <div className="text-xs text-secondary font-bold flex items-center gap-1.5 uppercase tracking-tighter">
            <TrendingUp size={14} />
            {txCount} Processing Cycles Completed
          </div>
          <Wallet className="absolute -right-4 -bottom-4 text-primary/5 w-32 h-32 rotate-12" />
        </div>

        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
          <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-4">Gross Profit</span>
          <div className="text-3xl font-extrabold text-on-surface font-heading mb-1">{fmt(totalProfit)}</div>
          <div className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-widest">
            Yield Margin: {totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="bg-surface-container p-6 rounded-3xl border border-primary/10 shadow-sm">
          <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-4">Net Earnings</span>
          <div className={`text-3xl font-extrabold font-heading mb-1 ${netProfit >= 0 ? "text-primary" : "text-error"}`}>{fmt(netProfit)}</div>
          <div className="text-[10px] text-tertiary font-bold uppercase tracking-widest">Expenses: -{fmt(totalExpenses)}</div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-surface-container-highest p-6 rounded-3xl relative overflow-hidden group border border-outline-variant/10">
          <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-1">Capital Efficiency</span>
          <div className="flex items-center gap-2 bg-white/60 w-fit px-3 py-1 rounded-full text-[10px] font-black text-primary border border-primary/5 uppercase tracking-[0.1em] mb-4">ROI {roi}% ALPHA</div>
          <div className="text-3xl font-extrabold text-on-surface font-heading">{txCount}</div>
          <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-1">Sessions Catalogued</p>
        </div>
      </section>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
        {/* Sales Chart */}
        <div className="md:col-span-8 bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-extrabold text-xl text-primary font-heading uppercase tracking-tight">Financial Velocity</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Hourly Yield Flow</span>
          </div>
          <div className="h-[320px] w-full relative">
            <Line data={profitData} options={{ ...cleanOptions, scales: { x: { display: true, ticks: { font: { weight: 'bold' } } } } }} />
          </div>
        </div>

        {/* Side Stats Section */}
        <div className="md:col-span-4 flex flex-col gap-8">
          {/* Category Hub */}
          <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
            <h3 className="font-extrabold text-lg text-primary mb-8 font-heading uppercase tracking-tight flex justify-between items-center">
              Segment Data
              <Activity size={18} className="text-on-surface-variant" />
            </h3>
            <div className="h-[220px] relative mb-6">
              <Doughnut data={categoryChartData} options={{ ...cleanOptions, cutout: '78%' }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-primary">{categoryChartData.labels?.length || 0}</span>
                <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest">Active Sectors</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {categoryChartData.labels.slice(0, 4).map((label: string, idx: number) => (
                <div key={label} className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryChartData.datasets[0].backgroundColor[idx] }}></div>
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Widget (Low Stock) */}
          <div className="bg-error/5 p-8 rounded-3xl border border-error/10 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-xs text-error uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={14} />
                Inventory Risk
              </h3>
              <span className="px-2 py-0.5 bg-error text-white text-[8px] font-black rounded-full uppercase">High Priority</span>
            </div>
            <div className="space-y-4">
              {lowStock.length === 0 ? (
                <div className="flex items-center gap-2 text-on-surface-variant py-2">
                  <CheckCircle2 size={16} className="text-secondary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Logistics Reconciled</span>
                </div>
              ) : (
                lowStock.map(item => (
                  <div key={item.sku} className="flex justify-between items-center group">
                    <div>
                      <p className="text-xs font-bold text-on-surface group-hover:text-error transition-colors">{item.name}</p>
                      <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-error">{item.quantity} units</p>
                      <p className="text-[8px] font-bold text-on-surface-variant/40 uppercase tracking-tighter">Under Thrshold</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="w-full mt-6 py-3 bg-error/10 hover:bg-error/20 text-error text-[10px] font-black uppercase tracking-widest transition-all rounded-xl border border-error/5">
              Optimize Logistics
            </button>
          </div>
        </div>
      </div>

      {/* Tertiary Layout: Activity & Store Status */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {/* Live Activity Stream */}
        <div className="md:col-span-2 bg-surface-container-low rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-white/50">
            <h3 className="font-extrabold text-lg text-primary font-heading uppercase tracking-tight">Record Intelligence Feed</h3>
            <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-[9px] font-bold uppercase tracking-widest rounded-full">Automated Auditor Sync</span>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {recentTX.length === 0 ? (
              <div className="p-20 text-center text-on-surface-variant opacity-30 italic">No activity ledgered today.</div>
            ) : (
              recentTX.map(tx => (
                <div key={tx.id} className="p-6 hover:bg-white transition-colors flex justify-between items-center group cursor-pointer">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300">
                      <Receipt size={22} className="opacity-40 group-hover:opacity-100" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">#{tx.id.split('-')[0].toUpperCase()} Session</p>
                      <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mt-0.5">ID: {tx.id.split('-')[0]} • {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-primary">{fmt(tx.total_amount)}</span>
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-tighter">Profit yielded</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="w-full p-4 text-[9px] font-bold text-on-surface-variant text-center uppercase tracking-[0.2em] bg-surface-container/50 hover:bg-surface-container transition-all">View All Archives</button>
        </div>

        {/* Weekly Volume & ROI Matrix */}
        <div className="flex flex-col gap-8">
          <div className="bg-surface-container p-8 rounded-3xl border border-outline-variant/10 shadow-sm flex-grow">
            <h3 className="font-extrabold text-xs text-on-surface-variant mb-6 uppercase tracking-widest">7-Day Capital Velocity</h3>
            <div className="h-[200px] relative">
              <Bar data={salesData} options={cleanOptions} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary to-primary-container p-8 rounded-3xl text-on-primary shadow-xl shadow-primary/20 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="font-extrabold text-xs text-on-primary/70 mb-2 uppercase tracking-widest">Operational Summary</h3>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-5xl font-black font-heading leading-none">{roi}</span>
                <span className="text-xl font-bold mb-1">% ROI</span>
              </div>
              <p className="text-sm font-medium text-on-primary/80 leading-relaxed mb-6">
                Your efficiency matrix is currently at Alpha status. All sectors are reporting optimal capital rotation.
              </p>
              <button className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2">
                Predictive Report <ArrowRight size={14} />
              </button>
            </div>
            <PiggyBank className="absolute -right-8 -bottom-8 text-on-primary/5 w-64 h-64" strokeWidth={1} />
          </div>
        </div>
      </section>

      {/* Terminal Status Footer */}
      <section className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm mb-12 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center border transition-all ${activeSession ? 'bg-secondary/10 border-secondary/20 list-inside text-secondary shadow-lg shadow-secondary/5' : 'bg-surface-container border-outline-variant/10 text-on-surface-variant opacity-40'}`}>
            <Clock size={32} className={activeSession ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h3 className="font-black text-2xl font-heading text-primary uppercase tracking-tight">
              {activeSession ? "ACTIVE TERMINAL" : "STATION OFFLINE"}
            </h3>
            <p className="text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mt-1 italic">
              {activeSession
                ? `Operational since ${new Date(activeSession.started_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })} • ${sessionDuration}`
                : "Initiate system handshake to begin session archives."}
            </p>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          {activeSession ? (
            <button
              onClick={handleCloseSession}
              className="flex-1 md:flex-none px-12 py-5 bg-secondary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              Terminate Session
            </button>
          ) : (
            <button
              onClick={handleOpenSession}
              className="flex-1 md:flex-none px-12 py-5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
            >
              <PlayCircle size={20} />
              Open Ledger Channel
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
