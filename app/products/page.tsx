"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
  Tag
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      
      alert(`Failed to upload image: ${errorMsg}\n\nNote: The preview you see is temporary until fixed.`);
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
        image_url: formData.image_url || null
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
      
      closeModal();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product.");
    }
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts(products.filter(p => p.id !== id));
    } else {
      alert("Error deleting product.");
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
      <div className="bg-surface-container-low rounded-2xl overflow-hidden overflow-x-auto shadow-sm border border-outline-variant/10">
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
                        <div>
                          <div className="font-bold text-on-surface group-hover:text-primary transition-colors">{product.name}</div>
                          <div className="text-xs text-on-surface-variant">{product.categories?.name || 'Uncategorized'} • ID: {product.id.split('-')[0].toUpperCase()}</div>
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

      {/* Mobile FAB */}
      <button 
        onClick={() => setShowAddModal(true)}
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-primary to-primary-container text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-transform z-40 touch-manipulation cursor-pointer"
      >
        <Plus size={28} />
      </button>

      {/* Add Product Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-2 overflow-y-auto py-10">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-surface/60 backdrop-blur-md"
            onClick={() => setShowAddModal(false)}
          />
          {/* Modal Content */}
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-[0_24px_48px_rgba(0,0,0,0.15)] border border-outline-variant/5">
            <div className="px-3 pt-1.5 pb-0.5 bg-white flex flex-col items-center gap-0.5 sticky top-0 z-10 border-b border-outline-variant/5">
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
            
            <form className="px-2.5 pb-3 space-y-1 mt-2" onSubmit={handleSaveProduct}>
              {/* Image Card (Ultra Tighter) */}
              <div className="p-1 rounded-xl bg-secondary/5 border border-secondary/10">
                <div className="relative group">
                  <div className={`w-full h-16 rounded-lg border-1 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-white/50 ${formData.image_url ? 'border-primary/20' : 'border-outline-variant/30'}`}>
                    {formData.image_url ? (
                      <>
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, image_url: ''})}
                          className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md"
                        >
                          <XCircle size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary/5 mb-0.5">
                          {isUploading ? <Loader2 size={12} className="animate-spin text-primary" /> : <Upload size={12} className="text-primary" />}
                        </div>
                        <p className="text-[8px] font-bold text-on-surface-variant leading-none uppercase tracking-tighter">Add Visual</p>
                        <input 
                          type="file" accept="image/*" onChange={handleImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading}
                        />
                      </>
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

                {/* Pack Calculator Segment */}
                {showPackCalc && (
                  <div className="p-3 rounded-2xl bg-primary/5 border border-dashed border-primary/30 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex items-center gap-2 mb-2">
                       <Calculator size={12} className="text-primary" />
                       <span className="text-[9px] font-black uppercase tracking-tight text-primary">Yield Calculator (Pack to Unit)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[7px] font-bold uppercase text-primary/60 tracking-widest">Pack Cost (₱)</label>
                        <input 
                          type="number"
                          placeholder="Price per pack"
                          value={packData.cost}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPackData(prev => ({ ...prev, cost: val }));
                            if (val && packData.qty) {
                              const unitCost = parseFloat(val) / parseFloat(packData.qty);
                              setFormData(f => ({ ...f, cost_price: unitCost.toFixed(2) }));
                            }
                          }}
                          className="w-full bg-white/50 border-b border-primary/20 text-[11px] font-bold px-1 py-1 focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] font-bold uppercase text-primary/60 tracking-widest">Qty in Pack</label>
                        <input 
                          type="number"
                          placeholder="Pila sulod"
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
                          className="w-full bg-white/50 border-b border-primary/20 text-[11px] font-bold px-1 py-1 focus:outline-none focus:border-primary"
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
                        className="w-full bg-white/40 border-b border-secondary/10 text-[10px] font-bold px-1 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-[7px] font-bold text-secondary/60 uppercase">Price</label>
                      <input 
                        type="number" step="0.01" placeholder="5.00"
                        value={formData.bundle_price}
                        onChange={(e) => setFormData({...formData, bundle_price: e.target.value})}
                        className="w-full bg-white/40 border-b border-secondary/10 text-[10px] font-bold px-1 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-1.5">
                <button 
                  className="w-full py-2.5 rounded-xl bg-primary text-white font-black text-[10px] shadow-sm active:scale-95 transition-all cursor-pointer uppercase tracking-[0.2em]" 
                  type="submit"
                >
                  {editingProduct ? "Done Writing" : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
