"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";


export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  isRead: boolean;
  action?: { label: string; href: string };
  subItems?: {
    id: string;
    title: string;
    message: string;
    action: { label: string; href: string };
  }[];
}



interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  showNotifications: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  toggleNotifications: (force?: boolean) => void;
  clearNotifications: () => void;
}


const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);

  // Load read states from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pos_read_notifications');
    if (saved) {
      try {
        setReadIds(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse read notifications", e);
      }
    }
  }, []);

  // Save read states
  useEffect(() => {
    localStorage.setItem('pos_read_notifications', JSON.stringify(readIds));
  }, [readIds]);

  const refreshLiveAlerts = useCallback(async () => {
    if (!supabase) return;

    try {
      // 1. Fetch Low Stock Items
      const { data: allProds } = await supabase.from('products').select('*');
      const lowStock = (allProds || []).filter((p: any) => Number(p.stock) <= Number(p.min_stock));

      // 2. Fetch Recent Large Transactions (Standard > ₱500)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { data: recentTX } = await supabase
        .from('transactions')
        .select('id, total_amount, created_at')
        .gte('created_at', yesterday.toISOString())
        .gt('total_amount', 500)
        .order('created_at', { ascending: false });

      // 3. Map to Notifications (CLUSTERED)
      const productAlerts: Notification[] = [];
      if (lowStock.length > 0) {
        if (lowStock.length === 1) {
          const p = lowStock[0];
          productAlerts.push({
            id: `stock-${p.id}`,
            title: 'Low Stock Alert',
            message: `${p.name} is running low (${p.stock}/${p.min_stock}).`,
            type: 'warning',
            timestamp: new Date().toISOString(),
            isRead: readIds.includes(`stock-${p.id}`),
            action: { label: 'Restock', href: `/inventory?highlight=${p.id}` }
          });
        } else {
          // Cluster multiple items
          productAlerts.push({
            id: 'stock-cluster',
            title: 'Critical Stock Alert',
            message: `${lowStock.length} items require inventory replenishment.`,
            type: 'warning',
            timestamp: new Date().toISOString(),
            isRead: lowStock.every((p: any) => readIds.includes(`stock-${p.id}`)),
            subItems: lowStock.map((p: any) => ({
              id: `stock-${p.id}`,
              title: p.name,
              message: `Current: ${p.stock} / Min: ${p.min_stock}`,
              action: { label: 'Restock', href: `/inventory?highlight=${p.id}` }
            }))


          });
        }
      }

      const txAlerts: Notification[] = (recentTX || []).map((t: any) => ({
        id: `tx-${t.id}`,
        title: 'Significant Sale',
        message: `A transaction of ₱${Number(t.total_amount).toLocaleString()} was ledgered.`,
        type: 'success',
        timestamp: t.created_at,
        isRead: readIds.includes(`tx-${t.id}`),
        action: { label: 'Details', href: '/transactions' }
      }));

      // Combine and Sort
      const combined = [...productAlerts, ...txAlerts].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setNotifications(combined);

    } catch (err) {
      console.error("Live Alert Sync Error:", err);
    }
  }, [readIds]);

  // Initial fetch and periodic pulse
  useEffect(() => {
    refreshLiveAlerts();
    const interval = setInterval(refreshLiveAlerts, 1000 * 60 * 2); // Refresh every 2 mins
    return () => clearInterval(interval);
  }, [refreshLiveAlerts]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const addNotification = (n: Omit<Notification, 'id' | 'isRead' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...n,
      id: Math.random().toString(36).substr(2, 9),
      isRead: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setReadIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setReadIds(prev => Array.from(new Set([...prev, ...allIds])));
  };

  const toggleNotifications = (force?: boolean) => {
    setShowNotifications(prev => force !== undefined ? force : !prev);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        showNotifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        toggleNotifications,
        clearNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
