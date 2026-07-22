"use client";

import React from "react";

interface DatePickerProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  label?: string;
}

export function DatePicker({ value, onChange, className, label }: DatePickerProps) {
  return (
    <div className={`flex flex-col gap-1 ${className || ""}`}>
      {label && <span className="text-sm font-bold text-gray-700">{label}</span>}
      <input
        type="date"
        value={value}
        onChange={onChange}
        className="px-3 py-2 bg-transparent border-2 border-dashed border-gray-400 rounded-lg outline-none focus:border-blue-500 font-sans text-gray-700 w-full"
        style={{ fontFamily: "inherit" }}
      />
    </div>
  );
}
