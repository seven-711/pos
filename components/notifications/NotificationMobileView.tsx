"use client";

import React from "react";
import { useNotifications } from "@/lib/contexts/NotificationContext";
import { 
  Bell, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  ArrowRight,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCheck
} from "lucide-react";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const getIcon = (type: string) => {
  switch (type) {
    case 'warning': return <AlertTriangle size={20} className="text-amber-500" />;
    case 'success': return <CheckCircle2 size={20} className="text-secondary" />;
    case 'error': return <X size={20} className="text-error" />;
    default: return <Info size={20} className="text-primary" />;
  }
};

const getTimeAgo = (timestamp: string) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
};

export function NotificationMobileView() {
  const router = useRouter();
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    toggleNotifications 
  } = useNotifications();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const isMoreThan24Hours = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    return diff > 24 * 60 * 60 * 1000;
  };

  const visibleNotifications = showHistory 
    ? notifications 
    : notifications.filter(n => !isMoreThan24Hours(n.timestamp));

  const hasHiddenHistory = notifications.some(n => isMoreThan24Hours(n.timestamp)) && !showHistory;

  const handleItemClick = (n: any) => {
    if (n.subItems && n.subItems.length > 0) {
      setExpandedId(expandedId === n.id ? null : n.id);
    } else {
      markAsRead(n.id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - Fixed-like within the view */}
      <div className="px-6 py-5 border-b border-outline-variant/10 flex items-center justify-between bg-surface-base sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => toggleNotifications(false)}
            className="p-2 -ml-2 hover:bg-surface-container rounded-full text-primary active:scale-90 transition-all cursor-pointer"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-black font-heading text-primary uppercase tracking-tight">Alerts</h2>
        </div>
        <button 
          onClick={markAllAsRead}
          className="p-2 text-secondary hover:bg-secondary/10 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
        >
          <CheckCheck size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Read All</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-32">
        {visibleNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 px-10 text-center">
            <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mb-6 opacity-20">
              <Bell size={48} />
            </div>
            <h3 className="text-lg font-black font-heading text-on-surface uppercase mb-2">
              {showHistory ? "Archive Empty" : "Recent Workspace Clear"}
            </h3>
            <p className="text-sm text-on-surface-variant font-bold leading-relaxed opacity-60">
              {showHistory 
                ? "No historical records found." 
                : "No active notifications within the last 24 hours."}
            </p>
            {!showHistory && notifications.length > 0 && (
              <button 
                onClick={() => setShowHistory(true)}
                className="mt-8 text-secondary text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                Check Ancient Records <ArrowRight size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/5">
            {visibleNotifications.map((n) => (
              <div key={n.id} className="flex flex-col">
                <div 
                  onClick={() => handleItemClick(n)}
                  className={`px-6 py-6 flex gap-5 transition-all active:bg-surface-container/30 relative ${expandedId === n.id ? 'bg-surface-container/10' : ''}`}
                >
                  {/* Minimalist Unread Dot */}
                  {!n.isRead && (
                    <div className="absolute left-2.5 top-8 w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.5)]" />
                  )}
                  
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-white/20 ${
                    n.type === 'warning' ? 'bg-amber-500/10' : 
                    n.type === 'success' ? 'bg-secondary/10' : 
                    n.type === 'error' ? 'bg-error/10' : 'bg-primary/10'
                   }`}>
                    {getIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-2">
                        <p className={`text-base font-black tracking-tight leading-tight ${!n.isRead ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                          {n.title}
                        </p>
                        {n.subItems && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-lg">
                            {n.subItems.length}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant/40 flex items-center gap-1 uppercase whitespace-nowrap pt-0.5 ml-2">
                        <Clock size={12} />
                        {getTimeAgo(n.timestamp)}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${n.subItems ? 'mb-2' : 'mb-4'} ${!n.isRead ? 'text-on-surface-variant' : 'text-on-surface-variant opacity-60'}`}>
                      {n.message}
                    </p>

                    {/* Simple Action (Non-clustered) */}
                    {!n.subItems && n.action && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                          toggleNotifications(false);
                          router.push(n.action!.href);
                        }}
                        className="w-full sm:w-auto px-6 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.97]"
                      >
                        {n.action.label}
                      </button>
                    )}
                  </div>

                  {/* Expand Indicator */}
                  {n.subItems && (
                    <div className="flex items-center text-on-surface-variant/20">
                      {expandedId === n.id ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                    </div>
                  )}
                </div>

                {/* Expanded Sub-items */}
                {expandedId === n.id && n.subItems && (
                  <div className="bg-surface-container/5 border-t border-outline-variant/5 animate-in slide-in-from-top-3 duration-300">
                    {n.subItems.map((item: any) => (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          markAsRead(item.id);
                          toggleNotifications(false);
                          router.push(item.action.href);
                        }}
                        className="px-6 py-5 pl-16 border-b border-outline-variant/5 last:border-0 flex items-center justify-between active:bg-white/40 transition-colors cursor-pointer group/sub"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-black text-on-surface tracking-tight truncate">{item.title}</p>
                          <p className="text-[11px] text-on-surface-variant/70 font-bold">{item.message}</p>
                        </div>
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center active:scale-90 transition-all group-hover/sub:bg-primary group-hover/sub:text-white">
                          <ArrowRight size={18} />
                        </div>
                      </div>

                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Bottom Action for history */}
      {notifications.length > 0 && (hasHiddenHistory || showHistory) && (
         <div className="p-6 pt-10 bg-gradient-to-t from-white via-white/90 to-transparent fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="w-full py-4 bg-surface-container-high text-on-surface-variant rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl pointer-events-auto active:scale-[0.98] transition-all hover:bg-surface-container-highest"
            >
              {showHistory ? "Hide Detailed History" : "View Notification History"}
            </button>
         </div>
      )}
    </div>
  );
}
