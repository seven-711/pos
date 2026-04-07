"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
  X,
  ArrowUpRight
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  cost_price: number;
  selling_price: number;
  category_id: string;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
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
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const lowStockProducts = products.filter(p => p.stock <= 10);
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
          notes: `Manual adjustment of ${adjustQty} units`
        }]);

      if (logErr) {
        console.warn("Log creation failed, but stock updated:", logErr.message);
      }

      // Success
      setShowAdjustModal(false);
      setSelectedProduct(null);
      setAdjustQty(0);
      fetchData();
    } catch (error) {
      console.error("Adjustment error:", error);
      alert("Failed to update stock.");
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
          <SlidersHorizontal size={18} className="text-on-surface-variant opacity-50" />
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
            filteredProducts.map(p => (
              <div 
                key={p.id}
                className={`p-4 rounded-xl flex items-center justify-between group bg-surface-container-low hover:bg-surface-container transition-all border border-outline-variant/10 ${p.stock <= 10 ? 'border-l-4 border-l-error' : ''}`}
              >
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center font-bold text-primary">
                    <Package size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-on-surface-variant leading-none mb-1 font-bold">SKU: {p.sku || p.id.split('-')[0].toUpperCase()}</p>
                    <p className="font-bold text-sm text-on-surface">{p.name}</p>
                    <p className="text-xs font-semibold text-secondary">₱{Number(p.cost_price || 0).toFixed(2)} cost</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right shrink-0">
                    <p className={`text-[10px] font-bold uppercase mb-1 ${p.stock <= 10 ? 'text-error' : 'text-on-surface-variant'}`}>{p.stock <= 10 ? 'Low Stock' : 'In Stock'}</p>
                    <span className={`px-3 py-1 rounded font-bold text-sm inline-block ${p.stock <= 10 ? 'bg-error-container text-on-error-container' : 'bg-surface-container-highest text-on-surface'}`}>{p.stock}</span>
                  </div>
                  <button 
                    onClick={() => { setSelectedProduct(p); setAdjustQty(0); setShowAdjustModal(true); }}
                    className="p-3 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all active:scale-90 cursor-pointer"
                    title="Adjust stock"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            ))
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

      {/* Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdjustModal(false)} />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl p-8 shadow-2xl border border-outline-variant/10 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-heading font-bold text-xl text-primary">Adjust Stock</h3>
              <button onClick={() => setShowAdjustModal(false)} className="p-2 rounded-full hover:bg-surface-container transition-colors"><X size={20} /></button>
            </div>
            
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
              
              <div className="grid grid-cols-2 gap-4 pt-2">
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
      )}

      {/* Settings/Toggle Footer */}
      <section className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/15 mt-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center">
            <Zap size={20} className="text-secondary" />
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">Smart Alerts</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter font-bold">Active at 10 unit threshold</p>
          </div>
        </div>
        <div className="w-12 h-6 bg-secondary rounded-full relative">
          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
        </div>
      </section>

    </div>
  );
}
