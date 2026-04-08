"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Coffee,
  Package,
  Wallet,
  ArrowRight,
  Banknote,
  X,
  Minus,
  Plus,
  CheckCircle2,
  Loader2,
  ShoppingCart,
  Trash2,
  AlertCircle
} from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  stock: number;
  cost_price: number;
  selling_price: number;
  category_id: string;
  image_url?: string;
  categories?: { name: string };
}

interface CartItem extends Product {
  quantity: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [qtyTarget, setQtyTarget] = useState<Product | null>(null);
  const [qtyValue, setQtyValue] = useState(1);

  // Checkout State
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: prodData, error: prodErr } = await supabase.from('products').select('*, categories(name)').order('name');
      const { data: catData, error: catErr } = await supabase.from('categories').select('*').order('name');
      
      if (prodErr) throw prodErr;
      if (catErr) throw catErr;

      if (prodData) setProducts(prodData);
      if (catData) setCategories(catData);
    } catch (err: any) {
      console.error("POS Sync Error:", err);
      // Optional: Set an error state if needed
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p: Product) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setQtyTarget(product);
    setQtyValue(1);
    setShowQtyModal(true);
  };

  const confirmAddToCart = () => {
    if (!qtyTarget) return;

    const existing = cart.find((item: CartItem) => item.id === qtyTarget.id);
    if (existing) {
      setCart(cart.map((item: CartItem) =>
        item.id === qtyTarget.id ? { ...item, quantity: item.quantity + qtyValue } : item
      ));
    } else {
      setCart([...cart, {
        ...qtyTarget,
        quantity: qtyValue
      }]);
    }

    setShowQtyModal(false);
    setQtyTarget(null);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item: CartItem) => item.id !== id));
  };

  const calculateSubtotal = () => cart.reduce((acc: number, item: CartItem) => acc + (item.selling_price * item.quantity), 0);
  const calculateProfit = () => cart.reduce((acc: number, item: CartItem) => acc + ((item.selling_price - item.cost_price) * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    try {
      const subtotal = Number(calculateSubtotal().toFixed(2)) || 0;
      const profit = Number(calculateProfit().toFixed(2)) || 0;

      // 1. Create Transaction
      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .insert([{
          total_amount: subtotal,
          total_profit: profit,
          payment_method: 'Cash'
        }])
        .select()
        .single();

      if (txErr) {
        console.error("Transaction Insert Error:", txErr);
        throw new Error(`Transaction Table Error: ${txErr.message} (${txErr.code}). Hint: ${txErr.hint || 'Check RLS policies.'}`);
      }
      
      if (!tx) throw new Error("Transaction record could not be retrieved after insert. This usually means Select permissions are missing on the 'transactions' table.");

      // 2. Create Transaction Items
      const txItems = cart.map(item => {
        const qty = Number(item.quantity) || 1;
        const sell = Number(item.selling_price) || 0;
        const cost = Number(item.cost_price) || 0;
        const profitPerUnit = sell - cost;
        
        return {
          transaction_id: tx.id,
          product_id: item.id,
          quantity: qty,
          price: sell,
          cost_price: cost,
          profit: Number((profitPerUnit * qty).toFixed(2))
        };
      });

      const { error: itemsErr } = await supabase.from('transaction_items').insert(txItems);
      if (itemsErr) {
        console.error("Items Insert Error:", itemsErr);
        throw new Error(`Items Table Error: ${itemsErr.message} (${itemsErr.code}). Hint: ${itemsErr.hint || 'Check RLS policies.'}`);
      }

      // 3. Update Stock
      for (const item of cart) {
        const { error: stockErr } = await supabase.rpc('decrement_stock', {
          row_id: item.id,
          amount: Number(item.quantity)
        });

        if (stockErr) {
          await supabase
            .from('products')
            .update({
              stock: Math.max(0, (Number(item.stock) || 0) - (Number(item.quantity) || 0))
            })
            .eq('id', item.id);
        }
      }

      setToastMsg("Sale completed successfully! Ledger updated.");
      setToastType("success");
      setShowToast(true);
      setCart([]);
      fetchData(); // Refresh stock counts
    } catch (err: any) {
      console.error("CRITICAL CHECKOUT ERROR:", err);
      let msg = "Unknown Protocol Error";
      if (err.message) msg = err.message;
      if (err.details) msg += ` - ${err.details}`;
      if (err.code) msg = `[${err.code}] ${msg}`;
      
      setToastMsg(`Checkout Failed: ${msg}`);
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full relative">
      {/* Header / Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <Search size={22} className="absolute left-4 top-1/2 -translate-y-[50%] text-on-surface-variant" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-on-surface-variant/50 text-on-surface outline-none"
            placeholder="Search products or SKU..."
            type="text"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all active:scale-95 ${!selectedCategory ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all active:scale-95 ${selectedCategory === cat.id ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Product Grid */}
        <div className="col-span-12 lg:col-span-8">
          {loading ? (
            <div className="flex justify-center items-center h-64 text-primary">
              <Loader2 size={48} className="animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="recessed-card rounded-[2.5rem] p-2 transition-all duration-200 active:scale-95 cursor-pointer group"
                >
                  <div className="frosted-inner rounded-[2rem] overflow-hidden flex flex-col h-full">
                    {/* Product Image Area */}
                    <div className="p-2">
                      <div className="w-full aspect-[4/5] rounded-[1.5rem] overflow-hidden bg-surface-container-highest relative">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/5">
                            {product.categories?.name?.toLowerCase().includes('coffee') ? 
                              <Coffee className="text-primary/20 w-12 h-12" /> : 
                              <Package className="text-primary/20 w-12 h-12" />
                            }
                          </div>
                        )}
                        {/* Stock Badge - Premium Position */}
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-2xl shadow-sm border border-white/50 min-w-[56px]">
                          <div className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/60 leading-none mb-0.5 text-center">Stock</div>
                          <div className={`text-[10px] font-black leading-none text-center ${product.stock < 10 ? 'text-error' : 'text-primary'}`}>
                            {product.stock}U
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="px-5 pb-5 pt-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="font-heading font-extrabold text-sm text-on-surface line-clamp-1 flex-1 uppercase tracking-tight">{product.name}</h3>
                        {product.stock > 0 && (
                          <CheckCircle2 size={14} className="text-secondary opacity-60" />
                        )}
                      </div>
                      <p className="text-lg font-black text-primary mb-3">
                        ₱{Number(product.selling_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>

                      {/* Bottom Stats Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-on-surface/5">
                        <div>
                          <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/30 block mb-0.5">Yield</span>
                          <p className="text-[9px] font-bold text-secondary-fixed-dim bg-secondary/5 w-fit px-1 rounded-sm">
                            +₱{(product.selling_price - product.cost_price).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/30 block mb-0.5">ROI</span>
                          <p className="text-[9px] font-bold text-primary opacity-60">
                            {product.cost_price > 0 ? (((product.selling_price - product.cost_price) / product.cost_price) * 100).toFixed(0) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <section className="bg-surface-container p-6 rounded-2xl sticky top-4 border border-outline-variant/20 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-heading font-bold text-xl flex items-center gap-2">
                <ShoppingCart size={20} className="text-primary" />
                Active Order
              </h2>
              <span className="text-xs font-label text-on-surface-variant font-bold">{cart.length} Items</span>
            </div>

            <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto no-scrollbar pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant opacity-50">
                  <ShoppingCart size={40} className="mx-auto mb-3" />
                  <p className="text-sm font-semibold">Your cart is empty.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center group">
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">{item.quantity}</div>
                      <div>
                        <p className="font-semibold text-sm line-clamp-1">{item.name}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">₱{Number(item.selling_price).toFixed(2)} / unit</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-sm">₱{(item.selling_price * item.quantity).toFixed(2)}</p>
                      <button onClick={() => removeFromCart(item.id)} className="p-1 text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 border-t border-outline-variant/20 pt-4">
              <div className="flex justify-between text-on-surface-variant text-sm font-semibold">
                <span>Subtotal</span>
                <span>₱{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-end pt-4">
                <span className="font-heading font-bold text-lg">Total Amount</span>
                <span className="font-heading font-extrabold text-3xl text-primary tracking-tight">₱{calculateSubtotal().toFixed(2)}</span>
              </div>
            </div>

            <button
              disabled={cart.length === 0 || isCheckingOut}
              onClick={handleCheckout}
              className="w-full mt-8 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
            >
              {isCheckingOut ? <Loader2 size={20} className="animate-spin" /> : "Complete Sale"}
              {!isCheckingOut && <ArrowRight size={20} />}
            </button>
          </section>

          {/* Service Placeholder (GCash) */}
          <section className="bg-secondary-container/20 p-6 rounded-2xl border border-secondary/10">
            <h2 className="font-heading font-bold text-lg text-secondary mb-4 flex items-center gap-2">
              <Banknote size={20} />
              Quick Service
            </h2>
            <div className="p-4 bg-white/50 rounded-xl border border-secondary/5 text-center">
              <p className="text-xs text-on-surface-variant mb-2">Service-based items (GCash, Printing) coming soon to sync with ledger.</p>
              <button className="text-[10px] font-bold uppercase text-secondary tracking-widest hover:underline">Manage Services</button>
            </div>
          </section>
        </div>
      </div>

      {/* Quantity Selector Modal */}
      {showQtyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-heading font-bold text-xl">{qtyTarget?.name}</h3>
                <p className="text-xs text-on-surface-variant">Set quantity to add to cart</p>
              </div>
              <button onClick={() => setShowQtyModal(false)} className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-center cursor-pointer">
                <X size={20} className="text-on-surface-variant" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-6 mb-10">
              <button
                onClick={() => setQtyValue(Math.max(1, qtyValue - 1))}
                className="w-16 h-16 rounded-2xl bg-surface-container-highest hover:bg-surface-variant flex items-center justify-center text-primary active:scale-90 transition-all font-bold text-4xl"
              >
                <Minus size={32} />
              </button>
              <div className="w-24 text-center text-5xl font-extrabold text-on-surface">
                {qtyValue}
              </div>
              <button
                onClick={() => setQtyValue(qtyValue + 1)}
                className="w-16 h-16 rounded-2xl bg-surface-container-highest hover:bg-surface-variant flex items-center justify-center text-primary active:scale-90 transition-all font-bold text-4xl"
              >
                <Plus size={32} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowQtyModal(false)} className="py-4 bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-bold rounded-xl transition-colors cursor-pointer">Cancel</button>
              <button onClick={confirmAddToCart} className="py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl active:scale-95 transition-transform shadow-lg cursor-pointer">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {showToast && (
        <div className={`fixed bottom-24 right-6 z-[600] ${toastType === 'success' ? 'bg-secondary' : 'bg-error'} text-on-secondary px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-right-5 duration-300`}>
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            {toastType === 'success' ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <AlertCircle size={20} />}
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">{toastType === 'success' ? 'Success' : 'Error'}</p>
            <p className="text-xs opacity-90">{toastMsg}</p>
          </div>
          <button onClick={() => setShowToast(false)} className="opacity-50 hover:opacity-100 transition-opacity">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
