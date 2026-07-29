"use client";

import React from "react";

interface DatePickerProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  label?: string;
}

export function DatePicker({ value, onChange, className = "", label }: DatePickerProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-[var(--ink)]">{label}</label>}
      <input
        type="date"
        value={value}
        onChange={onChange}
        className="px-3 py-2 bg-[var(--surface)] border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--ink)] w-full transition-all"
      />
    </div>
  );
}
