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
  // 나중에 디자인 시스템이 나오면 이 컴포넌트 내부만 
  // <button className={`bg-blue-500 rounded... ${className}`}>{children}</button>
  // 로 교체하면 전역 적용됩니다!
  
  return (
    <div className={className}>
      <WiredButton disabled={disabled} onClick={disabled ? undefined : onClick}>
        {children as any}
      </WiredButton>
    </div>
  );
}
