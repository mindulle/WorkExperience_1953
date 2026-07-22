"use client";

import React from "react";
import { WiredCard } from "wired-elements-react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevation?: number;
}

export function Card({ children, className, elevation = 2 }: CardProps) {
  return (
    <div className={className}>
      <WiredCard elevation={elevation}>
        <div className="p-4">{children}</div>
      </WiredCard>
    </div>
  );
}
