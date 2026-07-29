"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevation?: number; // kept for compatibility, translated to shadow
}

export function Card({ children, className = "", elevation = 1 }: CardProps) {
  // Map elevation to shadow depth
  const shadowClass = 
    elevation === 0 ? "shadow-none" :
    elevation === 1 ? "shadow-sm" :
    elevation === 2 ? "shadow-md" :
    elevation === 3 ? "shadow-lg" :
    "shadow-xl";

  return (
    <div className={`bg-[var(--surface)] rounded-xl border border-gray-100 ${shadowClass} p-6 ${className}`}>
      {children}
    </div>
  );
}
