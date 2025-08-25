"use client";

import React, { useState, useEffect } from "react";
import { FileText, Sun, Moon, Sparkles, Zap } from "lucide-react";
import { Navigation } from "./navigation";
import { MobileNavigation } from "./mobile-navigation";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface GlowingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "premium";
  className?: string;
  icon?: React.ReactNode;
}

const GlowingButton = ({
  children,
  variant = "primary",
  className = "",
  icon,
  ...props
}: GlowingButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseClasses =
    "relative overflow-hidden transition-all duration-300 transform hover:scale-105 group";

  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-2xl hover:shadow-blue-500/25",
    secondary:
      "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-2xl hover:shadow-emerald-500/25",
    ghost:
      "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:border-white/40",
    premium:
      "bg-gradient-to-r from-emerald-500 via-teal-500 to-pink-500 hover:from-emerald-600 hover:via-teal-600 hover:to-pink-600 text-white shadow-lg hover:shadow-2xl hover:shadow-teal-500/25",
  };

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        "px-6 py-2 rounded-full font-semibold text-sm whitespace-nowrap flex items-center justify-center",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => console.log('GlowingButton clicked')}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">
        {icon && (
          <span
            className={cn(
              "transition-transform duration-300",
              isHovered && "scale-110 rotate-12"
            )}
          >
            {icon}
          </span>
        )}
        {children}
      </span>

      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>

      {/* Particle effect for premium variant */}
      {variant === "premium" && isHovered && (
        <div className="absolute inset-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/60 rounded-full animate-ping"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 2) * 40}%`,
                animationDelay: `${i * 100}ms`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
      )}
    </button>
  );
};

const ThemeToggle = () => {
  const { actualTheme, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const isDarkMode = actualTheme === "dark";

  const handleToggle = () => {
    console.log('ThemeToggle clicked');
    setIsAnimating(true);
    toggleTheme();
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "p-2 rounded-full transition-all duration-300 backdrop-blur-sm border relative group",
        "bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40",
        "hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20",
        isAnimating && "scale-95"
      )}
      aria-label="Toggle theme"
    >
      <div
        className={cn(
          "transition-all duration-300",
          isAnimating && "rotate-180 scale-75"
        )}
      >
        {isDarkMode ? (
          <Sun className="h-5 w-5 text-white" />
        ) : (
          <Moon className="h-5 w-5 text-white" />
        )}
      </div>

      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"></div>
    </button>
  );
};

const Logo = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href="/"
      className="flex items-center space-x-3 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        {/* Main icon */}
        <FileText
          className={cn(
            "h-10 w-10 text-blue-400 transition-all duration-300 relative z-10",
            isHovered && "scale-110 rotate-3"
          )}
        />

        {/* Animated ping effect */}
        <div className="absolute inset-0 animate-ping">
          <FileText className="h-10 w-10 text-blue-400/20" />
        </div>

        {/* Additional glow on hover */}
        {isHovered && (
          <div className="absolute inset-0 animate-pulse">
            <FileText className="h-10 w-10 text-purple-400/40" />
          </div>
        )}

        {/* Sparkle effects - YELLOW REMOVED */}
        {isHovered && (
          <>
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-blue-300 animate-bounce" />
            <Sparkles className="absolute -bottom-1 -left-1 h-3 w-3 text-pink-300 animate-bounce delay-150" />
          </>
        )}
      </div>

      <span
        className={cn(
          "text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent transition-all duration-300",
          isHovered && "from-blue-300 to-pink-400 scale-105"
        )}
      >
        DocuForge
      </span>

      {/* Hover underline effect */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300",
          isHovered ? "w-full" : "w-0"
        )}
      ></div>
    </Link>
  );
};

const ScrollProgress = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollPx = document.documentElement.scrollTop;
      const winHeightPx =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scrolled = scrollPx / winHeightPx;
      setScrollProgress(scrolled * 100);
    };

    window.addEventListener("scroll", updateScrollProgress);
    return () => window.removeEventListener("scroll", updateScrollProgress);
  }, []);

  return (
    <div
      className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-150 ease-out"
      style={{ width: `${scrollProgress}%` }}
    />
  );
};

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "z-50 border-b sticky top-0 w-full transition-all duration-300",
        isScrolled
          ? "border-white/20 bg-black/40 backdrop-blur-2xl shadow-lg"
          : "border-white/10 bg-black/20 backdrop-blur-xl"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-3">
            <Logo />
          </div>

          <div className="flex items-center space-x-6">
            <Navigation />

            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="/login"
                className={cn(
                  "text-white/80 hover:text-white transition-all duration-300 font-medium relative group",
                  "hover:scale-105"
                )}
              >
                Sign In
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white/60 transition-all duration-300 group-hover:w-full"></span>
              </Link>

              <GlowingButton
                variant="premium"
                icon={<Zap className="h-4 w-4" />}
              >
                Get Started
              </GlowingButton>
            </div>

            <ThemeToggle />
            <MobileNavigation />
          </div>
        </div>
      </div>

      {/* Scroll progress indicator */}
      <ScrollProgress />

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-10px) rotate(1deg);
          }
          66% {
            transform: translateY(-5px) rotate(-1deg);
          }
        }

        @keyframes sparkle {
          0%,
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1.2) rotate(180deg);
            opacity: 0.8;
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }

        /* Custom scrollbar for the progress */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #2563eb, #7c3aed);
        }
      `}</style>
    </header>
  );
}
