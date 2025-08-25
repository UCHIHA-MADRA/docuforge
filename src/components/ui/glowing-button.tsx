"use client";

import React from "react";

interface GlowingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}

export function GlowingButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: GlowingButtonProps) {
  const baseClasses =
    "relative overflow-hidden transition-all duration-300 transform hover:scale-105";
  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-2xl hover:shadow-blue-500/25",
    secondary:
      "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white shadow-lg hover:shadow-2xl hover:shadow-cyan-500/25",
    ghost:
      "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20",
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${className} px-6 py-2 rounded-full font-semibold text-sm whitespace-nowrap flex items-center justify-center`}
      {...props}
    >
      <span className="relative z-10 flex items-center">{children}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
    </button>
  );
}
