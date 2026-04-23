"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/contexts/SessionContext";
import { getLocalTimestamp } from "@/lib/utils/time";
import { 
  Plus, 
  TrendingUp, 
  BarChart, 
  Banknote, 
  Landmark, 
  Package, 
  Pencil, 
  Trash2, 
  PieChart, 
  Zap, 
  ChevronRight,
  Loader2,
  X
} from "lucide-react";

export default function CategoriesPage() {
  const { hasSystemBooted, setHasSystemBooted, categories, setCategories, appCache, setAppCache } = useSession();
  const [loading, setLoading] = useState(!hasSystemBooted && categories.length === 0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [stats, setStats] = useState<{totalCategories: number, totalProducts: number, activeCategories: number}>(appCache.categoriesStats || {
    totalCategories: 0,
    totalProducts: 0,
    activeCategories: 0
  });

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Lock scroll when modals open
  useEffect(() => {
    const scroller = document.getElementById('main-scroll');
    if (!scroller) return;
    scroller.style.overflow = (showAddModal) ? 'hidden' : '';
    return () => { scroller.style.overflow = ''; };
  }, [showAddModal]);

  useEffect(() => {
    fetchData();

    const handleSync = () => fetchData(true);
    window.addEventListener('global-sync', handleSync);
    return () => window.removeEventListener('global-sync', handleSync);
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent && !hasSystemBooted && categories.length === 0) setLoading(true);
    
    // Fetch Categories
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('*, products(id)')
      .order('created_at', { ascending: false });
      
    if (catData) {
      setCategories(catData);
      
      // Calculate Stats
      const totalProducts = catData.reduce((acc: number, cat: any) => acc + (cat.products?.length || 0), 0);
      const newStats = {
        totalCategories: catData.length,
        totalProducts: totalProducts,
        activeCategories: catData.filter((c: any) => c.products?.length > 0).length
      };
      setStats(newStats);
      setAppCache(prev => ({ ...prev, categoriesStats: newStats }));
    }
    
    setLoading(false);
    setHasSystemBooted(true);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsSaving(true);
    const { data, error } = await supabase
      .from('categories')
      .insert([{ 
        name: newCategoryName.trim(),
        created_at: getLocalTimestamp()
      }])
      .select()
      .single();

    if (!error && data) {
      setCategories([data, ...categories]);
      setNewCategoryName("");
      setShowAddModal(false);
      setStats(prev => ({ ...prev, totalCategories: prev.totalCategories + 1 }));
    } else {
      alert("Error creating category: " + (error?.message || "Unknown error"));
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this category? This might fail if products are still linked to it.")) return;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (!error) {
      setCategories(categories.filter(c => c.id !== id));
      setStats(prev => ({ ...prev, totalCategories: prev.totalCategories - 1 }));
    } else {
      alert("Error deleting category. Make sure no products are using it first.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full relative">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <span className="text-secondary font-label text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block">Enterprise Management</span>
          <h2 className="text-4xl font-extrabold font-heading text-primary tracking-tight">Categories</h2>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-3 rounded-md font-bold flex items-center gap-2 shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={20} />
          Create New Category
        </button>
      </div>

      {/* Intelligence Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <div className="md:col-span-2 bg-surface-container-low p-6 rounded-xl flex flex-col justify-between min-h-[160px] border border-outline-variant/10">
          <div className="flex justify-between items-start">
            <span className="text-on-surface-variant font-label text-[10px] font-bold uppercase tracking-wider">Inventory Depth</span>
            <BarChart className="text-primary opacity-40" size={24} />
          </div>
          <div>
            <div className="text-4xl font-extrabold font-heading text-primary">
              {loading ? '-' : stats.totalProducts}
            </div>
            <div className="flex items-center gap-1 text-secondary text-sm font-bold mt-1">
              <Package size={16} />
              Total Products Mapped
            </div>
          </div>
        </div>
        
        <div className="bg-surface-container-low p-6 rounded-xl flex flex-col justify-between border border-outline-variant/10">
          <div className="flex justify-between items-start">
            <span className="text-on-surface-variant font-label text-[10px] font-bold uppercase tracking-wider">Total Categories</span>
            <PieChart className="text-secondary opacity-40" size={24} />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-heading text-secondary">{loading ? '-' : stats.totalCategories}</div>
            <div className="text-on-surface-variant text-xs mt-1 font-medium">Distinct Groups</div>
          </div>
        </div>
        
        <div className="bg-surface-container-low p-6 rounded-xl flex flex-col justify-between border border-outline-variant/10">
          <div className="flex justify-between items-start">
            <span className="text-on-surface-variant font-label text-[10px] font-bold uppercase tracking-wider">Active Status</span>
            <Zap className="text-tertiary opacity-40" size={24} />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-heading text-primary">{loading ? '-' : stats.activeCategories}</div>
            <div className="text-on-surface-variant text-xs mt-1 font-medium">With Products</div>
          </div>
        </div>
      </div>

      {/* Category Ledger List */}
      <div className="bg-surface-container rounded-2xl overflow-hidden overflow-x-auto custom-scrollbar shadow-sm border border-outline-variant/10">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-outline-variant/15 text-on-surface-variant font-label text-[10px] font-bold uppercase tracking-widest bg-surface-container-low">
            <div className="col-span-12 md:col-span-6">Category Identity</div>
            <div className="col-span-2 text-right hidden md:block">Item Count</div>
            <div className="col-span-2 text-right hidden md:block">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          
          <div className="divide-y divide-outline-variant/10 bg-surface-container-lowest">
            {loading ? (
               <div className="p-12 flex justify-center items-center text-primary">
                 <Loader2 className="animate-spin" size={32} />
               </div>
            ) : categories.length === 0 ? (
               <div className="p-8 text-center text-on-surface-variant py-16">
                 <Package size={48} className="mx-auto mb-4 opacity-20" />
                 <p className="font-bold">No categories mapped yet.</p>
               </div>
            ) : (
              categories.map((cat, idx) => (
                <div key={cat.id} className={`grid grid-cols-12 gap-4 px-8 py-6 items-center hover:bg-surface-container-low transition-colors group ${idx % 2 === 0 ? '' : 'bg-surface'}`}>
                  <div className="col-span-12 md:col-span-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/5 flex items-center justify-center">
                      <Package className="text-primary" size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-on-surface group-hover:text-primary transition-colors">{cat.name}</h4>
                      <p className="text-xs text-on-surface-variant font-medium text-opacity-60">ID: {cat.id.split('-')[0]}</p>
                    </div>
                  </div>
                  
                  <div className="col-span-2 text-right font-bold text-on-surface font-heading tracking-tight hidden md:block">
                    {cat.products?.length || 0} Items
                  </div>
                  
                  <div className="col-span-2 text-right hidden md:block">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${(cat.products?.length || 0) > 0 ? 'bg-secondary/10 text-secondary' : 'bg-outline-variant/20 text-on-surface-variant'}`}>
                      {(cat.products?.length || 0) > 0 ? 'Active' : 'Empty'}
                    </span>
                  </div>
                  
                  <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDelete(cat.id)} className="p-2 hover:bg-error-container/20 rounded transition-colors text-error cursor-pointer" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && isMounted && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/10 flex flex-col max-h-[90dvh] overflow-hidden">
            <div className="px-6 py-4 bg-surface-container border-b border-outline-variant/10 flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-primary">New Category</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-surface-container-highest rounded-full transition-colors cursor-pointer text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Name</label>
                  <input 
                    autoFocus
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Beverages"
                    className="w-full bg-surface-container border border-outline-variant/10 rounded-lg px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <button 
                  disabled={isSaving}
                  className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Create Category"}
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
