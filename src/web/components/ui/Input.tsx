"use client";

import React from "react";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function Input({ value, placeholder, onChange, className = "", ...props }: InputProps) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
      className={`w-full px-4 py-2 border border-[var(--hairline)] rounded-[var(--r-sm)] bg-[var(--surface)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all ${className}`}
      {...props}
    />
  );
}
