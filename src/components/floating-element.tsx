"use client";

import React from "react";

interface FloatingElementProps {
  children: React.ReactNode;
  delay?: number;
}

export function FloatingElement({ children, delay = 0 }: FloatingElementProps) {
  return (
    <div
      className="animate-float"
      style={{
        animationDelay: `${delay}s`,
        animation: `float 6s ease-in-out infinite ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}