"use client";

import React from "react";
import { WiredInput } from "wired-elements-react";

interface InputProps {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function Input({ value, placeholder, onChange, className }: InputProps) {
  return (
    <div className={className}>
      <WiredInput 
        placeholder={placeholder} 
        value={value} 
        oninput={(e: any) => onChange && onChange(e.target.value)} 
      />
    </div>
  );
}
