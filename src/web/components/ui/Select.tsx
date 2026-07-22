"use client";

import React from "react";
import { WiredCombo, WiredItem } from "wired-elements-react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  selected?: string;
  onSelect?: (value: string) => void;
  className?: string;
}

export function Select({ options, selected, onSelect, className }: SelectProps) {
  return (
    <div className={className}>
      <WiredCombo
        selected={selected}
        onselected={(e: any) => onSelect && onSelect(e.detail.selected)}
      >
        {options.map((opt) => (
          <WiredItem key={opt.value} value={opt.value}>
            {opt.label}
          </WiredItem>
        ))}
      </WiredCombo>
    </div>
  );
}
