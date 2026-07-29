"use client";

import React from "react";

interface ProgressProps {
  value: number; // 0 to 100
  label?: string;
  className?: string;
}

export function Progress({ value, label, className = "" }: ProgressProps) {
  // Ensure value is between 0 and 100
  const safeValue = Math.min(Math.max(value, 0), 100);
  
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <span className="text-sm font-medium text-[var(--ink)]">{label}</span>}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className="bg-[var(--primary)] h-2.5 rounded-full transition-all duration-300 ease-in-out" 
          style={{ width: `${safeValue}%` }}
        ></div>
      </div>
    </div>
  );
}
