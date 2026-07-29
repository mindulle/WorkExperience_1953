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
    primary: "bg-[var(--primary)] text-[var(--surface)] hover:bg-blue-600 focus:ring-[var(--primary)]",
    secondary: "bg-[var(--plane)] text-[var(--ink)] hover:bg-gray-200 focus:ring-gray-400",
    outline: "border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-blue-50 focus:ring-[var(--primary)]",
    ghost: "text-[var(--ink)] hover:bg-[var(--plane)] focus:ring-gray-400",
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
