"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart2,
  LineChart,
  Activity,
  Archive,
  Calculator,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Hourglass,
  Download,
  ChevronDown,
  Plus,
  Box,
  Loader2,
  Trash2,
  X,
  AlertCircle
} from "lucide-react";
import { useSession } from "@/lib/contexts/SessionContext";

interface Transaction {
  id: string;
  total_amount: number;
  total_profit: number;
  created_at: string;
}

interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  quantity: number;
  price: number;
  products?: { name: string };
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
  categories?: { name: string };
}

const getReportColor = (cat: string) => {
  switch (cat) {
    case "Sales Summary": return "text-primary bg-primary/10";
    case "Profit Summary": return "text-on-surface bg-surface-container-highest";
    case "Inventory Status": return "text-amber-600 bg-amber-50";
    case "ROI Analysis": return "text-emerald-600 bg-emerald-50";
    default: return "text-on-surface-variant bg-surface-container-highest";
  }
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  
  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [showAudit, setShowAudit] = useState(false);


  const [isLiquidityExpanded, setIsLiquidityExpanded] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<LowStockProduct[]>([]);


  // Analytics State for Cards
  const [stats, setStats] = useState({
    liquidityRisk: 0,
    forecastedGrowth: 0,
    activeSKUs: 0
  });



  // Filter State
  const [reportType, setReportType] = useState("Sales Summary");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchIntelligence();
  }, []);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [showToast]);



  const fetchIntelligence = async () => {
    // Safety exit: stop loading after 5 seconds no matter what
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    try {
      setLoading(true);
      
      if (!supabase) {
        console.error("Supabase client is not initialized.");
        return;
      }

      // 1. Fetch real product stock for Liquidity Alert
      const { data: prods, error: prodsErr } = await supabase
        .from('products')
        .select('id, name, stock, min_stock, categories(name)');
      
      if (prodsErr) {
        console.error("Prods Fetch Error:", prodsErr);
      } else {
        const filteredLow = (prods as any[])?.filter(p => Number(p.stock) <= Number(p.min_stock)) || [];
        setLowStockItems(filteredLow as LowStockProduct[]);
      }

      // 2. Fetch Weekly Growth for Projection (Sales Velocity)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: recentTX, error: txErr } = await supabase
        .from('transactions')
        .select('total_amount, created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (txErr) {
        console.error("Recent TX Fetch Error:", txErr);
      } else if (recentTX && prods) {
        const growth = recentTX.length > 0 ? (recentTX.length / 50) * 10 : 0;
        const filteredLow = (prods as any[])?.filter(p => Number(p.stock) <= Number(p.min_stock)) || [];
        
        setStats({
          liquidityRisk: filteredLow.length,
          forecastedGrowth: Number(growth.toFixed(1)),
          activeSKUs: prods?.length || 0
        });
      }
    } catch (err) {
      console.error("Intelligence Sync Error:", err);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  };

  const handleExecuteAnalysis = async () => {
    if (!startDate || !endDate) return;
    setGenerating(true);

    try {
      // 1. Fetch real transactions between dates
      // We set time to start and end of selected days
      // Correct Local Day boundaries
      const start = `${startDate}T00:00:00+08:00`;
      const end = `${endDate}T23:59:59.999+08:00`;

      const { data: filteredTX, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end);

      if (txErr) throw txErr;

      // 2. Fetch all related line items for detailed analysis
      const txIds = (filteredTX as Transaction[])?.map((t: Transaction) => t.id) || [];
      let metrics = {
        revenue: 0,
        profit: 0,
        count: filteredTX?.length || 0,
        avgValue: 0,
        itemCount: 0,
        topProduct: 'None'
      };

      if (txIds.length > 0) {
        const { data: items, error: itemsErr } = await supabase
          .from('transaction_items')
          .select('*, products(name)')
          .in('transaction_id', txIds);

        if (itemsErr) throw itemsErr;

        const typedTX = filteredTX as Transaction[];
        const typedItems = items as TransactionItem[];

        // Calculate Detail Metrics
        metrics.revenue = typedTX.reduce((acc: number, t: Transaction) => acc + Number(t.total_amount), 0);
        metrics.profit = typedTX.reduce((acc: number, t: Transaction) => acc + Number(t.total_profit), 0);
        metrics.avgValue = metrics.revenue / metrics.count;
        metrics.itemCount = typedItems?.reduce((acc: number, i: TransactionItem) => acc + Number(i.quantity), 0) || 0;

        // Find Top Product
        const prodMap: Record<string, number> = {};
        typedItems?.forEach((i: TransactionItem) => {
          const name = i.products?.name || 'Unknown';
          prodMap[name] = (prodMap[name] || 0) + i.quantity;
        });
        const top = Object.entries(prodMap).sort((a,b) => b[1] - a[1])[0];
        if (top) metrics.topProduct = top[0];
      }

      const newReport = {
        id: Math.random().toString(36).substr(2, 9),
        name: `${reportType.toUpperCase()}_${startDate.replace(/-/g, '')}_TO_${endDate.replace(/-/g, '')}`,
        category: reportType,
        timestamp: new Date().toLocaleString(),
        status: 'Generated',
        totalSales: metrics.revenue,
        details: metrics, // Store full intelligence for the modal
        range: { start: startDate, end: endDate }
      };

      setReports(prev => [newReport, ...prev]);
      setToastMsg(`${reportType} Analysis ledgered successfully!`);
      setToastType("success");
      setShowToast(true);
    } catch (err: any) {
      console.error("Analysis Failure:", err);
      setToastMsg("Analysis calibration failed.");
      setToastType("error");
      setShowToast(true);
    } finally {
      setGenerating(false);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(n);

  const generateDetailedCommentary = (report: any) => {
    if (!report || !report.details) return [];
    const { details, range, category } = report;
    const efficiency = details.revenue > 0 ? ((details.profit / details.revenue) * 100).toFixed(1) : "0";
    
    const paragraphs = [
      `The ${category} audit for the period spanning ${range.start} to ${range.end} indicates a total gross yield of ${fmt(details.revenue)}, generating a net operating surplus of ${fmt(details.profit)} after variable cost deductions.`,
      `This performance reflects a profit efficiency of ${efficiency}%, demonstrating ${Number(efficiency) > 15 ? 'exceptional' : 'stable'} capital retention and margin health. A total of ${details.count} unique transactions were ledgered locally, involving the movement of ${details.itemCount} individual stock units through the POS inventory system.`,
      `Analytical correlation identifies "${details.topProduct}" as the cycle's primary 'Alpha' SKU, maintaining high-velocity throughput and established market dominance. The Average Order Value (AOV) stabilized at ${fmt(details.avgValue || 0)}, suggesting ${details.avgValue > 500 ? 'high-density' : 'consistent'} purchasing behavior across the customer base.`
    ];

    return paragraphs;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-on-surface-variant font-bold animate-pulse uppercase tracking-widest text-xs">Calibrating Analytics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full relative px-4 pb-12">

      {/* Page Header */}
      <div className="mb-10">
        <p className="text-secondary font-label text-[10px] font-black uppercase tracking-[0.3em] mb-1">Intelligence Protocol</p>
        <h2 className="text-4xl font-heading font-extrabold text-primary tracking-tight uppercase italic">Intelligence Ledger</h2>
        <p className="text-on-surface-variant text-sm mt-1">Strategic data analysis and performance forecasting.</p>
      </div>

      {/* Generate Report Bento Section */}
      <section className="space-y-8 mb-12">
        {/* Selection Panel */}
        <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10 shadow-lg relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-primary flex items-center justify-center rounded-2xl shadow-xl shadow-primary/20">
              <BarChart2 className="text-white" size={24} />
            </div>
            <h3 className="font-heading font-black uppercase tracking-tight text-primary">Generate Report</h3>
          </div>

          <div className="flex flex-col gap-6">
            {/* Report Type Selection */}
            <div className="space-y-6">
              <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant mb-4">Report Parameters</label>
              <div className="space-y-3">
                {[
                  { name: "Sales Summary", icon: <LineChart size={20} />, color: "border-primary bg-primary/5", text: "text-primary" },
                  { name: "Profit Summary", icon: <Activity size={20} />, color: "border-on-surface bg-surface-container-high", text: "text-on-surface" },
                  { name: "Inventory Status", icon: <Archive size={20} />, color: "border-amber-600 bg-amber-50", text: "text-amber-600" },
                  { name: "ROI Analysis", icon: <Calculator size={20} />, color: "border-emerald-600 bg-emerald-50", text: "text-emerald-600" }
                ].map(type => (
                  <label
                    key={type.name}
                    className={`flex items-center p-4 rounded-2xl cursor-pointer border-2 transition-all group ${reportType === type.name ? type.color : 'border-transparent bg-white hover:border-outline-variant/50'}`}
                  >
                    <input
                      checked={reportType === type.name}
                      onChange={() => setReportType(type.name)}
                      className="hidden"
                      type="radio"
                    />
                    <div className={`${reportType === type.name ? type.text : 'text-on-surface-variant'} mr-4 transition-colors`}>
                      {type.icon}
                    </div>
                    <span className={`flex-1 font-bold text-sm ${reportType === type.name ? type.text : 'text-on-surface'}`}>{type.name}</span>
                    <CheckCircle2 className={`transition-opacity ${reportType === type.name ? 'opacity-100 ' + type.text : 'opacity-0'}`} size={20} />
                  </label>
                ))}
              </div>
            </div>

            {/* Date & Actions */}
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-6">
                <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant mb-4">Timeframe Range</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white px-2 py-1.5 rounded-2xl border border-outline-variant/10 focus-within:border-primary transition-all shadow-sm">
                    <span className="block text-[9px] text-on-surface-variant font-black mb-1 uppercase tracking-widest">START DATE</span>
                    <input
                      className="w-full bg-transparent border-none p-0 text-xs font-extrabold focus:ring-0 outline-none text-primary" type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="bg-white px-2 py-1.5 rounded-2xl border border-outline-variant/10 focus-within:border-primary transition-all shadow-sm">
                    <span className="block text-[9px] text-on-surface-variant font-black mb-1 uppercase tracking-widest">END DATE</span>
                    <input
                      className="w-full bg-transparent border-none p-0 text-xs font-extrabold focus:ring-0 outline-none text-primary"
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-12 space-y-4">
                <button
                  onClick={handleExecuteAnalysis}
                  disabled={generating}
                  className="w-full py-5 bg-gradient-to-r from-primary to-primary-container text-white rounded-2xl font-heading font-black text-sm tracking-[0.1em] uppercase flex items-center justify-center gap-1 transition-all hover:shadow-2xl active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                  {generating ? "Calibrating..." : "Execute Analysis"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-secondary px-6 py-6 rounded-3xl relative overflow-hidden group shadow-xl shadow-secondary/10 hover:translate-y-[-4px] transition-all">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-on-secondary mb-6">
                <TrendingUp size={16} className="text-on-secondary opacity-60" />
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-on-secondary/70">Performance Projection</span>
              </div>
              <h4 className="text-4xl font-heading font-black text-white">+{stats.forecastedGrowth}%</h4>
              <p className="text-on-secondary/80 text-sm mt-4 font-bold leading-relaxed">Forecasted revenue velocity for the upcoming session based on recent inventory turnover data.</p>
            </div>
            <TrendingUp className="absolute bottom-[-20px] right-[-20px] text-white opacity-5 w-48 h-48" />
          </div>

          <div className={`px-6 py-6 rounded-3xl flex flex-col shadow-xl transition-all duration-500 border overflow-hidden ${
            stats.liquidityRisk > 0 
              ? 'bg-error text-white shadow-error/10 border-error/5' 
              : 'bg-surface-container-low border-outline-variant/10'
          } ${isLiquidityExpanded ? 'md:col-span-2' : ''}`}>
            
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className={`flex items-center justify-between mb-6 ${stats.liquidityRisk > 0 ? 'text-white' : 'text-on-surface-variant'}`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-70">Liquidity Alert</span>
                  </div>
                  {isLiquidityExpanded && (
                    <button 
                      onClick={() => setIsLiquidityExpanded(false)}
                      className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <p className={`text-base font-bold leading-relaxed ${stats.liquidityRisk > 0 ? 'text-white/90' : 'text-on-surface-variant'}`}>
                    {stats.liquidityRisk > 0
                      ? `${stats.liquidityRisk} items are currently reaching critical low-stock thresholds. Action required for optimal ROI.`
                      : "All inventory segments report healthy liquidity levels. No immediate risk detected."}
                  </p>
                  
                  {!isLiquidityExpanded && (
                    <button 
                      onClick={() => setIsLiquidityExpanded(true)}
                      disabled={stats.liquidityRisk === 0}
                      className={`py-4 px-8 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${stats.liquidityRisk > 0 ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-primary/5 text-primary'}`}
                    >
                      VIEW ITEMS
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              </div>

              {/* Animated Item List */}
              <div className={`grid transition-all duration-500 ease-in-out ${isLiquidityExpanded ? 'grid-rows-[1fr] mt-8 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                    {lowStockItems.map((item) => (
                      <a 
                        key={item.id}
                        href={`/inventory?highlight=${item.id}`}
                        className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between group hover:bg-white/20 transition-all cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-60 truncate">{item.categories?.name || 'Segment'}</p>
                          <h5 className="text-xs font-black truncate">{item.name}</h5>
                          <div className="flex items-center gap-2 mt-2">
                             <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden min-w-[60px]">
                                <div 
                                   className={`h-full ${item.stock <= 5 ? 'bg-white' : 'bg-white/60'}`}
                                   style={{ width: `${Math.min((item.stock / item.min_stock) * 100, 100)}%` }}
                                />
                             </div>
                             <span className="text-[8px] font-black whitespace-nowrap">{item.stock}/{item.min_stock}</span>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-primary transition-all">
                          <ArrowRight size={14} />
                        </div>
                      </a>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t border-white/10 mt-4 flex justify-between items-center text-[9px] font-black uppercase tracking-widest opacity-60">
                    <span>Targeting Critical Liquidity Segments</span>
                    <button onClick={() => setIsLiquidityExpanded(false)} className="hover:underline cursor-pointer">COLLAPSE PROTOCOL</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Recent Reports Activity - Report Repository */}
      <section className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10 shadow-sm relative">
        <div className="px-6 py-6 flex flex-col md:flex-row items-center justify-between border-b border-outline-variant/10 bg-white/50 gap-4">
          <div>
            <h3 className="font-heading text-xl font-black uppercase tracking-tight text-primary">Report Repository</h3>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Archive of generated transactional archives.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex-1 md:flex-none px-6 py-2 bg-primary text-white text-[10px] font-black rounded-xl uppercase tracking-widest cursor-pointer shadow-lg shadow-primary/20">HISTORY</button>
            <button className="flex-1 md:flex-none px-6 py-2.5 bg-surface-container-highest text-on-surface-variant text-[10px] font-black rounded-xl uppercase tracking-widest cursor-pointer border border-outline-variant/10">SCHEDULED</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-surface-container text-on-surface-variant">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-on-surface-variant tracking-[0.2em] uppercase">Document Narrative</th>
                <th className="px-6 py-4 text-[10px] font-black text-on-surface-variant tracking-[0.2em] uppercase">Sector</th>
                <th className="px-6 py-4 text-[10px] font-black text-on-surface-variant tracking-[0.2em] uppercase">Protocol Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-on-surface-variant tracking-[0.2em] uppercase">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-on-surface-variant tracking-[0.2em] uppercase text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center opacity-20">
                        <FileText size={40} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-black text-on-surface uppercase italic">Audit Ledger Empty</p>
                        <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">Execute an analysis above to generate a static report entry.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr key={report.id} className="hover:bg-primary/5 transition-all group bg-white">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${getReportColor(report.category).split(' ')[1]} ${getReportColor(report.category).split(' ')[0]} group-hover:scale-110 transition-transform`}>
                          <FileText size={20} />
                        </div>
                        <span className={`text-sm font-extrabold transition-colors ${getReportColor(report.category).split(' ')[0]}`}>{report.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{report.category}</span>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{report.timestamp}</span>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(4,107,94,0.4)]"></span>
                        <span className="text-[10px] font-black text-secondary uppercase tracking-widest">{report.status}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-6">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-black text-primary">{fmt(report.totalSales)}</span>
                          <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-tighter italic">Ledgered Balance</span>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedReport(report);
                            setShowAudit(true);
                          }}
                          className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all cursor-pointer group/btn"
                        >
                          <FileText size={18} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {reports.length > 0 && (
          <div className="px-10 py-6 bg-surface-container-low flex items-center justify-center border-t border-outline-variant/10">
            <button className="text-[10px] font-black uppercase text-on-surface-variant hover:text-primary tracking-[0.25em] flex items-center gap-2 transition-all cursor-pointer">
              Load More Archives
              <ChevronDown size={14} />
            </button>
          </div>
        )}
      </section>


      {/* Strategic Audit Ledger Modal */}
      {showAudit && selectedReport && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 md:p-10 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-surface/40 backdrop-blur-xl print:hidden"
            onClick={() => setShowAudit(false)}
          />
          
          {/* Document Content */}
          <div id="report-canvas" className="relative w-full max-w-2xl bg-white shadow-[0_32px_64px_rgba(0,0,0,0.15)] rounded-3xl md:rounded-[2.5rem] border border-outline-variant/5 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Modal Control Bar (Excluded from Print) */}
            <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between bg-white print:hidden">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAudit(false)}
                  className="p-2 hover:bg-surface-container-high rounded-full text-on-surface-variant transition-colors"
                >
                  <ChevronDown className="rotate-90" size={20} />
                </button>
                <span className="text-[7px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Audit Preview</span>
              </div>
              <div className="flex items-center gap-2">
                 <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-[7px] font-black uppercase tracking-widest flex items-center gap-2 hover:shadow-lg active:scale-95 transition-all"
                >
                  <Download size={14} />
                  Save as PDF
                </button>
              </div>
            </div>

            {/* Print Body */}
            <div className="flex-grow overflow-y-auto p-5 md:p-8 space-y-6 custom-scrollbar">
              {/* Document Header */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b-2 border-primary/10 pb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-2xl text-white shadow-xl shadow-primary/20">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="text-lg font-heading font-black text-primary tracking-tight leading-none">STRATEGIC AUDIT LEDGER</h4>
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Index: {selectedReport.id.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pt-2">
                    <div>
                      <p className="text-[7px] font-black text-on-surface-variant uppercase opacity-50 mb-0.5">Generated PST</p>
                      <p className="text-[11px] font-bold text-on-surface uppercase">{selectedReport.timestamp}</p>
                    </div>
                    <div>
                      <p className="text-[7px] font-black text-on-surface-variant uppercase opacity-50 mb-0.5">Ledger Category</p>
                      <p className="text-[11px] font-bold text-on-surface uppercase">{selectedReport.category}</p>
                    </div>
                  </div>
                </div>
                <div className="md:text-right bg-primary/5 px-4 py-3 rounded-2xl border border-primary/10 w-full md:w-auto self-stretch md:self-auto flex flex-col justify-center">
                  <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-0.5 opacity-70 leading-none">Analysis Period</p>
                  <p className="text-sm font-black text-primary font-mono whitespace-nowrap">{selectedReport.range.start} - {selectedReport.range.end}</p>
                </div>
              </div>

              {/* KPI Intensity Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                  <p className="text-[8px] font-black text-on-surface-variant uppercase mb-1">Total Revenue</p>
                  <p className="text-lg font-black text-primary font-mono">{fmt(selectedReport.details.revenue)}</p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                   <p className="text-[8px] font-black text-on-surface-variant uppercase mb-1">Net Profit</p>
                   <p className="text-lg font-black text-secondary font-mono">{fmt(selectedReport.details.profit)}</p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                   <p className="text-[8px] font-black text-on-surface-variant uppercase mb-1">Efficiency (AOV)</p>
                   <p className="text-lg font-black text-primary font-mono">{fmt(selectedReport.details.avgValue)}</p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                   <p className="text-[8px] font-black text-on-surface-variant uppercase mb-1">Volume Traded</p>
                   <p className="text-lg font-black text-on-surface font-mono">{selectedReport.details.count} TX</p>
                </div>
              </div>

              {/* Strategic Insights Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h5 className="text-[10px] font-black text-on-surface uppercase tracking-[0.2em]">Strategic Insights</h5>
                </div>
                
                <div className="bg-white rounded-[1.5rem] border border-primary/10 overflow-hidden shadow-sm">
                  <div className="px-5 py-3 bg-primary/5 border-b border-primary/10 flex justify-between items-center">
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">Transaction Intelligence</span>
                    <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">{selectedReport.details.itemCount} Items Handled</span>
                  </div>
                  <div className="p-5 space-y-5">
                     <div className="flex justify-between items-end">
                       <div className="space-y-0.5">
                          <p className="text-[7px] font-black text-on-surface-variant uppercase opacity-50">ALPHA PRODUCT (Top Performer)</p>
                          <p className="text-base font-black text-primary uppercase tracking-tight">{selectedReport.details.topProduct}</p>
                       </div>
                       <TrendingUp className="text-primary mb-1" size={20} />
                     </div>
                      <div className="bg-surface-container-high/30 p-5 rounded-3xl border border-outline-variant/10 space-y-4">
                         <div className="flex items-start gap-4">
                            <Activity size={18} className="text-secondary shrink-0 mt-1" />
                            <div className="space-y-4">
                               {generateDetailedCommentary(selectedReport).map((para, i) => (
                                 <p key={i} className="text-[11px] font-bold text-on-surface leading-relaxed italic opacity-90">
                                   "{para}"
                                 </p>
                               ))}
                            </div>
                         </div>
                         <div className="pt-4 mt-4 border-t border-outline-variant/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
                               <span className="text-[9px] font-black text-secondary uppercase tracking-[0.2em]">Calibration Verdict: Optimal Cache</span>
                            </div>
                            <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest italic">Pos ni Estela Intelligence Suite</span>
                         </div>
                      </div>
                  </div>
                </div>
              </div>

              {/* Document Footer (Print Only) */}
              <div className="hidden print:block pt-10 border-t border-outline-variant/10 text-center">
                 <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.3em]">Official Performance Audit Ledger • POS ni Estela</p>
              </div>
            </div>
          </div>
        </div>
      )}



      {showToast && (
        <div className={`fixed top-4 right-4 md:top-6 md:right-6 z-[1200] ${toastType === 'success' ? 'bg-secondary text-white' : 'bg-error text-white'} px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 max-w-[280px] md:max-w-xs border border-white/10`}>
          <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            {toastType === 'success' ? <CheckCircle2 size={16} strokeWidth={3} /> : <AlertCircle size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[11px] tracking-tight uppercase opacity-80">{toastType === 'success' ? 'Intelligence Sync' : 'System Error'}</p>
            <p className="text-[12px] font-bold leading-tight truncate">{toastMsg}</p>
          </div>
          <button onClick={() => setShowToast(false)} className="opacity-40 hover:opacity-100 transition-opacity p-1 ml-1">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
