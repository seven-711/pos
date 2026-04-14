"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  Clock,
  PlayCircle,
  Activity,
  AlertCircle,
  CheckCircle2,
  Receipt,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import { useSession, type Session } from "@/lib/contexts/SessionContext";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { getLocalTimestamp } from "@/lib/utils/time";
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

type ProductCategory = {
  name: string;
};

type Product = {
  name: string;
  categories: ProductCategory | null;
  selling_price: number;
  stock: number;
  sku?: string;
};

type TransactionItem = {
  quantity: number;
  price: number;
  profit: number;
  products: Product | null;
};

type Transaction = {
  id: string;
  created_at: string;
  total_amount: number;
  total_profit: number;
  payment_method: string;
  notes?: string | null;
  transaction_items: TransactionItem[];
};



export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  // KPIs
  const [totalSales, setTotalSales] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [txCount, setTxCount] = useState(0);

  const [showPreview, setShowPreview] = useState(false);
  const { activeSession, refreshSession, isLayoutHidden, setIsLayoutHidden } = useSession();
  const { theme } = useTheme();
  const [sessionDuration, setSessionDuration] = useState("");

  // Feed & Alerts
  const [recentTX, setRecentTX] = useState<Transaction[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Chart data
  const [hourlyProfitLabels, setHourlyProfitLabels] = useState<string[]>([]);
  const [hourlyProfitData, setHourlyProfitData] = useState<number[]>([]);
  const [dailyVolumeLabels, setDailyVolumeLabels] = useState<string[]>([]);
  const [dailyVolumeData, setDailyVolumeData] = useState<number[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<number[]>([]);
  const [categoryChartData, setCategoryChartData] = useState<any>({ labels: [], datasets: [] });
  const [error, setError] = useState<string | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setIsTimeout(true);
    }, 10000); // 10s timeout fallback
    
    fetchDashboardData();
    return () => clearTimeout(timer);
  }, [activeSession]);

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
    setError(null);
    setIsTimeout(false);
    setLoading(true);

    try {
      // We use the activeSession from context instead of local state

      const currentSession = activeSession;
      const isLive = !!currentSession;
      
      const todayStr = new Date().toLocaleDateString('en-CA');
      const startOfDay = `${todayStr}T00:00:00+08:00`;
      const endOfDay = `${todayStr}T23:59:59+08:00`;

      // We still check for sessions to determine context, but the data is for the full day
      const { data: latestSessions } = await supabase
        .from("store_sessions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1);
      
      const latest = latestSessions?.[0];

      // Standardize query boundaries to the Full Calendar Day
      const queryStart = startOfDay;
      const queryEnd = endOfDay;

      // 2. Fetch Transactions
      const { data: txDataRaw, error: txErr } = await supabase
        .from("transactions")
        .select("*, transaction_items(quantity, price, profit, products(name, categories(name)))")
        .gte("created_at", queryStart)
        .lte("created_at", queryEnd)
        .order("created_at", { ascending: true });

      const txData = txDataRaw as Transaction[] | null;
      if (txErr) throw txErr;

      if (txData) {
        setTxCount(txData.length);
        const sales = txData.reduce((acc: number, t: Transaction) => acc + Number(t.total_amount || 0), 0);
        const profit = txData.reduce((acc: number, t: Transaction) => acc + Number(t.total_profit || 0), 0);
        setTotalSales(sales);
        setTotalProfit(profit);
        setRecentTX([...txData].reverse().slice(0, 5));

        // Hourly aggregation & Peak hours
        const hourlyMap: Record<string, number> = {};
        const peakMap: number[] = new Array(12).fill(0);
        txData.forEach((t) => {
          const localDate = new Date(t.created_at);
          const hour = localDate.getHours();
          const label = `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "am" : "pm"}`;
          hourlyMap[label] = (hourlyMap[label] || 0) + Number(t.total_profit || 0);
          if (hour >= 9 && hour <= 20) peakMap[hour - 9]++;
        });
        setHourlyProfitLabels(Object.keys(hourlyMap));
        setHourlyProfitData(Object.values(hourlyMap));
        setPeakHoursData(peakMap);

        // Category Intelligence
        const categoryMap: Record<string, number> = {};
        txData.forEach((tx) => {
          tx.transaction_items?.forEach((item) => {
            // Identify services (where product_id is null) vs physical products
            let catName = item.products?.categories?.name;
            
            if (!catName) {
              catName = "Gcash services";
            }

            const price = item.price || item.products?.selling_price || 0;
            const sub = Number(price) * Number(item.quantity || 0);
            categoryMap[catName] = (categoryMap[catName] || 0) + sub;
          });
        });
        setCategoryChartData({
          labels: Object.keys(categoryMap),
          datasets: [{
            data: Object.values(categoryMap),
            backgroundColor: [
              "#00286d", // Primary Navy
              "#046b5e", // Teal
              "#8b5cf6", // Violet
              "#ec4899", // Pink
              "#f59e0b", // Amber
              "#ef4444", // Red
              "#10b981"  // Emerald
            ],
            hoverOffset: 12,
            spacing: 4,
            borderRadius: 8,
            borderWidth: 0, 
            cutout: "82%",
          }]
        });
      }

      // 3. Expenses
      const { data: expData, error: expErr } = await supabase
        .from("expenses")
        .select("amount")
        .gte("created_at", queryStart)
        .lte("created_at", queryEnd);
      if (expErr) throw expErr;
      setTotalExpenses(expData?.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0) || 0);

      // 4. Weekly Volume (Keep 7-day view)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const { data: weekTx, error: weekErr } = await supabase
        .from("transactions")
        .select("total_amount, created_at")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });
      if (weekErr) throw weekErr;
      if (weekTx) {
        const dayMap: Record<string, number> = {};
        const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        weekTx.forEach((t: any) => {
          const day = dayLabels[new Date(t.created_at).getDay()];
          dayMap[day] = (dayMap[day] || 0) + Number(t.total_amount || 0);
        });
        setDailyVolumeLabels(Object.keys(dayMap));
        setDailyVolumeData(Object.values(dayMap));
      }

      // 5. Low Stock
      const { data: stockData, error: stockErr } = await supabase
        .from("products")
        .select("id, name, stock")
        .lte("stock", 10).limit(3);
      if (stockErr) throw stockErr;
      if (stockData) setLowStock(stockData.map((s: any) => ({ ...s, quantity: s.stock })));

    } catch (err: any) {
      console.error("Dashboard Sync Error:", err);
      let msg = err.message || "Connection failure";
      if (err.code) msg = `[${err.code}] ${msg}`;
      if (err.hint) msg += ` (Hint: ${err.hint})`;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Global session handlers are used instead

  const netProfit = totalProfit - totalExpenses;
  const roi = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(0) : "0";

  const profitData = {
    labels: hourlyProfitLabels.length > 0 ? hourlyProfitLabels : ["--"],
    datasets: [{
      label: "Profit",
      data: hourlyProfitData.length > 0 ? hourlyProfitData : [0],
      borderColor: theme === 'dark' ? "#8aaaff" : "#00286d",
      borderWidth: 4,
      fill: true,
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        if (theme === 'dark') {
          gradient.addColorStop(0, 'rgba(138, 170, 255, 0.25)');
          gradient.addColorStop(1, 'rgba(138, 170, 255, 0)');
        } else {
          gradient.addColorStop(0, 'rgba(0, 40, 109, 0.15)');
          gradient.addColorStop(1, 'rgba(0, 40, 109, 0)');
        }
        return gradient;
      },
      tension: 0.5,
      pointRadius: 0,
      pointHoverRadius: 8,
      pointHoverBackgroundColor: theme === 'dark' ? "#8aaaff" : "#00286d",
      pointHoverBorderColor: "#fff",
      pointHoverBorderWidth: 3,
    }],
  };

  const salesData = {
    labels: dailyVolumeLabels.length > 0 ? dailyVolumeLabels : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    datasets: [{
      data: dailyVolumeData.length > 0 ? dailyVolumeData : [0, 0, 0, 0, 0, 0, 0],
      backgroundColor: "#046b5e",
      borderRadius: 12,
      borderSkipped: false,
      barThickness: 14,
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

  const commonPlugins = {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0, 12, 32, 0.85)',
      titleFont: { size: 12, family: 'Inter', weight: 'bold' as const },
      titleColor: '#ffffff',
      bodyFont: { size: 11, family: 'Inter' },
      bodyColor: '#ffffff',
      padding: 12,
      cornerRadius: 12,
      displayColors: false,
    }
  };

  const cartesianOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1500,
      easing: 'easeOutQuart' as const
    },
    plugins: commonPlugins,
    scales: {
      y: { display: false },
      x: { 
        grid: { display: false }, 
        ticks: { 
          font: { size: 9, family: "Inter", weight: 'bold' as const },
          color: theme === 'dark' ? '#ffffff' : 'rgba(0,0,0,0.4)'
        } 
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1500,
      easing: 'easeOutQuart' as const
    },
    plugins: commonPlugins,
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
    <div className="max-w-7xl mx-auto w-full px-1">
      {/* Dashboard Header */}
      <div className="flex flex-col gap-2 mb-2 mt-2">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-secondary font-label text-[10px] font-bold uppercase tracking-[0.25em] mb-1">
              {(activeSession && !showPreview) ? "Live Intelligence Flow" : totalSales > 0 ? "Last Session Summary" : "System Standby"}
            </p>
            <h1 className="text-xl font-extrabold tracking-tight text-primary font-heading uppercase">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${
                showPreview 
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                  : "bg-surface-container text-secondary border-outline-variant/10 hover:bg-surface-highest"
              }`}
            >
              {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
              {showPreview ? "Exit Preview" : "Preview Close"}
            </button>
            <div className="hidden md:flex bg-surface-container rounded-2xl p-1 gap-1 border border-outline-variant/10">
              <div className={`flex items-center px-4 py-2 gap-2 text-xs font-bold ${(activeSession && !showPreview) ? "text-secondary" : "text-on-surface-variant/40"}`}>
                <div className={`w-2 h-2 rounded-full ${(activeSession && !showPreview) ? "bg-secondary animate-pulse" : "bg-outline-variant"}`}></div>
                {(activeSession && !showPreview) ? "SYSTEM LIVE" : "SESSION CLOSED"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <div className="col-span-2 md:col-span-1 bg-surface-container-low p-3 rounded-xl border border-outline-variant/10 shadow-sm relative overflow-hidden group">
          <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-4">Total Sales Today</span>
          <div className="text-lg font-extrabold text-primary font-heading mb-0.5">{fmt(totalSales)}</div>
          <div className="text-[9px] text-secondary font-bold flex items-center gap-1 uppercase tracking-tighter">
            <TrendingUp size={12} />
            {txCount} Cycles
          </div>
          <Wallet className="absolute -right-2 -bottom-2 text-primary/5 w-16 h-16 rotate-12" />
        </div>

        <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/10 shadow-sm">
          <span className="text-on-surface-variant text-[8px] font-bold uppercase tracking-widest block mb-2">Gross Profit</span>
          <div className="text-lg font-extrabold text-on-surface font-heading mb-0.5">{fmt(totalProfit)}</div>
          <div className="text-[8px] text-on-surface-variant/60 font-bold uppercase tracking-widest">
            Yield: {totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="bg-surface-container p-3 rounded-xl border border-primary/10 shadow-sm">
          <span className="text-on-surface-variant text-[8px] font-bold uppercase tracking-widest block mb-2">Net Earnings</span>
          <div className={`text-lg font-extrabold font-heading mb-0.5 ${netProfit >= 0 ? "text-primary" : "text-error"}`}>{fmt(netProfit)}</div>
          <div className="text-[8px] text-tertiary font-bold uppercase tracking-widest">Exp: -{fmt(totalExpenses)}</div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-surface-container-highest p-3 rounded-xl relative overflow-hidden group border border-outline-variant/10">
          <span className="text-on-surface-variant text-[8px] font-bold uppercase tracking-widest block mb-1">Efficiency</span>
          <div className="flex items-center gap-1 bg-[var(--color-surface-container-highest)]/60 w-fit px-1.5 py-0.5 rounded-full text-[8px] font-black text-primary border border-primary/5 uppercase tracking-tighter mb-2">ROI {roi}%</div>
          <div className="text-lg font-extrabold text-on-surface font-heading">{txCount}</div>
        </div>
      </section>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2">
        {/* Sales Chart */}
        <div className="md:col-span-8 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-sm text-primary font-heading uppercase tracking-tight">Fin-Velocity</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Hourly Yield Flow</span>
          </div>
          <div className="h-[320px] w-full relative">
            <Line data={profitData} options={{ ...cartesianOptions, scales: { ...cartesianOptions.scales, x: { ...cartesianOptions.scales.x, display: true, ticks: { ...cartesianOptions.scales.x.ticks, font: { ...cartesianOptions.scales.x.ticks.font, weight: 'bold' as const } } } } }} />
          </div>
        </div>

        {/* Side Stats Section */}
        <div className="md:col-span-4 flex flex-col gap-8">
          {/* Category Hub */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
            <h3 className="font-extrabold text-xs text-primary mb-4 font-heading uppercase tracking-tight flex justify-between items-center">
              Segments
              <Activity size={14} className="text-on-surface-variant" />
            </h3>
            <div className="h-[140px] relative mb-2">
              <Doughnut data={categoryChartData} options={{ ...doughnutOptions, cutout: '85%' }} />
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
          <div className="bg-error/5 p-4 rounded-xl border border-error/10 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-[9px] text-error uppercase tracking-widest flex items-center gap-1">
                <AlertCircle size={12} />
                Risk
              </h3>
            </div>
            <div className="space-y-2">
              {lowStock.length === 0 ? (
                <div className="flex items-center gap-2 text-on-surface-variant py-1">
                  <span className="text-[8px] font-bold uppercase tracking-widest">Reconciled</span>
                </div>
              ) : (
                lowStock.map(item => (
                  <div key={item.id} className="flex justify-between items-center group">
                    <div>
                      <p className="text-[10px] font-bold text-on-surface">{item.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-error">{item.quantity}u</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tertiary Layout: Activity & Store Status */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        {/* Live Activity Stream */}
        <div className="md:col-span-2 bg-surface-container-low rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-outline-variant/10 flex justify-between items-center bg-[var(--color-surface-container)]/50">
            <h3 className="font-extrabold text-xs text-primary font-heading uppercase tracking-tight">Intelligence Feed</h3>
            <span className="px-1.5 py-0.5 bg-surface-container text-on-surface-variant text-[7px] font-bold uppercase tracking-widest rounded-full">Auditor Sync</span>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {recentTX.length === 0 ? (
              <div className="p-20 text-center text-on-surface-variant opacity-30 italic">No activity ledgered today.</div>
            ) : (
              recentTX.map(tx => (
                <div key={tx.id} className="p-3 hover:bg-[var(--color-surface-container-highest)] transition-colors flex justify-between items-center group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <Receipt size={16} className="opacity-40" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">#ID: {tx.id.split('-')[0].toUpperCase()}</p>
                      <p className="text-[8px] font-bold text-on-surface-variant/50 uppercase">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-primary">{fmt(tx.total_amount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="w-full p-4 text-[9px] font-bold text-on-surface-variant text-center uppercase tracking-[0.2em] bg-surface-container/50 hover:bg-surface-container transition-all">View All Archives</button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/10 shadow-sm">
            <h3 className="font-extrabold text-[8px] text-on-surface-variant mb-2 uppercase tracking-widest">Growth</h3>
            <div className="h-[120px] relative">
              <Bar data={salesData} options={cartesianOptions} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary to-primary-container p-4 rounded-xl text-on-primary shadow-lg shadow-primary/20 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-end gap-1 mb-2">
                <span className="text-2xl font-black font-heading leading-none">{roi}</span>
                <span className="text-xs font-bold mb-0.5">% ROI</span>
              </div>
              <button className="bg-white/20 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest">
                Analytics
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
