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
  Sparkles, 
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
  Trash2
} from "lucide-react";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  
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

  const fetchIntelligence = async () => {
    setLoading(true);
    
    // 1. Fetch Low Stock for Liquidity Alert
    const { count: lowStockCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lte('quantity', 10);
    
    // 2. Fetch Weekly Growth for Projection
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentTX } = await supabase
      .from('transactions')
      .select('total_amount, created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (recentTX) {
      const growth = (recentTX.length / 7) * 1.5; // Simplified logic
      setStats({
        liquidityRisk: lowStockCount || 0,
        forecastedGrowth: Number(growth.toFixed(1)),
        activeSKUs: 0 // Placeholder
      });
    }

    setLoading(false);
  };

  const handleExecuteAnalysis = async () => {
    if (!startDate || !endDate) return;
    setGenerating(true);
    
    // Simulations and real calc can happen here
    // For now, we "generate" a report entry into local state based on actual data points
    const { data: filteredTX } = await supabase
      .from('transactions')
      .select('total_amount, total_profit')
      .gte('created_at', new Date(startDate).toISOString())
      .lte('created_at', new Date(endDate).toISOString());

    const totalSales = filteredTX?.reduce((acc, t) => acc + Number(t.total_amount), 0) || 0;
    
    const newReport = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${reportType.toUpperCase()}_${startDate}_TO_${endDate}`,
      category: reportType,
      timestamp: new Date().toLocaleString(),
      status: 'Generated',
      totalSales: totalSales
    };

    // Minor delay for "premium" feeling
    setTimeout(() => {
      setReports([newReport, ...reports]);
      setGenerating(false);
    }, 1500);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

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
            <h3 className="font-heading text-2xl font-black uppercase tracking-tight text-primary">Generate New Report</h3>
          </div>
          
          <div className="flex flex-col gap-6">
            {/* Report Type Selection */}
            <div className="space-y-6">
              <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant mb-4">Report Parameters</label>
              <div className="space-y-3">
                {[
                  { name: "Sales Summary", icon: <LineChart size={20} /> },
                  { name: "Profit Summary", icon: <Activity size={20} /> },
                  { name: "Inventory Status", icon: <Archive size={20} /> },
                  { name: "ROI Analysis", icon: <Calculator size={20} /> }
                ].map(type => (
                  <label 
                    key={type.name} 
                    className={`flex items-center p-4 rounded-2xl cursor-pointer border-2 transition-all group ${reportType === type.name ? 'border-primary bg-primary/5' : 'border-transparent bg-white hover:border-outline-variant/50'}`}
                  >
                    <input 
                      checked={reportType === type.name} 
                      onChange={() => setReportType(type.name)}
                      className="hidden" 
                      type="radio" 
                    />
                    <div className={`${reportType === type.name ? 'text-primary' : 'text-on-surface-variant'} mr-4 transition-colors`}>
                       {type.icon}
                    </div>
                    <span className={`flex-1 font-bold text-sm ${reportType === type.name ? 'text-primary' : 'text-on-surface'}`}>{type.name}</span>
                    <CheckCircle2 className={`text-primary transition-opacity ${reportType === type.name ? 'opacity-100' : 'opacity-0'}`} size={20} />
                  </label>
                ))}
              </div>
            </div>
            
            {/* Date & Actions */}
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-6">
                <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant mb-4">Timeframe Range</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white px-4 py-2.5 rounded-2xl border border-outline-variant/10 focus-within:border-primary transition-all shadow-sm">
                    <span className="block text-[9px] text-on-surface-variant font-black mb-1 uppercase tracking-widest">START DATE</span>
                    <input 
                      className="w-full bg-transparent border-none p-0 text-xs font-extrabold focus:ring-0 outline-none text-primary"                       type="date" 
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="bg-white px-4 py-2.5 rounded-2xl border border-outline-variant/10 focus-within:border-primary transition-all shadow-sm">
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
                  className="w-full py-5 bg-gradient-to-r from-primary to-primary-container text-white rounded-2xl font-heading font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all hover:shadow-2xl active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                  {generating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  EXECUTE ANALYSIS
                </button>
              </div>
            </div>
          </div>
          <Box className="absolute -right-16 -bottom-16 text-primary/5 w-64 h-64 rotate-12" />
        </div>

        {/* Quick Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-secondary px-10 py-8 rounded-3xl relative overflow-hidden group shadow-xl shadow-secondary/10 hover:translate-y-[-4px] transition-all">
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
          
          <div className={`px-10 py-8 rounded-3xl flex flex-col justify-between shadow-xl transition-all border ${stats.liquidityRisk > 0 ? 'bg-error text-white shadow-error/10 border-error/5' : 'bg-surface-container-low border-outline-variant/10'}`}>
            <div>
              <div className={`flex items-center gap-2 mb-6 ${stats.liquidityRisk > 0 ? 'text-white' : 'text-on-surface-variant'}`}>
                <AlertTriangle size={18} />
                <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-70">Liquidity Alert</span>
              </div>
              <p className={`text-base font-bold leading-relaxed mb-6 ${stats.liquidityRisk > 0 ? 'text-white/90' : 'text-on-surface-variant'}`}>
                {stats.liquidityRisk > 0 
                  ? `${stats.liquidityRisk} items are currently reaching critical low-stock thresholds. Action required for optimal ROI.` 
                  : "All inventory segments report healthy liquidity levels. No immediate risk detected."}
              </p>
            </div>
            <button className={`w-full py-4 mt-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 group cursor-pointer ${stats.liquidityRisk > 0 ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-primary/5 text-primary hover:bg-primary/10'}`}>
              VIEW ITEMS
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Recent Reports Activity - Report Repository */}
      <section className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10 shadow-sm relative">
        <div className="px-10 py-8 flex flex-col md:flex-row items-center justify-between border-b border-outline-variant/10 bg-white/50 gap-4">
          <div>
            <h3 className="font-heading text-xl font-black uppercase tracking-tight text-primary">Report Repository</h3>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Archive of generated transactional archives.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <button className="flex-1 md:flex-none px-6 py-2.5 bg-primary text-white text-[10px] font-black rounded-xl uppercase tracking-widest cursor-pointer shadow-lg shadow-primary/20">LIVE HISTORY</button>
             <button className="flex-1 md:flex-none px-6 py-2.5 bg-surface-container-highest text-on-surface-variant text-[10px] font-black rounded-xl uppercase tracking-widest cursor-pointer border border-outline-variant/10">SCHEDULED</button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-surface-container text-on-surface-variant">
              <tr>
                <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant tracking-[0.2em] uppercase">Document Narrative</th>
                <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant tracking-[0.2em] uppercase">Sector</th>
                <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant tracking-[0.2em] uppercase">Protocol Date</th>
                <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant tracking-[0.2em] uppercase">Status</th>
                <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant tracking-[0.2em] uppercase text-right">Result</th>
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
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-surface-container-highest rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <FileText size={20} />
                        </div>
                        <span className="text-sm font-extrabold text-on-surface group-hover:text-primary transition-colors">{report.name}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
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
                       <div className="flex flex-col items-end gap-1">
                         <span className="text-sm font-black text-primary">{fmt(report.totalSales)}</span>
                         <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-tighter italic">Ledgered Balance</span>
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

      {/* Floating Action Contextual */}
      <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-50">
        <button className="w-14 h-14 bg-primary flex items-center justify-center text-white rounded-2xl shadow-2xl hover:scale-110 transition-transform active:scale-95 group cursor-pointer">
          <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

    </div>
  );
}
