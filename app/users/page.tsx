"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Filter,
  ChevronRight,
  Info,
  UserPlus,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/contexts/SessionContext";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  avatar_url?: string;
}

export default function UsersPage() {
  const { hasSystemBooted, setHasSystemBooted } = useSession();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(!hasSystemBooted);

  useEffect(() => {
    fetchProfiles();

    const handleSync = () => fetchProfiles(true);
    window.addEventListener('global-sync', handleSync);
    return () => window.removeEventListener('global-sync', handleSync);
  }, []);

  const fetchProfiles = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('is_active', { ascending: false });

      if (error) {
        console.error("Error fetching profiles:", error);
      } else {
        setProfiles(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setHasSystemBooted(true);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full pt-4 pb-24">

      {/* Dashboard Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold font-heading text-primary tracking-tight">Personnel Management</h2>
        <p className="text-on-surface-variant text-sm mt-1">Configure active staff and ledger permissions.</p>
      </div>

      {/* Role Permissions Highlights (Asymmetric Tonal Layering) */}
      <section className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-surface-container-low p-4 rounded-xl shadow-[0_4px_12px_rgba(0,40,162,0.03)] border border-outline-variant/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Active Nodes</span>
          <div className="text-3xl font-bold font-heading mt-1 text-on-surface">
            {loading ? <Loader2 size={24} className="animate-spin text-primary mt-1" /> : profiles.filter(p => p.is_active).length}
          </div>
        </div>
        <div className="bg-surface-container-highest p-4 rounded-xl flex flex-col justify-between shadow-[0_4px_12px_rgba(0,40,162,0.03)] border border-outline-variant/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Security Level</span>
          <div className="flex items-center gap-1 mt-1 text-primary">
            <ShieldCheck size={18} className="fill-primary text-surface-container-highest" />
            <span className="text-sm font-semibold">Tier 1</span>
          </div>
        </div>
      </section>

      {/* Personnel List (No-Line Zebra Striping) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between py-2 mb-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Active Personnel</h3>
          <Filter size={20} className="text-primary cursor-pointer active:scale-95 transition-transform" />
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10 opacity-60">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : profiles.length === 0 ? (
          <div className="bg-surface-container-low p-6 rounded-xl text-center border border-outline-variant/10">
            <UserPlus className="mx-auto text-outline/40 mb-2" size={32} />
            <p className="text-on-surface-variant text-sm font-medium">No personnel found in ledger</p>
          </div>
        ) : (
          profiles.map((profile) => (
            <div key={profile.id} className={`p-4 rounded-xl mb-3 flex items-center justify-between hover:bg-surface-container transition-colors cursor-pointer group border border-outline-variant/5 ${profile.is_active ? 'bg-surface-container-low' : 'bg-surface-container-low opacity-60 group-hover:opacity-100'}`}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    className={`w-12 h-12 rounded-lg object-cover ${!profile.is_active ? 'grayscale' : ''}`}
                    alt={profile.full_name || profile.email}
                    src={profile.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                  />
                  <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-surface rounded-full ${profile.is_active ? 'bg-secondary' : 'bg-outline-variant'}`}></span>
                </div>
                <div>
                  <div className="font-bold text-on-surface text-sm group-hover:text-primary transition-colors font-heading">{profile.full_name || "Unknown Staff"}</div>
                  <div className="text-xs font-medium text-on-surface-variant truncate block max-w-[140px] mini:max-w-full">{profile.role || "Pending Role"} • {profile.email}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-[10px] font-bold uppercase tracking-tighter ${profile.is_active ? 'text-secondary' : 'text-outline'}`}>
                  {profile.is_active ? 'Active' : 'Offline'}
                </div>
                <ChevronRight size={18} className="text-on-surface-variant mt-1 ml-auto group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Permission Configuration Section (Glassmorphism inspired card) */}
      <section className="mt-8">
        <div className="flex items-center justify-between py-2 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Global Privileges</h3>
          <Info size={18} className="text-on-surface-variant cursor-pointer active:scale-95 transition-transform" />
        </div>

        <div className="bg-surface-container rounded-2xl p-6 space-y-6 shadow-sm border border-outline-variant/10">

          {/* Toggle 1 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-on-surface text-sm">Can void transactions</div>
              <div className="text-xs text-on-surface-variant pr-4 mt-0.5">Requires manager override if disabled</div>
            </div>
            <div className="w-12 h-6 bg-primary rounded-full relative flex items-center px-1 shrink-0 cursor-pointer transition-colors hover:brightness-110">
              <div className="w-4 h-4 bg-white rounded-full translate-x-6 shadow-sm transition-transform"></div>
            </div>
          </div>

          {/* Toggle 2 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-on-surface text-sm">Can edit inventory</div>
              <div className="text-xs text-on-surface-variant pr-4 mt-0.5">Modify SKU, price, and stock counts</div>
            </div>
            <div className="w-12 h-6 bg-outline-variant rounded-full relative flex items-center px-1 shrink-0 cursor-pointer transition-colors hover:bg-outline">
              <div className="w-4 h-4 bg-white rounded-full shadow-sm transition-transform"></div>
            </div>
          </div>

          {/* Toggle 3 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-on-surface text-sm">Apply custom discounts</div>
              <div className="text-xs text-on-surface-variant pr-4 mt-0.5">Manual percentage or fixed overrides</div>
            </div>
            <div className="w-12 h-6 bg-primary rounded-full relative flex items-center px-1 shrink-0 cursor-pointer transition-colors hover:brightness-110">
              <div className="w-4 h-4 bg-white rounded-full translate-x-6 shadow-sm transition-transform"></div>
            </div>
          </div>

        </div>
      </section>

      {/* History/Activity Log */}
      <section className="mt-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Security Logs</h3>

        <div className="border-l-2 border-surface-container-high ml-2 space-y-6 pl-6">
          <div className="relative">
            <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-secondary"></span>
            <div className="text-xs text-on-surface-variant font-medium">10:42 AM</div>
            <div className="text-sm font-bold text-on-surface mt-0.5">Elena Vance authorized void #8821</div>
          </div>
          <div className="relative">
            <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-outline-variant"></span>
            <div className="text-xs text-on-surface-variant font-medium">09:15 AM</div>
            <div className="text-sm font-bold text-on-surface mt-0.5">Marcus Chen started shift</div>
          </div>
        </div>
      </section>

      {/* FAB for Staff Registration */}
      <button className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl shadow-[0_12px_32px_rgba(0,40,162,0.15)] flex items-center justify-center active:scale-90 transition-transform duration-150 z-40 hover:-translate-y-1 hover:shadow-lg cursor-pointer">
        <UserPlus size={24} className="fill-current text-white" />
      </button>

    </div>
  );
}
