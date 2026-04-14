"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useSession } from "@/lib/contexts/SessionContext";

export default function LoginPage() {
  const router = useRouter();
  const { setIsLayoutHidden } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hide the global sidebar layout while on the login page
  useEffect(() => {
    setIsLayoutHidden(true);
    return () => setIsLayoutHidden(false);
  }, [setIsLayoutHidden]);

  // Check if already authenticated
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/");
      }
    };
    checkUser();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.session) {
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden bg-background">
      {/* Top Half: Lush Modern Illustration / Graphic Block */}
      <div className="relative h-[397px] w-full overflow-hidden">
        <div className="absolute inset-0 z-0 bg-primary-container">
          <img 
            alt="abstract blue fintech design" 
            className="w-full h-full object-cover mix-blend-overlay opacity-50" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYo0NQSULDfLsBsPD9hSDhcMt0HLBDLxUfurEJnnUut0OiLh7L9nVL63ijpe4BXpA3M68nVSUwZGxBjPCJFDhpVagdALA_ir7YHJF4U656lgVR3HtTMd3fVS_Ahd7ul07C7shT-ie7RCjGCjH9kIIhk6LLheJ-v9lNDKUJS4TMfuTwq4y7pISLevFqIO1Jp_s5u8SxnV4Yc85GXeU0ZKQ_4WBnvpDNk6tffzizLIiDuxwcxb-E1z0WgvvdQCGEbBiSUmtr0LHc2ufn"
          />
          {/* Brand Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/80 to-transparent flex items-center justify-center">
            <div className="text-center flex flex-col items-center">
              <div className="flex items-center justify-center mb-4 w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-2 shadow-2xl">
                <img src="/logo.png" alt="POS ni Estela" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <h1 className="font-heading font-black tracking-widest text-white text-3xl">POS NI ESTELA</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Half: The White Card */}
      <div className="relative z-10 -mt-12 flex-grow bg-surface-container-lowest rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] px-8 pt-12 pb-10 flex flex-col items-center">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-10 text-center">
            <h2 className="font-heading text-3xl font-bold text-on-surface tracking-tight mb-2">Sign In</h2>
            <p className="text-on-surface-variant font-medium">Access your Point of Sale dashboard</p>
          </div>

          {/* Form Section */}
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-error/10 text-error px-4 py-3 rounded-xl text-sm font-semibold text-center border border-error/20">
                {error}
              </div>
            )}
            
            {/* Email Input */}
            <div className="group">
              <label className="block text-xs font-heading font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1" htmlFor="email">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-on-surface-variant">
                  <Mail size={18} />
                </div>
                <input 
                  id="email" 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-high border-none rounded-xl focus:ring-2 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline/50 outline-none" 
                  placeholder="name@posniestela.com" 
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="group">
              <label className="block text-xs font-heading font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1" htmlFor="password">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-on-surface-variant">
                  <Lock size={18} />
                </div>
                <input 
                  id="password" 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-high border-none rounded-xl focus:ring-2 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline/50 outline-none" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 rounded-xl font-heading font-bold text-on-primary bg-gradient-to-br from-primary to-primary-container shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Subtle Ticker Decorative Element */}
          <div className="mt-14 pt-10 opacity-20 pointer-events-none select-none text-center">
            <div className="flex justify-center gap-6 whitespace-nowrap overflow-hidden">
              <span className="text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-on-surface-variant">AUTH_NODE_01</span>
              <span className="text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-on-surface-variant">SECURE_LEDGER</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
