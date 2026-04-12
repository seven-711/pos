"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  X, 
  Loader2, 
  ImageIcon, 
  Check, 
  Copy,
  AlertCircle,
  RefreshCw,
  Search
} from "lucide-react";

interface MediaGalleryProps {
  onSelect?: (url: string) => void;
  onClose: () => void;
  currentUrl?: string;
}

interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
}

export function MediaGallery({ onSelect, onClose, currentUrl }: MediaGalleryProps) {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  // Lock the actual scroll container while modal is open
  useEffect(() => {
    const scroller = document.getElementById('main-scroll');
    if (!scroller) return;
    scroller.style.overflow = 'hidden';
    return () => {
      scroller.style.overflow = '';
    };
  }, []);

  const fetchMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: listError } = await supabase.storage
        .from('products')
        .list('product-images', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (listError) throw listError;
      if (data) setFiles(data);
    } catch (err: any) {
      console.error("Storage Fetch Error:", err);
      setError(err.message || "Failed to load storage files");
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (name: string) => {
    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(`product-images/${name}`);
    return data.publicUrl;
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
    !f.name.startsWith('.') // Filter out system files or hidden files
  );

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl h-[85vh] bg-[var(--color-surface)] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-3 border-b border-[var(--color-outline-variant)]/20 flex items-center justify-between bg-[var(--color-surface-container-low)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-container)] flex items-center justify-center text-[var(--color-primary)]">
              <ImageIcon size={15} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight uppercase">Media Library</h2>
              <p className="text-[9px] text-[var(--color-on-surface-variant)] uppercase tracking-wider font-semibold opacity-70">
                Supabase Storage • product-images
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={fetchMedia}
              className="p-1.5 rounded-full hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-error/10 text-error transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2 bg-[var(--color-surface-container-lowest)] border-b border-[var(--color-outline-variant)]/10">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] group-focus-within:text-[var(--color-primary)] transition-colors" size={14} />
            <input 
              type="text"
              placeholder="Search filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-surface-container)] border-none rounded-xl py-2 pl-9 pr-3 text-xs focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
            />
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-[var(--color-on-surface-variant)]">
              <Loader2 className="animate-spin text-[var(--color-primary)]" size={40} />
              <p className="text-sm font-medium animate-pulse">Scanning storage...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-error text-center p-8 bg-error/5 rounded-3xl m-4">
              <AlertCircle size={48} />
              <div>
                <h3 className="text-lg font-bold mb-1">Bucket Connection Error</h3>
                <p className="text-sm opacity-80 max-w-xs mx-auto">{error}</p>
                <p className="text-xs mt-4 opacity-100 font-semibold p-2 bg-white/20 rounded-lg">Check if 'products' bucket is public and exists.</p>
              </div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--color-on-surface-variant)] opacity-60">
              <ImageIcon size={64} strokeWidth={1} />
              <p className="font-semibold">{searchQuery ? 'No matching images found' : 'The storage bucket is empty'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 mini:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredFiles.map((file) => {
                const url = getFullUrl(file.name);
                const isSelected = currentUrl === url;
                
                return (
                  <div 
                    key={file.id} 
                    className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shadow-sm
                      ${isSelected ? 'border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/20' : 'border-transparent hover:border-[var(--color-primary)]/50'}
                    `}
                    onClick={() => onSelect && onSelect(url)}
                  >
                    {/* Image Preview */}
                    <img 
                      src={url} 
                      alt={file.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    
                    {/* Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1">
                        <p className="text-[10px] text-white font-bold truncate">{file.name}</p>
                        <div className="flex gap-1">
                          {onSelect && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onSelect(url); }}
                              className="flex-1 bg-[var(--color-primary)] text-white text-[9px] py-1.5 rounded-lg font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all"
                            >
                              Choose
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleCopy(url, file.id); }}
                            className="bg-white/20 backdrop-blur-md text-white p-1.5 rounded-lg hover:bg-white/40 transition-all"
                            title="Copy Link"
                          >
                            {copiedId === file.id ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-[var(--color-primary)] text-white p-1 rounded-full shadow-lg">
                        <Check size={12} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--color-surface-container-low)] border-t border-[var(--color-outline-variant)]/20 text-center">
          <p className="text-[10px] text-[var(--color-on-surface-variant)] opacity-60 font-bold uppercase tracking-[0.2em]">
            Click an image to see options or link to product
          </p>
        </div>
      </div>
    </div>
  );
}
