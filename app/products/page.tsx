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
  Loader2
} from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  stock: number;
  min_stock: number;
  cost_price: number;
  selling_price: number;
  category_id: string;
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
    selling_price: ''
  });

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
           (p.sku && p.sku.toLowerCase().includes(s)) || 
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
      selling_price: String(product.selling_price || 0)
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingProduct(null);
    setFormData({ name: '', category_id: '', stock: '', min_stock: '10', cost_price: '', selling_price: '' });
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
                        <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                          <Package size={20} className="text-primary" />
                        </div>
                        <div>
                          <div className="font-bold text-on-surface group-hover:text-primary transition-colors">{product.name}</div>
                          <div className="text-xs text-on-surface-variant">{product.categories?.name || 'Uncategorized'} • ID: {product.id.split('-')[0]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isLowStock ? 'text-tertiary font-bold' : 'text-on-surface'}`}>{product.stock}</span>
                        {isLowStock ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-bold uppercase">Low</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container font-bold uppercase">In Stock</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right text-sm text-on-surface-variant font-mono">₱{cost.toFixed(2)}</td>
                    <td className="px-6 py-5 text-right text-sm font-bold text-on-surface font-mono">₱{sell.toFixed(2)}</td>
                    <td className="px-6 py-5 text-right text-sm font-bold text-secondary font-mono">+₱{profit.toFixed(2)}</td>
                    <td className="px-6 py-5 text-right">
                      <span className="bg-secondary/10 text-secondary text-xs font-bold px-2.5 py-1 rounded-full">{roi.toFixed(0)}%</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-surface/60 backdrop-blur-md"
            onClick={() => setShowAddModal(false)}
          />
          {/* Modal Content */}
          <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-[0_12px_32px_rgba(0,40,162,0.1)] overflow-hidden border border-outline-variant/10">
            <div className="px-6 py-4 bg-surface-container flex justify-between items-center border-b border-outline-variant/10">
              <h3 className="font-heading font-bold text-primary">{editingProduct ? "Edit Product" : "Add New Product"}</h3>
              <button 
                onClick={closeModal} 
                className="p-2 rounded-full hover:bg-surface-container-highest cursor-pointer text-on-surface-variant transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form className="p-6 space-y-4" onSubmit={handleSaveProduct}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-label">Product Name</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-lg text-sm px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none text-on-surface" 
                    type="text" 
                    placeholder="e.g. Mocha Frappe" 
                  />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-label">Category</label>
                  <select 
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-lg text-sm px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none text-on-surface"
                  >
                    <option value="">-- No Category --</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-label">Initial Stock</label>
                  <input 
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-lg text-sm px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none text-on-surface" 
                    type="number" 
                    placeholder="0" 
                  />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-label">Min. Stock Alert</label>
                  <input 
                    required
                    value={formData.min_stock}
                    onChange={(e) => setFormData({...formData, min_stock: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-lg text-sm px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none text-on-surface" 
                    type="number" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-label">Cost Price (₱)</label>
                  <input 
                    required
                    value={formData.cost_price}
                    onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-lg text-sm px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none text-on-surface" 
                    step="0.01" type="number" placeholder="0.00" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-label">Selling Price (₱)</label>
                  <input 
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-lg text-sm px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none text-on-surface" 
                    step="0.01" type="number" placeholder="0.00" 
                  />
                </div>
              </div>
              <div className="pt-6 flex gap-3">
                <button 
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface-variant font-bold text-sm cursor-pointer transition-colors" 
                  type="button"
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container hover:to-primary text-white font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer" 
                  type="submit"
                >
                  {editingProduct ? "Update Product" : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
