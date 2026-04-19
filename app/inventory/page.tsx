"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/contexts/SessionContext";
import { getLocalTimestamp } from "@/lib/utils/time";
import { showToast } from "@/lib/utils/toast";
import { 
  BellRing, 
  SlidersHorizontal, 
  Search, 
  Zap,
  Loader2,
  AlertCircle,
  Plus,
  History,
  TrendingUp,
  Package,
  Box,
  ArrowUpRight,
  X,
  Library
} from "lucide-react";
import { MediaGallery } from "@/components/storage/MediaGallery";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";


interface Product {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
  cost_price: number;
  selling_price: number;
  category_id: string;
  image_url?: string;
  categories?: { name: string };
}

interface InventoryLog {
  id: string;
  product_id: string;
  quantity_change: number;
  type: string;
  notes: string;
  created_at: string;
  products: { name: string } | null;
}

export default function InventoryPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    }>
      <InventoryContent />
    </Suspense>
  );
}

function InventoryContent() {
  const [products, setProducts] = useState<Product[]>([]);

  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const { hasSystemBooted, setHasSystemBooted } = useSession();
  const [loading, setLoading] = useState(!hasSystemBooted);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  
  const searchParams = useSearchParams();
  const highlightParam = searchParams.get('highlight');

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Lock scroll when modals open
  useEffect(() => {
    const scroller = document.getElementById('main-scroll');
    if (!scroller) return;
    scroller.style.overflow = (showAdjustModal || showMediaLibrary) ? 'hidden' : '';
    return () => { scroller.style.overflow = ''; };
  }, [showAdjustModal, showMediaLibrary]);

  useEffect(() => {
    fetchData();

    // Global Sync Listener
    const handleSync = () => fetchData(true);
    window.addEventListener('global-sync', handleSync);
    return () => window.removeEventListener('global-sync', handleSync);
  }, []);

  // Handle URL Highlights
  useEffect(() => {
    if (!loading && products.length > 0 && highlightParam) {
      const targetId = highlightParam;
      
      // Small delay to ensure render is complete
      const timer = setTimeout(() => {
        const element = document.getElementById(`product-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedId(targetId);
          
          // Clear highlight after 3 seconds
          setTimeout(() => setHighlightedId(null), 3000);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [loading, products, highlightParam]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      // Fetch Products
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('name');
      
      if (prodErr) throw prodErr;

      // Fetch recent logs
      const { data: logData, error: logErr } = await supabase
        .from('inventory_logs')
        .select('*, products(name)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (logErr) throw logErr;

      if (prodData) setProducts(prodData);
      if (logData) setLogs(logData);
    } catch (err: any) {
      console.error("Inventory Sync Error:", err);
      showToast("Inventory synchronization failed.", "error");
    } finally {
      setLoading(false);
      setHasSystemBooted(true);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockProducts = products.filter(p => p.stock <= (p.min_stock || 10));
  const totalSkuCount = products.length;
  const totalValuation = products.reduce((acc, p) => acc + (Number(p.stock) * Number(p.cost_price || 0)), 0);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || adjustQty === 0) return;
    
    setIsSaving(true);
    try {
      const newStock = Math.max(0, selectedProduct.stock + adjustQty);
      
      // 1. Update Product Stock
      const { error: prodErr } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', selectedProduct.id);
      
      if (prodErr) throw prodErr;

      // 2. Insert Log
      const { error: logErr } = await supabase
        .from('inventory_logs')
        .insert([{
          product_id: selectedProduct.id,
          quantity_change: adjustQty,
          type: adjustQty > 0 ? 'stock_in' : 'adjustment',
          notes: `Manual adjustment of ${adjustQty} units`,
          created_at: getLocalTimestamp()
        }]);

      if (logErr) {
        console.warn("Log creation failed, but stock updated:", logErr.message);
      }

      // Success
      setShowAdjustModal(false);
      setSelectedProduct(null);
      setAdjustQty(0);
      showToast(`Stock ${adjustQty > 0 ? "increased" : "adjusted"} successfully!`);
      fetchData();
    } catch (error) {
      console.error("Adjustment error:", error);
      showToast("Failed to update stock protocol.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 pb-12 pt-4 px-4">
      
      {/* Metrics Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="col-span-1 bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 shadow-sm">
          <p className="text-on-surface-variant font-label text-[10px] uppercase tracking-wider font-bold">Total SKU</p>
          <p className="text-3xl font-heading font-extrabold text-primary mt-1">{loading ? '-' : totalSkuCount}</p>
        </div>
        <div className="col-span-1 bg-primary text-on-primary p-4 rounded-xl bg-gradient-to-br from-primary to-primary-container shadow-lg shadow-primary/10">
          <p className="text-on-primary-container font-label text-[10px] uppercase tracking-wider font-bold">Valuation</p>
          <p className="text-2xl font-heading font-extrabold mt-1">₱{loading ? '-' : (totalValuation / 1000).toFixed(1)}k</p>
        </div>
        
        <div className={`col-span-2 p-4 rounded-xl border-l-4 transition-colors ${lowStockProducts.length > 0 ? 'bg-error-container border-error' : 'bg-secondary-container border-secondary'}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className={`font-label text-[11px] uppercase tracking-widest font-bold ${lowStockProducts.length > 0 ? 'text-on-error-container' : 'text-on-secondary-container'}`}>
                Stock Status
              </p>
              <p className={`text-2xl font-heading font-extrabold ${lowStockProducts.length > 0 ? 'text-on-error-container' : 'text-on-secondary-container'}`}>
                {loading ? '-' : lowStockProducts.length > 0 ? `${lowStockProducts.length} items low` : 'All healthy'}
              </p>
            </div>
            {lowStockProducts.length > 0 ? <BellRing className="text-error" size={32} /> : <TrendingUp className="text-secondary" size={32} />}
          </div>
        </div>
      </section>

      {/* Product Master Search & List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-on-surface uppercase tracking-widest text-xs flex items-center gap-2">
            <Package size={14} className="text-primary" />
            Product Master
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowMediaLibrary(true)}
              className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-on-surface-variant cursor-pointer"
            >
              <Library size={12} className="text-secondary" />
              Reclaim Photos
            </button>
            <SlidersHorizontal size={18} className="text-on-surface-variant opacity-50" />
          </div>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-[50%] text-on-surface-variant" size={18} />
          <input 
            className="w-full bg-surface-container-high border-none rounded-xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all text-on-surface outline-none shadow-sm" 
            placeholder="Search SKU or Name..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          {loading ? (
            <div className="p-12 text-center text-primary"><Loader2 className="animate-spin inline-block" size={32} /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant font-semibold">No products found.</div>
          ) : (
            filteredProducts.map((p, index) => {
              const isLow = p.stock <= (p.min_stock || 10);
              // Calculate fill based on stock relative to a healthy capacity (4x min_stock)
              const fillPercentage = Math.min(100, (p.stock / ((p.min_stock || 10) * 4)) * 100);
              const isHighlighted = highlightedId === p.id;

              return (
                <div 
                  key={p.id}
                  id={`product-${p.id}`}
                  className={`p-4 rounded-2xl flex items-center justify-between group relative overflow-hidden transition-all border-2 duration-500 ${
                    isHighlighted 
                      ? 'border-primary shadow-2xl scale-[1.01] z-10' 
                      : isLow 
                        ? 'border-error/20 bg-error/5' 
                        : 'border-outline-variant/10 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  {/* Dynamic Stock Level Filling Layer */}
                  <div 
                    className={`absolute inset-0 pointer-events-none transition-all duration-1000 ease-ios opacity-[0.08] ${
                      isLow ? 'bg-error animate-pulse' : 'bg-primary'
                    }`}
                    style={{ 
                      width: `${fillPercentage}%`,
                    }}
                  />
                  
                  {/* Edge Indicator */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${isLow ? 'bg-error' : 'bg-primary opacity-0 group-hover:opacity-100'}`} />

                  <div className="flex gap-4 items-center relative z-10">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-surface-container-highest shadow-inner group-hover:scale-105 transition-transform relative">
                      {p.image_url ? (
                        <Image 
                          src={p.image_url} 
                          alt={p.name} 
                          width={48} 
                          height={48} 
                          className="w-full h-full object-cover"
                          priority={index < 8}
                          unoptimized={true} // Fallback to prevent broken remote images
                        />
                      ) : (
                        <Package size={24} className="text-primary/40" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-mono text-on-surface-variant font-bold opacity-50 uppercase">#{p.id.split('-')[0]}</p>
                        {isLow && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-error text-white rounded text-[8px] font-black uppercase tracking-tighter animate-in zoom-in">
                            <AlertCircle size={8} />
                            Low
                          </div>
                        )}
                      </div>
                      <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{p.name}</p>
                      <p className="text-xs font-semibold text-secondary/70">₱{Number(p.cost_price || 0).toFixed(2)} unit cost</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 relative z-10">
                    <div className="text-right shrink-0">
                      <p className={`text-[9px] font-black uppercase mb-1 tracking-widest ${isLow ? 'text-error animate-pulse' : 'text-on-surface-variant'}`}>
                        {isLow ? 'Warning: Low' : 'Inventory'}
                      </p>
                      <div className="flex items-center gap-2">
                         <span className={`px-2.5 py-1 rounded-lg font-black text-xs transition-all ${
                           isLow ? 'bg-error text-white shadow-lg shadow-error/20' : 'bg-surface-container-highest text-on-surface'
                         }`}>
                           {p.stock} 
                         </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setSelectedProduct(p); setAdjustQty(0); setShowAdjustModal(true); }}
                      className={`p-3 rounded-xl transition-all active:scale-90 cursor-pointer shadow-sm ${
                        isLow ? 'bg-error text-white hover:bg-error-high' : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                      }`}
                      title="Update stock level"
                    >
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Inventory History Timeline */}
      <section className="space-y-4">
        <h3 className="font-heading font-bold text-on-surface uppercase tracking-widest text-xs flex items-center gap-2">
          <History size={14} className="text-secondary" />
          Recent Ledger Entries
        </h3>
        <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10">
          <div className="space-y-6">
            {logs.length === 0 ? (
              <p className="text-center text-on-surface-variant p-4 text-sm font-medium">No activity recorded yet.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant/20 z-10">
                    <ArrowUpRight className={`text-xs ${log.quantity_change > 0 ? 'text-secondary' : 'text-error'}`} size={16} />
                  </div>
                  <div className="flex-1 pb-6 border-l-2 border-outline-variant/20 ml-[-20px] pl-[28px] mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">{new Date(log.created_at).toLocaleString()}</p>
                      <span className={`font-bold text-sm ${log.quantity_change > 0 ? 'text-secondary' : 'text-error'}`}>
                        {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change} UNITS
                      </span>
                    </div>
                    <p className="text-sm font-bold text-on-surface">{log.products?.name || 'Unknown Product'}</p>
                    <p className="text-[11px] text-on-surface-variant italic">{log.type.replace('_', ' ').toUpperCase()} • {log.notes || 'No description'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Adjustment Modal — portal */}
      {showAdjustModal && isMounted && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdjustModal(false)} />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl p-8 shadow-2xl border border-outline-variant/10 flex flex-col max-h-[90dvh] overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="font-heading font-bold text-xl text-primary">Adjust Stock</h3>
              <button onClick={() => setShowAdjustModal(false)} className="p-2 rounded-full hover:bg-surface-container transition-colors"><X size={20} /></button>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="mb-8 p-4 bg-surface-container-low rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">P</div>
                <div>
                  <p className="font-bold text-sm">{selectedProduct?.name}</p>
                  <p className="text-xs text-on-surface-variant">Current Stock: <span className="font-bold">{selectedProduct?.stock}</span></p>
                </div>
              </div>

              <form onSubmit={handleAdjustStock} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Adjustment Amount</label>
                  <div className="flex items-center gap-4">
                    <input 
                      autoFocus
                      required
                      type="number"
                      className="w-full bg-surface-container-high border-none rounded-xl py-4 px-6 text-center text-2xl font-extrabold focus:ring-2 focus:ring-primary outline-none transition-all"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <p className="text-[10px] text-center text-on-surface-variant">Use positive numbers for restock, negative for removals.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2 pb-4">
                  <button type="button" onClick={() => setShowAdjustModal(false)} className="py-4 bg-surface-container-low text-on-surface-variant font-bold rounded-xl active:scale-95 transition-all">Cancel</button>
                  <button 
                    disabled={isSaving || adjustQty === 0}
                    className="py-4 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                    type="submit"
                  >
                    {isSaving ? 'Saving...' : 'Apply Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Settings/Toggle Footer */}
      <section className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/15 mt-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center">
            <Zap size={20} className="text-secondary" />
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">Smart Alerts</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter font-bold">Active at custom item thresholds</p>
          </div>
        </div>
        <div className="w-12 h-6 bg-secondary rounded-full relative">
          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
        </div>
      </section>

    {showMediaLibrary && isMounted && createPortal(
      <MediaGallery 
        onClose={() => setShowMediaLibrary(false)}
      />,
      document.body
    )}

    </div>
  );
}
