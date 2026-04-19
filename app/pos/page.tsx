"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/contexts/SessionContext";
import Image from "next/image";
import { showToast } from "@/lib/utils/toast";
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
  AlertCircle,
  Tag
} from "lucide-react";
import { useCart } from "@/lib/contexts/CartContext";
import { getStoreConfig, updateStoreConfig } from "@/lib/utils/configs";
import { 
  Smartphone, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Settings2, 
  History as HistoryIcon,
  Info 
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
  categories?: { name: string };
}



export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const { hasSystemBooted, setHasSystemBooted } = useSession();
  const [loading, setLoading] = useState(!hasSystemBooted);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // GCash Service State
  const [gcashBalance, setGcashBalance] = useState<number>(0);
  const [vaultInitialized, setVaultInitialized] = useState<boolean>(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceMode, setServiceMode] = useState<"CASH_IN" | "CASH_OUT" | "LOAD" | "ADJUST" | "INITIALIZE">("CASH_IN");
  const [serviceForm, setServiceForm] = useState({
    amount: "",
    fee: "",
    isFeeDigital: false,
    reason: ""
  });

  // Cart Context
  const { 
    cart, 
    addToCart: addItemsToCart, 
    removeFromCart, 
    calculateSubtotal, 
    calculateProfit,
    getItemTotal,
    getItemProfit,
    clearCart,
    recordServiceTransaction,
    isProcessing
  } = useCart();

  const [showQtyModal, setShowQtyModal] = useState(false);
  const [qtyTarget, setQtyTarget] = useState<Product | null>(null);
  const [qtyValue, setQtyValue] = useState(1);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Lock scroll when modals open
  useEffect(() => {
    const scroller = document.getElementById('main-scroll');
    if (!scroller) return;
    scroller.style.overflow = (showQtyModal || showServiceModal) ? 'hidden' : '';
    return () => { scroller.style.overflow = ''; };
  }, [showQtyModal, showServiceModal]);

  useEffect(() => {
    fetchData();

    const handleSync = () => fetchData(true);
    window.addEventListener('global-sync', handleSync);
    return () => window.removeEventListener('global-sync', handleSync);
  }, []);



  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    const bal = await getStoreConfig("digital_gcash_balance", null);
    if (bal === null) {
      setVaultInitialized(false);
    } else {
      setGcashBalance(Number(bal));
      setVaultInitialized(true);
    }
  };

  useEffect(() => {
    const handleTransaction = () => {
      fetchData(); // Refresh stock counts when a sale is completed globally
    };
    window.addEventListener('transaction-completed', handleTransaction);
    return () => window.removeEventListener('transaction-completed', handleTransaction);
  }, []);


  const handleSubmitService = async () => {
    const amount = parseFloat(serviceForm.amount) || 0;
    const fee = parseFloat(serviceForm.fee) || 0;
    
    if (amount <= 0 && serviceMode !== "ADJUST" && serviceMode !== "INITIALIZE") {
      showToast("Please enter a valid amount", "error");
      return;
    }

    let newBalance = gcashBalance;
    let paymentMethod = "GCash Service";

    if (serviceMode === "INITIALIZE") {
      newBalance = amount;
      paymentMethod = "Balance Adjustment";
    } else if (serviceMode === "CASH_IN" || serviceMode === "LOAD") {
      newBalance -= amount;
      paymentMethod = "Cash"; // Received physical cash
    } else if (serviceMode === "CASH_OUT") {
      newBalance += amount + (serviceForm.isFeeDigital ? fee : 0);
      paymentMethod = "GCash"; // Received digital funds
    } else if (serviceMode === "ADJUST") {
      newBalance = amount;
      paymentMethod = "Balance Adjustment";
    }

    const { success, message } = await recordServiceTransaction({
      type: serviceMode === "INITIALIZE" ? "STARTING BALANCE" : serviceMode.replace("_", " "),
      amount: serviceMode === "INITIALIZE" ? 0 : amount,
      fee: serviceMode === "INITIALIZE" ? 0 : fee,
      payment_method: paymentMethod,
      notes: serviceMode === "INITIALIZE" 
        ? "Initial Vault Configuration [GCash]" 
        : (serviceMode === "ADJUST" ? `${serviceForm.reason} [GCash]` : `${serviceMode} Transaction [GCash]`)
    });

    if (success) {
      await updateStoreConfig("digital_gcash_balance", newBalance);
      setGcashBalance(newBalance);
      setVaultInitialized(true);
      setShowServiceModal(false);
      showToast(message);
    } else {
      showToast(message, "error");
    }
  };


  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
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
      setHasSystemBooted(true);
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

    const existing = cart.find((item) => item.id === qtyTarget.id);
    const totalRequested = (existing?.quantity || 0) + qtyValue;

    if (totalRequested > qtyTarget.stock) {
      showToast(`Insufficient stock! Only ${qtyTarget.stock} available.`, "error");
      return;
    }

    addItemsToCart(qtyTarget, qtyValue);
    showToast(`${qtyValue}x ${qtyTarget.name} added to cart`);
    setShowQtyModal(false);
    setQtyTarget(null);
  };




  return (
    <div className="max-w-7xl mx-auto w-full relative">
      {/* Header / Search */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="relative flex-grow">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-[50%] text-on-surface-variant opacity-40" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 md:py-2.5 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-on-surface-variant/40 text-sm md:text-[11px] font-bold text-on-surface outline-none"
            placeholder="Search products or SKU..."
            type="text"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3.5 py-2.5 rounded-xl font-black text-[10px] uppercase whitespace-nowrap transition-all active:scale-95 ${!selectedCategory ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2.5 rounded-xl font-black text-[10px] uppercase whitespace-nowrap transition-all active:scale-95 ${selectedCategory === cat.id ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Product Grid - Full Width */}
        <div className="col-span-12">
          {loading ? (
            <div className="flex justify-center items-center h-64 text-primary">
              <Loader2 size={48} className="animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
              {filteredProducts.map(product => {
                const isOutOfStock = (product.stock || 0) <= 0;
                const yieldAmt = product.selling_price - product.cost_price;
                const roi = product.cost_price > 0 ? (yieldAmt / product.cost_price) * 100 : 0;
                
                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`recessed-card dark:!bg-[var(--color-surface-container-lowest)] dark:![box-shadow:inset_0_2px_8px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.1)] dark:!border-white/5 rounded-[1.5rem] sm:rounded-3xl p-1.5 sm:p-2 transition-all duration-300 ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 cursor-pointer group'}`}
                  >
                  <div className="frosted-inner dark:!bg-[#141228]/40 dark:!backdrop-blur-[16px] dark:!border-white/10 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col h-full shadow-lg">
                    {/* Product Image Area */}
                    <div className="p-1.5 sm:p-2">
                      <div className="w-full aspect-[4/5] rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-surface-container-highest to-surface-dim relative">
                        {product.image_url && product.image_url !== "null" && product.image_url.trim() !== "" ? (
                          <Image 
                            src={encodeURI(product.image_url.trim())} 
                            alt={product.name} 
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                            unoptimized={true} // Fallback for remote storage images
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
                            {product.categories?.name?.toLowerCase().includes('coffee') ? 
                              <Coffee className="text-primary/20 w-10 h-10 sm:w-12 sm:h-12 group-hover:scale-110 transition-transform" /> : 
                              <Package className="text-primary/20 w-10 h-10 sm:w-12 sm:h-12 group-hover:scale-110 transition-transform" />
                            }
                          </div>
                        )}
                        
                        {/* Stock Badge - Compact Premium Tag */}
                        <div className="absolute top-2.5 right-2.5 z-10 group-hover:scale-110 group-hover:translate-y-[-1px] transition-all duration-300">
                          <div className={`
                            relative flex flex-col items-center min-w-[34px] sm:min-w-[42px] p-1 sm:p-1.5 rounded-xl border backdrop-blur-2xl shadow-xl
                            ${product.stock <= (product.min_stock || 10) ? 'bg-error text-on-error border-error-container/20' : 
                              product.stock <= (product.min_stock || 10) + 5 ? 'bg-amber-500/90 text-white border-white/20' : 
                              'bg-black/80 dark:bg-black text-white border-white/10'}
                          `}>
                            {/* Status Dot */}
                            <div className={`
                              absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white
                              ${product.stock <= (product.min_stock || 10) ? 'bg-white animate-pulse' : 
                                product.stock <= (product.min_stock || 10) + 5 ? 'bg-white' : 
                                'bg-secondary'}
                            `} />
                            
                            <span className="text-[5px] sm:text-[6px] font-black uppercase tracking-[0.15em] opacity-60 leading-none mb-0.5">
                              Stock
                            </span>
                            <span className="text-[10px] sm:text-[12px] font-black leading-none font-heading">
                              {product.stock}
                            </span>
                          </div>
                        </div>

                        {/* Sold Out Overlay */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-[4px] flex items-center justify-center z-20">
                            <span className="bg-white/95 dark:bg-black/95 text-error px-3 py-1 sm:px-5 sm:py-2 rounded-full font-black text-[8px] sm:text-[10px] uppercase tracking-[0.2em] shadow-2xl border border-error/20">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="px-3 sm:px-5 pb-4 sm:pb-5 pt-1">
                      <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                        <h3 className="font-heading font-extrabold text-[11px] sm:text-sm text-on-surface line-clamp-1 flex-1 uppercase tracking-tight group-hover:text-primary transition-colors">{product.name}</h3>
                        {product.stock > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(4,107,94,0.4)] animate-pulse" />
                        )}
                      </div>
                      
                      <div className="flex items-baseline gap-1 mb-2 sm:mb-3">
                        <span className="text-[10px] sm:text-xs font-bold text-primary opacity-50">₱</span>
                        <p className="text-base sm:text-xl font-black text-primary tracking-tighter">
                          {Number(product.selling_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      {/* Bundle Indicator - Pill Style */}
                      {product.bundle_qty && product.bundle_qty > 0 && (
                        <div className="flex items-center gap-1 mb-2.5 bg-primary/5 border border-primary/10 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full w-fit">
                          <Tag size={8} className="text-primary" />
                          <span className="text-[8px] sm:text-[9px] font-bold text-primary uppercase tracking-tight">

                            Save ₱{( (product.selling_price * product.bundle_qty) - product.bundle_price! ).toFixed(2)} on {product.bundle_qty}
                          </span>
                        </div>
                      )}

                      {/* Premium Stats Grid */}
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-2.5 sm:pt-3 border-t border-on-surface/5">
                        <div className="bg-secondary/5 px-1.5 py-1 rounded-lg border border-secondary/5">
                          <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-[0.15em] text-secondary/40 block mb-0.5">Yield</span>
                          <p className="text-[9px] sm:text-[10px] font-black text-secondary leading-none">
                            +₱{yieldAmt.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-primary/5 px-1.5 py-1 rounded-lg border border-primary/5 text-right">
                          <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-[0.15em] text-primary/40 block mb-0.5">ROI</span>
                          <p className="text-[9px] sm:text-[10px] font-black text-primary leading-none">
                            {roi.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Service - GCash Hub */}
        <div className="col-span-12">
          <section className="bg-secondary-container/10 p-4 sm:p-6 rounded-[2rem] border border-secondary/10 shadow-sm">
            {!vaultInitialized ? (
              /* Setup View */
              <div className="flex flex-col items-center py-4 px-2 text-center">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-4">
                  <Wallet size={24} />
                </div>
                <h2 className="font-heading font-black text-xl text-on-surface uppercase tracking-tight mb-1">Initialize Digital Vault</h2>
                <p className="text-[11px] text-on-surface-variant max-w-xs mb-6 leading-tight font-medium opacity-70">
                  Save your current <span className="text-secondary font-bold">GCash Wallet Amount</span> to begin accurate tracking.
                </p>

                <div className="w-full max-w-sm flex flex-col gap-2">
                  <div className="relative">
                    <Banknote className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary opacity-30" size={18} />
                    <input 
                      type="number"
                      placeholder="0.00"
                      value={serviceForm.amount}
                      onChange={(e) => setServiceForm({ ...serviceForm, amount: e.target.value })}
                      className="w-full py-3.5 pl-12 pr-5 bg-white dark:bg-surface-container border border-secondary/10 rounded-xl font-black text-lg text-primary outline-none focus:ring-2 focus:ring-secondary transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setServiceMode("INITIALIZE");
                      handleSubmitService();
                    }}
                    className="w-full py-3.5 bg-secondary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-secondary/20 active:scale-95 transition-all cursor-pointer"
                  >
                    Set Base Capital
                  </button>
                </div>
              </div>
            ) : (
              /* Operational View */
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <h2 className="font-heading font-black text-lg text-on-surface uppercase tracking-tight">Digital Vault</h2>
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">GCash Activity Monitor</p>
                    </div>
                  </div>

                  {/* Balance HUD */}
                  <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-secondary/5 shadow-sm flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest block opacity-50">Current Balance</span>
                      <span className="text-xl font-black text-secondary font-heading">
                        ₱{gcashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        setServiceMode("ADJUST");
                        setServiceForm({ amount: gcashBalance.toString(), fee: "0", isFeeDigital: false, reason: "" });
                        setShowServiceModal(true);
                      }}
                      className="p-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary hover:text-white transition-all active:scale-95 cursor-pointer"
                    >
                      <Settings2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Cash In", icon: <ArrowUpCircle size={18} />, mode: "CASH_IN" as const, color: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50" },
                    { label: "Cash Out", icon: <ArrowDownCircle size={18} />, mode: "CASH_OUT" as const, color: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50" },
                    { label: "Phone Load", icon: <Smartphone size={18} />, mode: "LOAD" as const, color: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50" },
                    { label: "History", icon: <HistoryIcon size={18} />, mode: null, color: "bg-surface-container text-on-surface-variant border-outline-variant/10 dark:bg-surface-container-high dark:border-outline-variant/5" }
                  ].map((btn, i) => (
                    <button
                      key={i}
                      disabled={btn.mode === null}
                      onClick={() => {
                        if (btn.mode) {
                          setServiceMode(btn.mode);
                          setServiceForm({ amount: "", fee: "", isFeeDigital: false, reason: "" });
                          setShowServiceModal(true);
                        }
                      }}
                      className={`flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-95 cursor-pointer ${btn.color} ${btn.mode === null ? 'opacity-50 grayscale' : 'hover:shadow-md'}`}
                    >
                      {btn.icon}
                      {btn.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>



      {/* Quantity Selector Modal */}
      {showQtyModal && isMounted && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl p-8 shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8 shrink-0">
              <div>
                <h3 className="font-heading font-bold text-xl">{qtyTarget?.name}</h3>
                <p className="text-xs text-on-surface-variant">Set quantity to add to cart</p>
              </div>
              <button onClick={() => setShowQtyModal(false)} className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-center cursor-pointer">
                <X size={20} className="text-on-surface-variant" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="flex items-center justify-center gap-6 mb-10">
                <button
                  onClick={() => setQtyValue(Math.max(1, qtyValue - 1))}
                  className="w-16 h-16 rounded-2xl bg-surface-container-highest hover:bg-surface-variant flex items-center justify-center text-primary active:scale-90 transition-all font-bold text-4xl cursor-pointer"
                >
                  <Minus size={32} />
                </button>
                <div className="w-24 text-center text-5xl font-extrabold text-on-surface">
                  {qtyValue}
                </div>
                <button
                  disabled={qtyValue + (cart.find(i => i.id === qtyTarget?.id)?.quantity || 0) >= (qtyTarget?.stock || 0)}
                  onClick={() => setQtyValue(qtyValue + 1)}
                  className="w-16 h-16 rounded-2xl bg-surface-container-highest hover:bg-surface-variant flex items-center justify-center text-primary active:scale-90 disabled:opacity-20 disabled:active:scale-100 transition-all font-bold text-4xl cursor-pointer"
                >
                  <Plus size={32} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4">
                <button onClick={() => setShowQtyModal(false)} className="py-4 bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-bold rounded-xl transition-colors cursor-pointer">Cancel</button>
                <button onClick={confirmAddToCart} className="py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl active:scale-95 transition-transform shadow-lg cursor-pointer">Confirm</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}



      {/* Quick Service Modal */}
      {showServiceModal && isMounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1100] flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-[2rem] p-5 shadow-2xl border border-secondary/10 flex flex-col max-h-[90dvh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-5 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  serviceMode === 'CASH_IN' ? 'bg-emerald-100 text-emerald-600' : 
                  serviceMode === 'CASH_OUT' ? 'bg-amber-100 text-amber-600' :
                  serviceMode === 'LOAD' ? 'bg-blue-100 text-blue-600' :
                  'bg-secondary/10 text-secondary'
                }`}>
                  {serviceMode === 'CASH_IN' ? <ArrowUpCircle size={20} /> : 
                   serviceMode === 'CASH_OUT' ? <ArrowDownCircle size={20} /> :
                   serviceMode === 'LOAD' ? <Smartphone size={20} /> :
                   <Settings2 size={20} />}
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg uppercase tracking-tight text-on-surface">
                    {serviceMode === 'CASH_IN' ? 'Cash In' : 
                     serviceMode === 'CASH_OUT' ? 'Cash Out' : 
                     serviceMode === 'LOAD' ? 'Mobile Load' : 
                     'Manage Balance'}
                  </h3>
                  <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">Digital Service Protocol</p>
                </div>
              </div>
              <button 
                onClick={() => setShowServiceModal(false)}
                className="p-1.5 hover:bg-surface-container rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="space-y-4">
                {/* Amount Input */}
                <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-70">
                  {serviceMode === 'ADJUST' ? 'New Target Balance' : 'Principal Amount (₱)'}
                </label>
                <div className="relative">
                  <Banknote className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary opacity-30" size={20} />
                  <input
                    autoFocus
                    type="number"
                    value={serviceForm.amount}
                    onChange={(e) => setServiceForm({ ...serviceForm, amount: e.target.value })}
                    className="w-full bg-surface-container-high border-none rounded-xl py-4 pl-14 pr-5 text-xl font-black focus:ring-2 focus:ring-secondary transition-all outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {serviceMode !== "ADJUST" && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-70">Service Fee (₱)</label>
                  <div className="relative">
                    <Tag className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary opacity-30" size={18} />
                    <input
                      type="number"
                      value={serviceForm.fee}
                      onChange={(e) => setServiceForm({ ...serviceForm, fee: e.target.value })}
                      className="w-full bg-surface-container-high border-none rounded-xl py-3 pl-14 pr-5 text-lg font-bold focus:ring-2 focus:ring-secondary transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              {/* Cash Out Specific: Fee Method */}
              {serviceMode === "CASH_OUT" && (
                <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Fee Payment Method</span>
                    <div className="flex items-center gap-1 text-[8px] font-black uppercase text-secondary">
                      <Info size={10} />
                      Accuracy Protocol
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setServiceForm({ ...serviceForm, isFeeDigital: false })}
                      className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${!serviceForm.isFeeDigital ? 'bg-secondary text-white border-secondary shadow-md shadow-secondary/10' : 'bg-white dark:bg-black/50 text-on-surface-variant border-outline-variant/10'}`}
                    >
                      Physical Cash
                    </button>
                    <button 
                      onClick={() => setServiceForm({ ...serviceForm, isFeeDigital: true })}
                      className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${serviceForm.isFeeDigital ? 'bg-secondary text-white border-secondary shadow-md shadow-secondary/10' : 'bg-white dark:bg-black/50 text-on-surface-variant border-outline-variant/10'}`}
                    >
                      Digital (GCash)
                    </button>
                  </div>
                </div>
              )}

              {serviceMode === "ADJUST" && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-70">Reason for Adjustment</label>
                  <textarea
                    value={serviceForm.reason}
                    onChange={(e) => setServiceForm({ ...serviceForm, reason: e.target.value })}
                    className="w-full bg-surface-container-high border-none rounded-xl py-3 px-5 text-xs font-medium focus:ring-2 focus:ring-secondary transition-all outline-none resize-none h-20"
                    placeholder="e.g. Capital Replenishment, Rectification..."
                  />
                </div>
              )}

              {/* Impact Preview */}
              <div className="bg-surface-container-high/50 p-3 rounded-xl border border-secondary/5 space-y-1.5">
                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest opacity-40">
                   <span>Projected Balance Evolution</span>
                   <span>Calculation Pulse</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-on-surface-variant/40">₱{gcashBalance.toLocaleString()}</span>
                  <ArrowRight className="text-secondary opacity-40 ml-1 mr-1" size={16} />
                  <span className="text-base font-black text-primary">
                    ₱{(() => {
                      const amt = parseFloat(serviceForm.amount) || 0;
                      const f = parseFloat(serviceForm.fee) || 0;
                      if (serviceMode === "CASH_IN" || serviceMode === "LOAD") return (gcashBalance - amt).toLocaleString(undefined, { minimumFractionDigits: 2 });
                      if (serviceMode === "CASH_OUT") return (gcashBalance + amt + (serviceForm.isFeeDigital ? f : 0)).toLocaleString(undefined, { minimumFractionDigits: 2 });
                      if (serviceMode === "ADJUST") return amt.toLocaleString(undefined, { minimumFractionDigits: 2 });
                      return gcashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 });
                    })()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => setShowServiceModal(false)}
                  className="py-3 bg-surface-container text-on-surface-variant font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-surface-container-high transition-all"
                >
                  Terminate
                </button>
                <button 
                  onClick={handleSubmitService}
                  disabled={isProcessing}
                  className="py-3 bg-gradient-to-br from-secondary to-secondary-container text-white font-black text-[9px] uppercase tracking-widest rounded-xl shadow-lg shadow-secondary/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Authorize Entry"}
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
