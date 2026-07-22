"use client";

import React from "react";
import { WiredProgress } from "wired-elements-react";

interface ProgressProps {
  value: number; // 0 to 100
  label?: string;
  className?: string;
}

export function Progress({ value, label, className }: ProgressProps) {
  return (
    <div className={`flex flex-col gap-1 ${className || ""}`}>
      {label && <span className="text-sm">{label}</span>}
      <WiredProgress value={value} max={100} />
    </div>
  );
}
