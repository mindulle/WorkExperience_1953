"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
}

export function Button({ 
  children, 
  onClick, 
  className = "", 
  disabled, 
  variant = "primary",
  ...props 
}: ButtonProps) {
  
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-[var(--primary)] text-[var(--surface)] hover:brightness-110 focus:ring-[var(--primary)]",
    secondary: "bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--hairline)] focus:ring-[var(--hairline)]",
    outline: "border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-soft)] focus:ring-[var(--primary)]",
    ghost: "text-[var(--ink-2)] hover:bg-[var(--surface-2)] focus:ring-[var(--hairline)]",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
