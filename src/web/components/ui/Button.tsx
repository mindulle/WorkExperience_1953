"use client";

import React from "react";
import { WiredButton } from "wired-elements-react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function Button({ children, onClick, className, disabled }: ButtonProps) {
  return (
    <div className={className}>
      <WiredButton disabled={disabled} onclick={disabled ? undefined : onClick}>
        {(<div className="px-4 py-2 flex items-center justify-center">
          {children as any}
        </div>) as any}
      </WiredButton>
    </div>
  );
}
