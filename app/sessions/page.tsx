"use client";

import React from "react";

export default function SessionsPage() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
         <h1 className="text-3xl font-bold heading">Store Sessions</h1>
         <p className="text-[var(--color-on-surface-variant)] text-sm">Track operating hours and daily cutoffs</p>
      </div>
      
      <div className="surface-low p-6 rounded-lg flex flex-col gap-6 items-start">
         <div className="text-lg">Current Session Details:</div>
         <div className="flex items-center gap-4">
            <button className="kinetic-cta-primary px-6 py-3 font-bold text-lg bg-[var(--color-secondary)]">Start Day</button>
            <button className="kinetic-cta-primary px-6 py-3 font-bold text-lg bg-[var(--color-error)] opacity-50 cursor-not-allowed">End Day</button>
         </div>
      </div>
    </div>
  );
}
