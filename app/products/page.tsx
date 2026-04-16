"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/contexts/SessionContext";
import { getLocalTimestamp } from "@/lib/utils/time";
import { showToast } from "@/lib/utils/toast";
import { 
  Search, 
  Plus, 
  Package,
  Pencil, 
  Trash2, 
  X,
  Loader2,
  Image as ImageIcon,
  Upload,
  XCircle,
  Store,
  Calculator,
  Tag,
  CheckCircle2,
  AlertCircle,
  Library
} from "lucide-react";
import { MediaGallery } from "@/components/storage/MediaGallery";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
  cost_price: number;
  selling_price: number;
  bundle_qty?: number | null;
  bundle_price?: number | null;
  category_id: string;
  image_url?: string;
  created_at: string;
  categories?: { name: string };
}

export default function ProductsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const { hasSystemBooted, setHasSystemBooted } = useSession();
  const [loading, setLoading] = useState(!hasSystemBooted);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    stock: '',
    min_stock: '10',
    cost_price: '',
    selling_price: '',
    bundle_qty: '',
    bundle_price: '',
    image_url: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showPackCalc, setShowPackCalc] = useState(false);
  const [packData, setPackData] = useState({ cost: '', qty: '' });
  const [calcMode, setCalcMode] = useState<'pack' | 'market'>('pack');
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);
  
  useEffect(() => {
    fetchData();

    // Global Sync Listener
    const handleSync = () => fetchData(true);
    window.addEventListener('global-sync', handleSync);
    return () => window.removeEventListener('global-sync', handleSync);
  }, []);



  // Lock the actual scroll container when any modal is open
  useEffect(() => {
    const scroller = document.getElementById('main-scroll');
    if (!scroller) return;
    if (showAddModal || showMediaGallery) {
      scroller.style.overflow = 'hidden';
    } else {
      scroller.style.overflow = '';
    }
    return () => { scroller.style.overflow = ''; };
  }, [showAddModal, showMediaGallery]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Fetch Products with joined Category Name
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('created_at', { ascending: false });

      if (prodErr) throw prodErr;

      // Fetch Categories for the dropdown
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('id, name');

      if (catErr) throw catErr;

      if (prodData) setProducts(prodData);
      if (catData) setCategories(catData);
    } catch (err: any) {
      console.error("Products Sync Error:", err);
    } finally {
      setLoading(false);
      setHasSystemBooted(true);
    }
  };

  const filteredProducts = products.filter((p: Product) => {
    const s = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(s) || 
           (p.categories?.name && p.categories.name.toLowerCase().includes(s));
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      category_id: product.category_id || '',
      stock: String(product.stock || 0),
      min_stock: String(product.min_stock || 10),
      cost_price: String(product.cost_price || 0),
      selling_price: String(product.selling_price || 0),
      bundle_qty: product.bundle_qty ? String(product.bundle_qty) : '',
      bundle_price: product.bundle_price ? String(product.bundle_price) : '',
      image_url: product.image_url || ''
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingProduct(null);
    setShowPackCalc(false);
    setPackData({ cost: '', qty: '' });
    setFormData({ name: '', category_id: '', stock: '', min_stock: '10', cost_price: '', selling_price: '', bundle_qty: '', bundle_price: '', image_url: '' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Show local preview instantly
    const localUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, image_url: localUrl }));

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      // 2. Update with the real persistent URL once upload succeeds
      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err: any) {
      console.error("Upload Error:", err);
      let errorMsg = err.message || "Unknown error";
      if (err.statusCode === "404" || err.error === "Not Found") {
        errorMsg = "The 'products' bucket does not exist. Please run the SQL setup script.";
      }
      if (err.statusCode === "403") {
        errorMsg = "Permission denied. Check your Supabase RLS policies for storage.";
      }
      
      showToast(`Failed to upload image: ${errorMsg}`, "error");
    } finally {
      setIsUploading(false);
    }
  };
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.selling_price || !formData.cost_price) return;

    try {
      const payload = {
        name: formData.name,
        category_id: formData.category_id || null,
        stock: parseInt(formData.stock) || 0,
        min_stock: parseInt(formData.min_stock) || 10,
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        bundle_qty: formData.bundle_qty ? parseInt(formData.bundle_qty) : null,
        bundle_price: formData.bundle_price ? parseFloat(formData.bundle_price) : null,
        image_url: formData.image_url || null,
        created_at: getLocalTimestamp()
      };

      if (editingProduct) {
        const { data, error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id)
          .select('*, categories(name)');

        if (error) throw error;
        if (data) {
          setProducts(products.map(p => p.id === editingProduct.id ? data[0] : p));
        }
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([payload])
          .select('*, categories(name)');

        if (error) throw error;
        if (data) {
          setProducts([data[0], ...products]);
        }
      }
      
      showToast(editingProduct ? "Product updated successfully!" : "Product added to inventory!");
      closeModal();
    } catch (error) {
      console.error("Error saving product:", error);
      showToast("Failed to save product. Check constraints.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts(products.filter(p => p.id !== id));
      showToast("Product removed from index.");
    } else {
      showToast("Deletion failed: Reference integrity check.", "error");
    }
  };

  // Compute Metrics
  const totalSKU = products.length;
  const lowStockCount = products.filter((p: any) => p.stock <= p.min_stock).length;
  const inventoryValue = products.reduce((acc: number, p: any) => acc + (Number(p.cost_price) * Number(p.stock)), 0);
  
  let avgRoi = 0;
  if (totalSKU > 0) {
    const validRois = products.map((p: any) => {
      const cost = Number(p.cost_price);
      if (cost <= 0) return 0;
      return ((Number(p.selling_price) - cost) / cost) * 100;
    });
    avgRoi = validRois.reduce((acc: number, roi: number) => acc + roi, 0) / validRois.length;
  }

  return (
    <div className="max-w-7xl mx-auto w-full relative">
      
      {/* Dashboard Header / Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-primary font-heading">Products</h2>
          <p className="text-on-surface-variant text-sm">Inventory & performance metrics</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-[50%] text-on-surface-variant" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-high border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all outline-none text-on-surface" 
              placeholder="Search SKU, name, or category..." 
              type="text" 
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-br from-primary to-primary-container text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/10 active:scale-95 transition-transform cursor-pointer"
          >
            <Plus size={16} />
            New Product
          </button>
        </div>
      </div>

      {/* Metric Bento Grid (Subtle) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1 border border-outline-variant/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total SKU</span>
          <span className="text-xl font-bold text-primary">{loading ? '-' : totalSKU}</span>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1 border border-outline-variant/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Low Stock</span>
          <span className="text-xl font-bold text-tertiary">{loading ? '-' : `${lowStockCount} Items`}</span>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1 border border-outline-variant/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Avg. ROI</span>
          <span className="text-xl font-bold text-secondary">{loading ? '-' : `${avgRoi.toFixed(1)}%`}</span>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1 border border-outline-variant/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Inventory Value</span>
          <span className="text-xl font-bold text-primary">{loading ? '-' : `₱${inventoryValue.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`}</span>
        </div>
      </div>

      {/* Product Table Canvas */}
      <div className="bg-surface-container-low rounded-2xl overflow-hidden overflow-x-auto custom-scrollbar shadow-sm border border-outline-variant/10">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-surface-container-highest border-b border-outline-variant/15">
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant font-label">Product Info</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant font-label">Stock</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant text-right font-label">Unit Cost</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant text-right font-label">Selling</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant text-right font-label">Profit</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant text-right font-label">ROI %</th>
              <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant text-center font-label">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10 bg-surface-container-lowest">
            
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-primary">
                  <Loader2 className="animate-spin inline-block" size={32} />
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant">
                  <Package size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold">No products found.</p>
                  <p className="text-sm mt-1">Try adjusting your search query.</p>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product, idx) => {
                const isLowStock = product.stock <= product.min_stock;
                const cost = Number(product.cost_price);
                const sell = Number(product.selling_price);
                const profit = sell - cost;
                const roi = cost > 0 ? ((profit / cost) * 100) : 0;
                
                return (
                  <tr key={product.id} className={`hover:bg-surface-container transition-colors group ${idx % 2 === 0 ? '' : 'bg-surface'}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-surface-container-highest shrink-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={20} className="text-primary/40" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="text-[15px] font-bold text-on-surface leading-tight font-heading">{product.name}</div>
                          <div className="text-xs text-on-surface-variant">{product.categories?.name || 'Gcash services'} • ID: {product.id.split('-')[0].toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isLowStock ? 'text-tertiary font-bold' : 'text-on-surface'}`}>{product.stock}</span>
                        {isLowStock ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-bold uppercase whitespace-nowrap transition-all">Low Stock</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container font-bold uppercase whitespace-nowrap transition-all">In Stock</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right text-sm text-on-surface-variant font-mono">₱{cost.toFixed(2)}</td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-on-surface font-mono">₱{sell.toFixed(2)}</span>
                        {product.bundle_qty && product.bundle_price && (
                          <div className="flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-secondary/5 rounded border border-secondary/10 whitespace-nowrap">
                            <Tag size={10} className="text-secondary" />
                            <span className="text-[9px] font-bold text-secondary uppercase tracking-tighter">
                              ₱{Number(product.bundle_price).toFixed(2)} / {product.bundle_qty}pcs
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className={`inline-block px-2.5 py-1 rounded-lg font-black font-mono text-sm shadow-sm border whitespace-nowrap ${
                        profit >= 0 
                        ? 'bg-secondary/10 text-secondary border-secondary/20' 
                        : 'bg-error/10 text-error border-error/20'
                      }`}>
                        {profit >= 0 ? '+' : ''}₱{profit.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="bg-secondary/10 text-secondary text-xs font-bold px-2.5 py-1 rounded-full">{roi.toFixed(0)}%</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2 transition-opacity">
                        <button onClick={() => handleEdit(product)} className="p-2 hover:bg-surface-container-high rounded-lg text-primary cursor-pointer"><Pencil size={18} /></button>
                        <button onClick={() => handleDelete(product.id)} className="p-2 hover:bg-error-container/20 rounded-lg text-error cursor-pointer"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}

          </tbody>
        </table>
      </div>

      {/* Simple Pagination Footer */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-on-surface-variant">Showing {products.length} products</p>
      </div>

      {/* Add Product Modal — rendered via Portal to escape transform stacking context */}
      {showAddModal && isMounted && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-surface/60 backdrop-blur-md"
            onClick={() => setShowAddModal(false)}
          />
          {/* Modal Content */}
          <div className="relative w-full max-w-sm bg-surface-container-lowest rounded-[2rem] shadow-[0_24px_48px_rgba(0,0,0,0.15)] border border-outline-variant/5 max-h-[90dvh] flex flex-col overflow-hidden">
            <div className="px-3 pt-5 pb-3 bg-surface-container-lowest shrink-0 flex flex-col items-center gap-0.5 border-b border-outline-variant/5">
              <button 
                onClick={closeModal} 
                className="absolute top-1 right-2 p-1.5 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-high"
              >
                <X size={14} strokeWidth={3} />
              </button>
              <h3 className="text-[10px] font-black text-on-surface tracking-widest uppercase opacity-40">
                {editingProduct ? "Revise" : "New Entry"}
              </h3>
            </div>
            
            <form className="px-2.5 pb-3 space-y-1 mt-2 flex-1 min-h-0 overflow-y-auto" onSubmit={handleSaveProduct}>
              {/* Image Card (Ultra Tighter) */}
              <div className="p-1 rounded-xl bg-secondary/5 border border-secondary/10">
                <div className="relative group">
                  <div className={`w-full h-12 rounded-lg border-1 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-surface-container-lowest/50 ${formData.image_url ? 'border-primary/20' : 'border-outline-variant/30'}`}>
                    {formData.image_url ? (
                      <>
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute top-1 right-1 flex gap-1">
                          <button 
                            type="button"
                            onClick={() => setShowMediaGallery(true)}
                            className="p-1 bg-primary/80 text-white rounded-full hover:bg-primary backdrop-blur-md"
                            title="Change from Library"
                          >
                            <Library size={12} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setFormData({...formData, image_url: ''})}
                            className="p-1 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md"
                          >
                            <XCircle size={12} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex w-full h-full">
                        <div className="flex-1 relative flex flex-col items-center justify-center group/upload hover:bg-primary/5 transition-colors">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary/5 mb-0.5 group-hover/upload:scale-110 transition-transform">
                            {isUploading ? <Loader2 size={12} className="animate-spin text-primary" /> : <Upload size={12} className="text-primary" />}
                          </div>
                          <p className="text-[8px] font-bold text-on-surface-variant leading-none uppercase tracking-tighter">Upload</p>
                          <input 
                            type="file" accept="image/*" onChange={handleImageUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading}
                          />
                        </div>
                        <div className="w-[1px] h-8 bg-outline-variant/20 self-center" />
                        <button 
                          type="button"
                          onClick={() => setShowMediaGallery(true)}
                          className="flex-1 flex flex-col items-center justify-center hover:bg-secondary/5 transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-secondary/5 mb-0.5">
                            <Library size={12} className="text-secondary" />
                          </div>
                          <p className="text-[8px] font-bold text-on-surface-variant leading-none uppercase tracking-tighter">Library</p>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Input Cards */}
              <div className="space-y-1">
                <div className="p-1.5 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package size={14} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 leading-none block mb-0.5">Name</label>
                    <input 
                      required value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-transparent text-[11px] font-bold leading-tight outline-none" 
                      placeholder="e.g. Mocha Frappe" 
                    />
                  </div>
                </div>

                <div className="p-1.5 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                    <Store size={14} className="text-secondary" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 leading-none block mb-0.5">Category</label>
                    <select 
                      value={formData.category_id}
                      onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                      className="w-full bg-transparent text-[11px] font-bold outline-none cursor-pointer"
                    >
                      <option value="">-- No Category --</option>
                      {categories.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <div className="p-1.5 rounded-xl bg-surface-container-low border border-outline-variant/10">
                    <div className="flex justify-between items-center mb-0.5">
                      <label className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 leading-none">Stock</label>
                      <button 
                        type="button"
                        onClick={() => setShowPackCalc(!showPackCalc)}
                        className={`text-[7px] font-black uppercase tracking-tighter transition-colors ${showPackCalc ? 'text-primary' : 'text-on-surface-variant opacity-30 hover:opacity-100'}`}
                      >
                        {showPackCalc ? 'Close' : 'Calc'}
                      </button>
                    </div>
                    <input 
                      required type="number" value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      className="w-full bg-transparent text-[11px] font-black outline-none leading-none" 
                    />
                  </div>
                  <div className="p-1.5 rounded-xl bg-surface-container-low border border-outline-variant/10">
                    <label className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 leading-none block mb-0.5">Min Alert</label>
                    <input 
                      required type="number" value={formData.min_stock}
                      onChange={(e) => setFormData({...formData, min_stock: e.target.value})}
                      className="w-full bg-transparent text-[11px] font-black outline-none leading-none" 
                    />
                  </div>
                </div>

                {/* Professional Dual-Mode Yield Calculator */}
                {showPackCalc && (
                  <div className="p-3 rounded-2xl bg-secondary/5 border border-dashed border-secondary/30 animate-in fade-in slide-in-from-top-1 duration-300">
                    {/* Mode Selector */}
                    <div className="flex p-0.5 bg-surface-container-high rounded-lg mb-3">
                      <button 
                        type="button"
                        onClick={() => setCalcMode('pack')}
                        className={`flex-1 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${calcMode === 'pack' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant opacity-40'}`}
                      >
                        Fixed Pack
                      </button>
                      <button 
                        type="button"
                        onClick={() => setCalcMode('market')}
                        className={`flex-1 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${calcMode === 'market' ? 'bg-surface-container-lowest shadow-sm text-secondary' : 'text-on-surface-variant opacity-40'}`}
                      >
                        Market Bulk
                      </button>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2">
                         <Calculator size={10} className={calcMode === 'market' ? 'text-secondary' : 'text-primary'} />
                         <span className={`text-[8px] font-black uppercase tracking-tight ${calcMode === 'market' ? 'text-secondary' : 'text-primary'}`}>
                           {calcMode === 'pack' ? 'Pre-packed Box Calculation' : 'Market Weight Calculation'}
                         </span>
                       </div>
                       {parseFloat(formData.cost_price) > 0 && parseFloat(formData.selling_price) > 0 && calcMode === 'market' && (
                         <div className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${parseFloat(formData.cost_price) >= parseFloat(formData.selling_price) ? 'bg-error-container text-on-error-container' : 'bg-primary/20 text-primary'}`}>
                           {parseFloat(formData.cost_price) >= parseFloat(formData.selling_price) ? 'No Profit Warning' : 'Margin Secure'}
                         </div>
                       )}
                    </div>

                    {/* Context Guide */}
                    <p className="text-[7px] font-bold text-on-surface-variant/40 uppercase mb-2">
                      {calcMode === 'pack' 
                        ? "USE FOR: BOXES OR CRATES WITH FIXED QUANTITIES (E.G. CANNED DRINKS)" 
                        : "USE FOR: ITEMS BOUGHT BY KILO/WEIGHT ON A SCALE (E.G. ONIONS/GARLIC)"}
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className={`text-[7px] font-bold uppercase tracking-widest ${calcMode === 'market' ? 'text-secondary/60' : 'text-primary/60'}`}>
                          {calcMode === 'pack' ? 'Carton Cost (₱)' : 'Market Price (Bulk)'}
                        </label>
                        <input 
                          type="number"
                          placeholder={calcMode === 'pack' ? "Price per box" : "Price on scale"}
                          value={packData.cost}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPackData(prev => ({ ...prev, cost: val }));
                            if (val && packData.qty) {
                              const unitCost = parseFloat(val) / parseFloat(packData.qty);
                              setFormData(f => ({ ...f, cost_price: unitCost.toFixed(2) }));
                            }
                          }}
                          className={`w-full bg-surface-container-lowest/50 border-b text-[11px] font-bold px-1 py-1 focus:outline-none transition-colors ${calcMode === 'market' ? 'border-secondary/20 focus:border-secondary' : 'border-primary/20 focus:border-primary'}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={`text-[7px] font-bold uppercase tracking-widest ${calcMode === 'market' ? 'text-secondary/60' : 'text-primary/60'}`}>
                          {calcMode === 'pack' ? 'Items in Box' : 'Yield Count (pcs)'}
                        </label>
                        <input 
                          type="number"
                          placeholder={calcMode === 'pack' ? "Sulod sa carton" : "Pila kabuok?"}
                          value={packData.qty}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPackData(prev => ({ ...prev, qty: val }));
                            if (val) {
                              setFormData(f => ({ ...f, stock: val }));
                              if (packData.cost) {
                                const unitCost = parseFloat(packData.cost) / parseFloat(val);
                                setFormData(f => ({ ...f, cost_price: unitCost.toFixed(2), stock: val }));
                              }
                            }
                          }}
                          className={`w-full bg-surface-container-lowest/50 border-b text-[11px] font-bold px-1 py-1 focus:outline-none transition-colors ${calcMode === 'market' ? 'border-secondary/20 focus:border-secondary' : 'border-primary/20 focus:border-primary'}`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1">
                  <div className="p-1.5 rounded-xl bg-surface-container-low border border-outline-variant/10">
                    <label className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 leading-none">Price (1pc)</label>
                    <input 
                      required type="number" step="0.01" value={formData.selling_price}
                      onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                      className="w-full bg-transparent text-[11px] font-black outline-none" 
                      placeholder="2.00"
                    />
                  </div>
                  <div className="p-1.5 rounded-xl bg-surface-container-low border border-outline-variant/10">
                    <label className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 leading-none">Unit Cost</label>
                    <input 
                      required type="number" step="0.01" value={formData.cost_price}
                      onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                      className="w-full bg-transparent text-[11px] font-black outline-none" 
                      placeholder="1.50"
                    />
                  </div>
                </div>

                {/* Bundle Optimization Area (Condensed) */}
                <div className="p-2 rounded-xl bg-secondary/5 border border-secondary/10 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Tag size={10} className="text-secondary" />
                    <span className="text-[8px] font-black uppercase tracking-tight text-secondary">Bundle</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1">
                      <label className="text-[7px] font-bold text-secondary/60 uppercase">Qty</label>
                      <input 
                        type="number" placeholder="4"
                        value={formData.bundle_qty}
                        onChange={(e) => setFormData({...formData, bundle_qty: e.target.value})}
                        className="w-full bg-surface-container-lowest/40 border-b border-secondary/10 text-[10px] font-bold px-1 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-[7px] font-bold text-secondary/60 uppercase">Price</label>
                      <input 
                        type="number" step="0.01" placeholder="5.00"
                        value={formData.bundle_price}
                        onChange={(e) => setFormData({...formData, bundle_price: e.target.value})}
                        className="w-full bg-surface-container-lowest/40 border-b border-secondary/10 text-[10px] font-bold px-1 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button - Added huge bottom padding for mobile scroll clearance */}
              <div className="pt-2 pb-4">
                <button 
                  className="w-full py-3 rounded-xl bg-primary text-white font-black text-[11px] shadow-lg shadow-primary/20 active:scale-95 transition-all cursor-pointer uppercase tracking-[0.2em]" 
                  type="submit"
                >
                  {editingProduct ? "Done Writing" : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
        )}


      {showMediaGallery && isMounted && createPortal(
        <MediaGallery 
          currentUrl={formData.image_url}
          onSelect={(url) => {
            setFormData(prev => ({ ...prev, image_url: url }));
            setShowMediaGallery(false);
          }}
          onClose={() => setShowMediaGallery(false)}
        />,
        document.body
      )}
    </div>
  );
}
