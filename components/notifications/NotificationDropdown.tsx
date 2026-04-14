"use client";

import React from "react";
import { useNotifications } from "@/lib/contexts/NotificationContext";
import { 
  Bell, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Check, 
  Trash2,
  Clock,
  ChevronDown,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

const getIcon = (type: string) => {
  switch (type) {
    case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
    case 'success': return <CheckCircle2 size={16} className="text-secondary" />;
    case 'error': return <X size={16} className="text-error" />;
    default: return <Info size={16} className="text-primary" />;
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

export function NotificationDropdown({ onClose }: { onClose: () => void }) {

  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications,
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
      if (n.action) {
        // Navigation is handled by Link wrapper
      }
    }
  };

  return (
    <div className="absolute top-14 right-0 w-[380px] bg-[var(--color-surface-container-lowest)] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-outline-variant/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[1000] hidden md:block">
      {/* Header */}
      <div className="px-5 py-4 border-b border-outline-variant/5 bg-surface-container-low/30 flex items-center justify-between">
        <h3 className="text-lg font-black font-heading text-primary uppercase tracking-tight">Notifications</h3>
        <div className="flex gap-2">
           <button 
            onClick={markAllAsRead}
            className="p-2 hover:bg-surface-container rounded-lg text-primary transition-colors cursor-pointer"
            title="Mark all as read"
          >
            <Check size={16} />
          </button>
          <button 
            onClick={clearNotifications}
            className="p-2 hover:bg-error/10 rounded-lg text-error transition-colors cursor-pointer"
            title="Clear all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[520px] overflow-y-auto no-scrollbar">
        {visibleNotifications.length === 0 ? (
          <div className="py-20 text-center px-6">
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
              <Bell size={32} />
            </div>
            <p className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-1">
              {showHistory ? "Archive Clean" : "Recent Sync Clear"}
            </p>
            <p className="text-[10px] font-bold text-on-surface-variant/40 leading-relaxed">
              {showHistory 
                ? "No historical records in the manifest." 
                : "No active alerts within the last 24 hours cycle."}
            </p>
            {!showHistory && notifications.length > 0 && (
              <button 
                onClick={() => setShowHistory(true)}
                className="mt-6 text-secondary text-[9px] font-black uppercase tracking-widest flex items-center gap-1 mx-auto hover:underline"
              >
                Access History <ArrowRight size={12} />
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/5">
            {visibleNotifications.map((n) => (
              <div key={n.id} className="flex flex-col">
                <div 
                  onClick={() => handleItemClick(n)}
                  className={`p-4 flex gap-4 cursor-pointer transition-all hover:bg-surface-container/30 relative group ${expandedId === n.id ? 'bg-surface-container/20' : ''}`}
                >
                  {/* Minimalist Unread Dot */}
                  {!n.isRead && (
                    <div className="absolute left-1.5 top-5 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.5)]" />
                  )}
                  
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white/20 ${
                    n.type === 'warning' ? 'bg-amber-500/10' : 
                    n.type === 'success' ? 'bg-secondary/10' : 
                    n.type === 'error' ? 'bg-error/10' : 'bg-primary/10'
                  }`}>
                    {getIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <div className="flex items-center gap-2 truncate">
                        <p className={`text-sm font-black tracking-tight truncate ${!n.isRead ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                          {n.title}
                        </p>
                        {n.subItems && (
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded-md">
                            {n.subItems.length}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-on-surface-variant/40 flex items-center gap-1 uppercase whitespace-nowrap pl-2">
                        <Clock size={10} />
                        {getTimeAgo(n.timestamp)}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed line-clamp-2 ${!n.isRead ? 'text-on-surface-variant' : 'text-on-surface-variant opacity-60'}`}>
                      {n.message}
                    </p>

                    {/* Simple Action (Non-clustered) */}
                    {!n.subItems && n.action && (
                      <div className="mt-2">
                        <Link 
                          href={n.action.href}
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                            onClose();
                          }}
                          className="inline-flex items-center text-[10px] font-black uppercase text-primary hover:text-primary-container tracking-[0.1em] gap-1 group-hover:underline"
                        >
                          {n.action.label}
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Expand Indicator */}
                  {n.subItems && (
                    <div className="flex items-center text-on-surface-variant/30">
                      {expandedId === n.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  )}
                </div>

                {/* Expanded Sub-items */}
                {expandedId === n.id && n.subItems && (
                  <div className="bg-surface-container/10 border-t border-outline-variant/5 animate-in slide-in-from-top-2 duration-300">
                    {n.subItems.map((item: any) => (
                      <Link 
                        key={item.id} 
                        href={item.action.href}
                        onClick={(e) => {
                          markAsRead(item.id);
                          onClose();
                        }}
                        className="p-4 pl-14 border-b border-outline-variant/5 last:border-0 flex items-center justify-between group/sub transition-colors hover:bg-[var(--color-surface-container)] cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-on-surface tracking-tight truncate">{item.title}</p>
                          <p className="text-[10px] text-on-surface-variant/70 font-bold">{item.message}</p>
                        </div>
                        <div className="p-2 bg-primary/5 text-primary rounded-lg group-hover/sub:bg-primary group-hover/sub:text-white transition-all active:scale-90">
                          <ArrowRight size={14} />
                        </div>
                      </Link>
                    ))}

                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Footer */}
      {(notifications.length > 0 && (hasHiddenHistory || showHistory)) && (
        <div className="px-5 py-3 border-t border-outline-variant/5 bg-surface-container-low/20 text-center">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="text-[10px] font-black uppercase text-primary hover:underline tracking-widest"
          >
            {showHistory ? "Return to Recent Actions" : "View Entire History Log"}
          </button>
        </div>
      )}
    </div>
  );
}

