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
    elevation === 1 ? "[box-shadow:var(--shadow-sm)]" :
    "[box-shadow:var(--shadow)]" ;

  return (
    <div className={`bg-[var(--surface)] rounded-[var(--r-lg)] border border-[var(--hairline)] p-6 ${shadowClass} ${className}`}>
      {children}
    </div>
  );
}
