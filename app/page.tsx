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
  ArrowUpRight,
  Loader2,
  Eye,
  EyeOff,
  Package
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
  const { activeSession, refreshSession, isLayoutHidden, setIsLayoutHidden, hasSystemBooted, setHasSystemBooted } = useSession();
  const [loading, setLoading] = useState(!hasSystemBooted);

  // KPIs
  const [totalSales, setTotalSales] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [txCount, setTxCount] = useState(0);

  const [showPreview, setShowPreview] = useState(false);
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
  const [historyProfitLabels, setHistoryProfitLabels] = useState<string[]>([]);
  const [historyProfitData, setHistoryProfitData] = useState<number[]>([]);
  const [historySalesData, setHistorySalesData] = useState<number[]>([]);
  const [timeRange, setTimeRange] = useState<'1Y' | '6M' | '3M' | '1M'>('1M');
  const [dailyVolumeLabels, setDailyVolumeLabels] = useState<string[]>([]);
  const [dailyVolumeData, setDailyVolumeData] = useState<number[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<number[]>([]);
  const [txPerHour, setTxPerHour] = useState<number>(0);
  const [txGrowth, setTxGrowth] = useState<number>(0);
  const [performanceLabel, setPerformanceLabel] = useState<string>("Analyzing...");
  const [summaryRange, setSummaryRange] = useState<'today' | 'this_month' | 'last_month' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [categoryChartData, setCategoryChartData] = useState<any>({ labels: [], datasets: [] });
  const [error, setError] = useState<string | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const [profitGrowth, setProfitGrowth] = useState<number>(0);
  const [salesGrowth, setSalesGrowth] = useState<number>(0);
  const [netFlowGrowth, setNetFlowGrowth] = useState<number>(0);
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setIsTimeout(true);
    }, 10000); // 10s timeout fallback

    fetchDashboardData();

    // Periodic Refresh (every 60s) for live intelligence (only if range is 'today')
    let refreshInterval: NodeJS.Timeout | null = null;
    if (summaryRange === 'today') {
      refreshInterval = setInterval(() => fetchDashboardData(true), 60000);
    }

    // Listen for global ecosystem sync
    const handleGlobalSync = () => {
      fetchDashboardData(true);
    };
    window.addEventListener('global-sync', handleGlobalSync);

    return () => {
      clearTimeout(timer);
      if (refreshInterval) clearInterval(refreshInterval);
      window.removeEventListener('global-sync', handleGlobalSync);
    };
  }, [activeSession, summaryRange, customDate]);

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

  const fetchDashboardData = async (silent = false) => {
    setError(null);
    setIsTimeout(false);
    if (!silent && !hasSystemBooted) setLoading(true);

    try {
      // We use the activeSession from context instead of local state

      const currentSession = activeSession;
      const isLive = !!currentSession;

      const now = new Date();
      let queryStart, queryEnd;

      if (summaryRange === 'today') {
        const todayStr = now.toLocaleDateString('en-CA');
        queryStart = `${todayStr}T00:00:00+08:00`;
        queryEnd = `${todayStr}T23:59:59+08:00`;
      } else if (summaryRange === 'this_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        queryStart = firstDay.toISOString();
        queryEnd = now.toISOString();
      } else if (summaryRange === 'last_month') {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        queryStart = firstDayLastMonth.toISOString();
        queryEnd = lastDayLastMonth.toISOString();
      } else {
        // Custom Date
        queryStart = `${customDate}T00:00:00+08:00`;
        queryEnd = `${customDate}T23:59:59+08:00`;
      }

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

        // Fetch All-Time History for Daily Velocity
        const { data: allHistory } = await supabase
          .from("transactions")
          .select("created_at, total_profit, total_amount")
          .order("created_at", { ascending: true });

        if (allHistory) {
          // Use a single map to ensure keys (dates) are perfectly aligned for both metrics
          const dayManifest: Record<string, { profit: number, sales: number }> = {};

          (allHistory as any[]).forEach((t: { created_at: string, total_profit: number | null, total_amount: number | null }) => {
            const dateStr = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!dayManifest[dateStr]) {
              dayManifest[dateStr] = { profit: 0, sales: 0 };
            }
            dayManifest[dateStr].profit += (Number(t.total_profit) || 0);
            dayManifest[dateStr].sales += (Number(t.total_amount) || 0);
          });

          const labels = Object.keys(dayManifest);
          setHistoryProfitLabels(labels);
          setHistoryProfitData(labels.map(l => dayManifest[l].profit));
          setHistorySalesData(labels.map(l => dayManifest[l].sales));

          // Velocity Calculation: Compare current sum to yesterday
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yestStr = yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          const yestCount = (allHistory as any[]).filter(t => 
            new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === yestStr
          ).length;

          if (yestCount > 0) {
            setTxGrowth(((txData.length - yestCount) / yestCount) * 100);
          } else if (txData.length > 0) {
            setTxGrowth(100);
          } else {
            setTxGrowth(0);
          }

          // Performance Label Logic (Simple Average Comparison)
          const allCounts = labels.map(l => (allHistory as any[]).filter(t => 
            new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === l
          ).length);
          const avgCount = allCounts.reduce((a, b) => a + b, 0) / (allCounts.length || 1);
          
          if (txData.length > avgCount * 1.2) setPerformanceLabel("Top 20% Performance");
          else if (txData.length > avgCount) setPerformanceLabel("Above Average");
          else setPerformanceLabel("Stable Rhythm");

          const yestProfit = dayManifest[yestStr]?.profit || 0;
          const yestSales = dayManifest[yestStr]?.sales || 0;

          if (yestProfit > 0) {
            setProfitGrowth(((profit - yestProfit) / yestProfit) * 100);
          } else if (profit > 0) {
            setProfitGrowth(100);
          } else {
            setProfitGrowth(0);
          }

          if (yestSales > 0) {
            setSalesGrowth(((sales - yestSales) / yestSales) * 100);
          } else if (sales > 0) {
            setSalesGrowth(100);
          } else {
            setSalesGrowth(0);
          }

          // Transactions per hour calc
          if (activeSession) {
            const started = new Date(activeSession.started_at);
            const hoursElapsed = Math.max(1, (new Date().getTime() - started.getTime()) / (1000 * 60 * 60));
            setTxPerHour(txData.length / hoursElapsed);
          } else {
            setTxPerHour(0);
          }
        }

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
        .select("id, name, stock, image_url")
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
      setHasSystemBooted(true);
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
      borderColor: "#3B82F6",
      borderWidth: 4,
      fill: true,
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)'); // Electric Blue at peak
        gradient.addColorStop(0.6, 'rgba(59, 130, 246, 0.05)'); // Fade out mid-way
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');    // Total transparent at base
        return gradient;
      },
      tension: 0.5,
      pointRadius: 0,
      pointHitRadius: 20, // Make it much easier to trigger hover
      pointHoverRadius: 8,
      pointHoverBackgroundColor: "#3B82F6",
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
          font: { size: 9, family: "Poppins", weight: 'bold' as const },
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
    plugins: {
      ...commonPlugins,
      tooltip: {
        ...commonPlugins.tooltip,
        titleFont: { ...commonPlugins.tooltip.titleFont, family: "Poppins" },
        bodyFont: { ...commonPlugins.tooltip.bodyFont, family: "Poppins" }
      }
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
              <h1 className="text-4xl font-black text-primary tracking-tighter mb-2 font-heading italic">POS NI ESTELA</h1>
              <div className="h-[2px] w-12 bg-primary mx-auto mb-6"></div>
              <div className="h-[2px] w-12 bg-primary mx-auto mb-6"></div>
              {/* Placeholder to keep layout spacing if needed, but removing text as requested */}
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
          <div>
            <p className="text-secondary font-label text-[10px] font-bold uppercase tracking-[0.25em] mb-1">
              {summaryRange === 'today' 
                ? (activeSession ? "Live Intelligence Flow" : "Last Session Summary") 
                : summaryRange === 'this_month' 
                  ? "Current Month Analytics" 
                  : summaryRange === 'last_month' 
                    ? "Previous Month Review" 
                    : `Archive Entry: ${customDate}`}
            </p>
            <h1 className="text-xl font-extrabold tracking-tight text-primary font-heading uppercase">Dashboard</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Historical Range Navigator */}
            <div className="flex bg-surface-container rounded-2xl p-1 gap-1 border border-outline-variant/10 shadow-sm overflow-x-auto no-scrollbar max-w-[90vw] md:max-w-none">
              {[
                { id: 'today', label: 'Today' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'custom', label: 'Custom' }
              ].map((range) => (
                <button
                  key={range.id}
                  onClick={() => setSummaryRange(range.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    summaryRange === range.id
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-secondary hover:bg-surface-highest"
                  }`}
                >
                  {range.id === 'custom' && summaryRange === 'custom' ? (
                    <input 
                      type="date" 
                      value={customDate} 
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="bg-transparent border-none p-0 focus:ring-0 text-[9px] font-black uppercase text-white cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : range.label}
                </button>
              ))}
            </div>

            <div className="hidden lg:flex bg-surface-container rounded-2xl p-1 gap-1 border border-outline-variant/10">
              <div className={`flex items-center px-4 py-2 gap-2 text-xs font-bold ${activeSession ? "text-secondary" : "text-on-surface-variant/40"}`}>
                <div className={`w-2 h-2 rounded-full ${activeSession ? "bg-secondary animate-pulse" : "bg-outline-variant"}`}></div>
                {activeSession ? "SYSTEM LIVE" : "SESSION CLOSED"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">

        {/* ─── Total Sales Card ─── */}
        <div className={`col-span-2 md:col-span-1 p-4 rounded-3xl relative overflow-hidden group transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] cursor-pointer border border-white/20 flex flex-col justify-between min-h-[140px] ${theme === 'dark'
            ? "bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E67E00] text-white shadow-[0_20px_50px_rgba(255,149,0,0.3)]"
            : "bg-gradient-to-br from-[#0052D4] via-[#4364F7] to-[#6FB1FC] text-white shadow-[0_20px_50px_rgba(0,82,212,0.2)]"
          }`}>
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white opacity-[0.15] pointer-events-none" />
          <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-25 transition-all duration-700 group-hover:scale-110">
            <Wallet size={120} strokeWidth={1} />
          </div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/70">Total Revenue</span>
              {salesGrowth !== 0 && (
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black ${salesGrowth > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {salesGrowth > 0 ? '\u2191' : '\u2193'} {Math.abs(salesGrowth).toFixed(0)}%
                </div>
              )}
            </div>
            <div className="text-3xl font-black font-heading tracking-tighter text-white drop-shadow-md leading-none">
              {fmt(totalSales)}
            </div>
            <p className="text-[7px] font-bold uppercase tracking-widest text-white/40 mt-1">{txCount} transactions {summaryRange === 'today' ? 'today' : 'this period'}</p>
          </div>

          <div className="relative z-10 flex flex-col gap-1.5">
            {salesGrowth !== 0 && (
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${salesGrowth > 0 ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-200'}`}>
                {salesGrowth > 0 ? <TrendingUp size={8} /> : <TrendingUp size={8} className="rotate-180" />}
                {Math.abs(salesGrowth).toFixed(1)}% {salesGrowth > 0 ? 'higher' : 'lower'}
                <span className="opacity-50 lowercase ml-0.5">vs yesterday</span>
              </div>
            )}
            {txCount > 0 && activeSession && (
              <p className="text-[7px] text-white/30 uppercase font-bold tracking-tighter ml-0.5">Peak hour: {hourlyProfitLabels.length > 0 ? hourlyProfitLabels[hourlyProfitData.indexOf(Math.max(...hourlyProfitData))] : '--'}</p>
            )}
          </div>
        </div>

        {/* ─── Gross Yield Card ─── */}
        <div className="bg-gradient-to-br from-[#046156] via-[#058b7a] to-[#046156] p-4 rounded-3xl relative overflow-hidden group transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] cursor-pointer text-white border border-white/10 shadow-[0_20px_50px_rgba(4,107,94,0.15)] flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 opacity-[0.15] pointer-events-none" />
          <div className="absolute -right-2 top-0 opacity-10 group-hover:opacity-20 transition-all duration-700 group-hover:rotate-12 group-hover:scale-110">
            <TrendingUp size={100} strokeWidth={1.5} />
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/50">Gross Profit</span>
              {profitGrowth !== 0 && (
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black ${profitGrowth > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {profitGrowth > 0 ? '\u2191' : '\u2193'} {Math.abs(profitGrowth).toFixed(0)}%
                </div>
              )}
            </div>
            <div className="text-3xl font-black font-heading tracking-tighter drop-shadow-lg leading-none">{fmt(totalProfit)}</div>
            <p className="text-[7px] font-bold uppercase tracking-widest text-white/40 mt-1">Profit margin from sales</p>
          </div>

          <div className="flex flex-col gap-1.5 relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-tight">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
              {totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0}% Margin
            </div>
            
            {profitGrowth !== 0 && (
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${profitGrowth > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                {profitGrowth > 0 ? <TrendingUp size={8} /> : <TrendingUp size={8} className="rotate-180" />}
                {Math.abs(profitGrowth).toFixed(1)}% {profitGrowth > 0 ? 'higher' : 'lower'}
                <span className="opacity-50 lowercase ml-0.5">vs yesterday</span>
              </div>
            )}
            {totalSales > 0 && totalProfit / totalSales < 0.15 && (
              <p className="text-[7px] text-amber-300/70 font-bold uppercase tracking-tighter ml-0.5">Margin below 15% — review pricing</p>
            )}
          </div>
        </div>

        {/* ─── Net Flow Card ─── */}
        <div className="bg-gradient-to-br from-[#3D00B0] via-[#5F00FF] to-[#3D00B0] p-4 rounded-3xl relative overflow-hidden group transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] cursor-pointer text-white border border-white/10 shadow-[0_20px_50px_rgba(61,0,176,0.15)] flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 opacity-[0.15] pointer-events-none" />
          <div className="absolute -right-2 top-0 opacity-10 group-hover:opacity-20 transition-all duration-700 group-hover:-rotate-12 group-hover:scale-110">
            <ArrowUpRight size={100} strokeWidth={1.5} />
          </div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/50">Net Profit</span>
              {netProfit !== 0 && (
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black ${netProfit >= 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {netProfit >= 0 ? '\u2191' : '\u2193'} {totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(0) : 0}%
                </div>
              )}
            </div>
            <div className="text-3xl font-black font-heading tracking-tighter drop-shadow-lg leading-none">{fmt(netProfit)}</div>
            <p className="text-[7px] font-bold uppercase tracking-widest text-white/40 mt-1">After all deductions</p>
          </div>

          <div className="flex flex-col gap-1.5 relative z-10">
            {/* Mini Breakdown */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="text-[8px] font-black text-emerald-300">{fmt(totalProfit)}</span>
                <span className="text-[6px] text-emerald-300/60 uppercase">in</span>
              </div>
              <div className="flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full">
                <span className="text-[8px] font-black text-red-300">{fmt(totalExpenses)}</span>
                <span className="text-[6px] text-red-300/60 uppercase">out</span>
              </div>
            </div>
            <p className={`text-[7px] font-bold uppercase tracking-tighter ml-0.5 ${netProfit >= totalProfit * 0.5 ? 'text-emerald-300/50' : 'text-amber-300/50'}`}>
              {totalExpenses === 0 ? 'No expenses recorded' : netProfit >= totalProfit * 0.8 ? 'Healthy cash flow' : netProfit >= totalProfit * 0.5 ? 'Moderate expenses' : 'High expense ratio'}
            </p>
          </div>
        </div>

        {/* Efficiency Card */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-[#D4145A] via-[#FBB03B] to-[#D4145A] p-4 rounded-3xl relative overflow-hidden group transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] cursor-pointer text-white border border-white/10 shadow-[0_20px_50px_rgba(212,20,90,0.15)] flex flex-col justify-between min-h-[130px]">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 opacity-[0.2] pointer-events-none" />
          
          {/* Subtle Sparkline Background */}
          <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30 pointer-events-none">
            <div className="flex items-end justify-between h-full px-4 gap-0.5">
              {peakHoursData.map((val, i) => (
                <div 
                  key={i} 
                  className="bg-white rounded-t-sm transition-all duration-1000"
                  style={{ 
                    height: `${Math.max(10, (val / Math.max(...peakHoursData, 1)) * 100)}%`,
                    width: '100%' 
                  }}
                />
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/50">Velocity Index</span>
              {txGrowth !== 0 && (
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase ${txGrowth > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {txGrowth > 0 ? '↑' : '↓'} {Math.abs(txGrowth).toFixed(0)}%
                </div>
              )}
            </div>
            <div className="text-3xl font-black font-heading tracking-tighter drop-shadow-lg leading-none">
              {txCount} <span className="text-xs opacity-50">Cycles</span>
            </div>
            <p className="text-[7px] font-bold uppercase tracking-widest text-white/40 mt-1">~{txPerHour.toFixed(1)} transactions per hour</p>
          </div>

          <div className="relative z-10 flex flex-col gap-1.5">
            <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-lg px-2 py-0.5 rounded-full border border-white/10">
              <span className="text-[9px] font-black text-white uppercase tracking-tight">
                {performanceLabel}
              </span>
            </div>
            <p className="text-[7px] text-white/30 uppercase font-black tracking-tighter ml-1">Speed vs Session Avg</p>
          </div>
        </div>
      </section>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 items-start">
        {/* Fin-Velocity Chart - Redesigned Command Center */}
        <div className="md:col-span-8 bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 shadow-sm relative overflow-hidden group">
          <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center sm:items-start mb-8 gap-4">
            <div className="text-center sm:text-left">
              <span className="text-xl font-black text-on-surface tracking-tighter uppercase font-heading">
                {summaryRange === 'today' 
                  ? (timeRange === '1M' ? 'Monthly Yield Flow' : 'Historical Velocity Hub')
                  : summaryRange === 'this_month'
                    ? 'Intra-Month Velocity'
                    : summaryRange === 'last_month'
                      ? 'Retrospective Archive'
                      : `Range Analysis Hub`}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Granular Range Toggle */}
              <div className="bg-surface-container-high p-0.5 rounded-xl flex border border-outline-variant/10">
                {[
                  { id: '1M', label: '1 Month' },
                  { id: '3M', label: '3 Months' },
                  { id: '6M', label: '6 Months' },
                  { id: '1Y', label: '1 Year' }
                ].map((range) => (
                  <button
                    key={range.id}
                    onClick={() => setTimeRange(range.id as any)}
                    className={`px-2.5 py-1 rounded-lg font-medium text-[9px] transition-all ${timeRange === range.id ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[180px] w-full relative">
            {(() => {
              const now = new Date();
              const days = timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : timeRange === '6M' ? 180 : 365;
              const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

              const filteredIndices = historyProfitLabels.map((l, i) => {
                const year = l.includes('Jan') && now.getMonth() < 6 ? now.getFullYear() : now.getFullYear();
                const d = new Date(l + ', ' + year);
                return d >= cutoff ? i : -1;
              }).filter(i => i !== -1);

              return (
                <Line
                  data={{
                    labels: filteredIndices.map(i => historyProfitLabels[i]),
                    datasets: [
                      {
                        ...profitData.datasets[0],
                        data: filteredIndices.map(i => historySalesData[i]),
                        label: 'Gross Sales',
                        borderColor: "#F59E0B", // Orange for Sales
                        pointHoverBackgroundColor: "#F59E0B",
                        backgroundColor: (context: any) => {
                          const ctx = context.chart.ctx;
                          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                          gradient.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
                          gradient.addColorStop(0.6, 'rgba(245, 158, 11, 0.05)');
                          gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
                          return gradient;
                        },
                      },
                      {
                        label: 'Net Profit',
                        data: filteredIndices.map(i => historyProfitData[i]),
                        borderColor: "#10B981", // Green for Profit
                        pointHoverBackgroundColor: "#10B981",
                        borderWidth: 3,
                        pointRadius: 0,
                        tension: 0.5,
                        fill: false, // Keep it clean to avoid overlapping fills
                      }
                    ]
                  }}
                  options={{
                    ...cartesianOptions,
                    interaction: {
                      mode: 'index',
                      intersect: false,
                    },
                    plugins: {
                      ...cartesianOptions.plugins,
                      tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        padding: 12,
                        titleFont: { family: 'Poppins', weight: 'bold', size: 10 },
                        bodyFont: { family: 'Poppins', weight: 'bold', size: 13 },
                        displayColors: true,
                        boxWidth: 8,
                        boxHeight: 8,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                          label: (context) => {
                            const i = context.dataIndex;
                            const globalIdx = filteredIndices[i];
                            const s = historySalesData[globalIdx] || 0;
                            const p = historyProfitData[globalIdx] || 0;

                            // Let Chart.js handle the multi-item tooltip by returning value for each dataset
                            if (context.datasetIndex === 0) {
                              return ` Sales: ${fmt(s)}`;
                            } else {
                              return ` Profit: ${fmt(p)}`;
                            }
                          }
                        }
                      }
                    },
                    scales: {
                      ...cartesianOptions.scales,
                      y: {
                        display: true,
                        min: 0,
                        max: 1000,
                        grid: {
                          color: 'rgba(59, 130, 246, 0.08)',
                          drawTicks: false,
                        },
                        afterBuildTicks: (axis: any) => {
                          axis.ticks = [100, 250, 500, 750, 1000].map(v => ({ value: v }));
                        },
                        border: { display: false },
                        ticks: {
                          padding: 10,
                          font: { family: 'Poppins', size: 9, weight: 'bold' as const },
                          color: theme === 'dark' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.4)',
                          callback: (value: any) => {
                            if (value === 1000) return '₱1k';
                            return '₱' + value;
                          }
                        }
                      },
                      x: {
                        ...cartesianOptions.scales.x,
                        display: true,
                        ticks: {
                          ...cartesianOptions.scales.x.ticks,
                          padding: 10,
                          font: { ...cartesianOptions.scales.x.ticks.font, size: 8, family: 'Poppins', weight: 'bold' as const }
                        }
                      }
                    }
                  }}
                />
              );
            })()}
          </div>
        </div>

        {/* Category Intelligence */}
        <div className="md:col-span-4 bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 shadow-sm relative overflow-hidden group">
          <h3 className="font-extrabold text-[10px] text-primary mb-6 font-heading uppercase tracking-[0.2em] flex justify-between items-center opacity-70">
            Segments Hub
            <Activity size={14} className="text-primary/40 group-hover:rotate-180 transition-transform duration-700" />
          </h3>

          <div className="grid grid-cols-2 gap-8 items-center">
            <div className="h-[150px] relative">
              <Doughnut data={categoryChartData} options={{ ...doughnutOptions, cutout: '82%' }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-primary leading-none">
                  {categoryChartData.labels?.length || 0}
                </span>
                <span className="text-[7px] font-black text-on-surface-variant uppercase tracking-[0.1em] mt-1 opacity-50">Sectors</span>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 pr-2">
              {categoryChartData.labels.slice(0, 5).map((label: string, idx: number) => (
                <div key={label} className="flex items-center gap-3 group/item">
                  <div
                    className="w-1.5 h-6 rounded-full shadow-sm group-hover/item:scale-y-125 transition-transform"
                    style={{ backgroundColor: categoryChartData.datasets[0].backgroundColor[idx] || '#ccc' }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-on-surface uppercase tracking-tight truncate">
                      {label}
                    </span>
                    <span className="text-[7px] font-bold text-on-surface-variant/40 uppercase tracking-widest text-primary/40">Active Stream</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tertiary Layout: Activity & Store Status */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 items-start">
        {/* Transaction History */}
        <div className="md:col-span-8 bg-surface-container-low rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden flex flex-col h-fit">
          <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container/30 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>
              <h3 className="font-black text-[10px] text-primary font-heading uppercase tracking-widest">Transaction History</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[7px] font-bold text-on-surface-variant/30 uppercase tracking-widest">Live Sync</span>
            </div>
          </div>

          <div className="divide-y divide-outline-variant/5">
            {recentTX.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant opacity-20 italic font-medium">No ledgered activity today.</div>
            ) : (
              recentTX.map(tx => (
                <div key={tx.id} className="p-4 hover:bg-primary/[0.02] transition-all flex justify-between items-center group relative cursor-pointer">
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-all rounded-r-full"></div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                      <Receipt size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-[11px] font-bold text-on-surface tracking-tight truncate max-w-[150px]">
                          {tx.transaction_items?.[0]?.products?.name || "Gcash Service"}
                          {(tx.transaction_items?.length || 0) > 1 && (
                            <div className="relative group/more inline-block">
                              <span className="text-primary/50 ml-1 cursor-help hover:text-primary transition-colors">+{tx.transaction_items.length - 1} more</span>
                              <div className="absolute bottom-full left-0 mb-2 p-2 bg-on-surface text-surface text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/more:opacity-100 active:opacity-100 pointer-events-none transition-all duration-300 whitespace-nowrap z-50 shadow-2xl border border-white/10 translate-y-2 group-hover/more:translate-y-0">
                                <div className="flex flex-col gap-1">
                                  {tx.transaction_items.slice(1).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <div className="w-1 h-1 bg-primary rounded-full"></div>
                                      {item.products?.name || "Service Entry"}
                                    </div>
                                  ))}
                                </div>
                                <div className="absolute top-[100%] left-2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-on-surface"></div>
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="bg-emerald-500/10 text-emerald-600 text-[6px] font-black px-1 py-0.5 rounded uppercase tracking-widest">VERIFIED</span>
                      </div>
                      <p className="text-[8px] font-bold text-on-surface-variant/40 uppercase tracking-widest font-heading">
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-primary tracking-tighter">{fmt(tx.total_amount)}</span>
                    <span className="text-[7px] font-black text-on-surface-variant/20 uppercase tracking-tighter mt-0.5">#TX-{tx.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="w-full p-3.5 text-[8px] font-black text-primary text-center uppercase tracking-[0.3em] bg-surface-container/20 hover:bg-primary/5 transition-all border-t border-outline-variant/10">
            Access Full Archive
          </button>
        </div>

        {/* Side Section: Risk matrix and ROI */}
        <div className="md:col-span-4 flex flex-col gap-2">
          {/* Depletion Risk Widget */}
          <div className="bg-error/5 p-3 rounded-2xl border border-error/10 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-black text-[9px] text-error uppercase tracking-[0.2em] flex items-center gap-1.5">
                <div className="w-1 h-1 bg-error rounded-full animate-pulse"></div>
                Depletion Risk
              </h3>
              <span className="text-[7px] font-bold text-error/30 uppercase tracking-widest">Priority</span>
            </div>

            <div className="space-y-1.5">
              {lowStock.length === 0 ? (
                <div className="py-4 text-center bg-white/5 rounded-xl border border-dashed border-error/10">
                  <p className="text-[8px] font-black text-error/30 uppercase tracking-widest">Inventory Clear</p>
                </div>
              ) : (
                lowStock.map(item => {
                  const stockPercent = (item.quantity / 10) * 100;
                  const isCritical = item.quantity <= 3;
                  return (
                    <div key={item.id} className="relative p-2 rounded-xl flex items-center gap-3 group/item overflow-hidden bg-surface-container-low border border-outline-variant/5 transition-all hover:bg-surface-container-highest">
                      <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${isCritical ? 'bg-red-500 animate-pulse' : 'bg-amber-500'} opacity-[0.06]`} style={{ width: `${stockPercent}%` }} />
                      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${isCritical ? 'bg-red-500' : 'bg-amber-400'}`} />
                      <div className="relative z-10 w-8 h-8 rounded-lg overflow-hidden bg-surface-container shadow-inner flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-error/5">
                            <Package size={14} className="text-on-surface-variant/20" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 relative z-10">
                        <h4 className="text-[10px] font-black text-on-surface truncate tracking-tight uppercase">{item.name}</h4>
                        <div className="flex items-center gap-1.5 ">
                          <span className={`text-[9px] font-black ${isCritical ? 'text-red-500' : 'text-amber-600'} tracking-tighter`}>{item.quantity} units</span>
                          <span className="text-[7px] font-bold text-on-surface-variant/30 lowercase italic">remain</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/10 shadow-sm">
            <h3 className="font-extrabold text-[8px] text-on-surface-variant/50 mb-3 uppercase tracking-[0.2em] px-1">Growth Matrix</h3>
            <div className="h-[100px] relative">
              <Bar data={salesData} options={cartesianOptions} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 via-primary to-secondary p-4 rounded-2xl text-white shadow-xl shadow-primary/30 relative overflow-hidden group border border-white/10">
            {/* Ambient Glow */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-white/10 blur-2xl rounded-full group-hover:bg-white/20 transition-all duration-700"></div>

            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
              <TrendingUp size={60} strokeWidth={1} />
            </div>

            <div className="relative z-10">
              <div className="flex items-baseline gap-1">
                <h3 className="text-3xl font-black font-heading tracking-tighter">{roi}%</h3>
                <div className="flex items-center text-[7px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                  +2.4%
                </div>
              </div>

              <p className="text-[8px] font-bold uppercase tracking-[0.2em] mt-0.5 text-white/60">Yield ROI</p>

              <div className="mt-4">
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
                  <div
                    className="h-full bg-gradient-to-r from-white/40 via-white to-white/40 shadow-[0_0_10px_rgba(255,255,255,0.5)] relative overflow-hidden"
                    style={{ width: `${roi}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-[7px] font-bold text-white/30 lowercase italic">
                  <span>alpha_node</span>
                  <span className="bg-white/10 px-1 rounded">SYNCED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
