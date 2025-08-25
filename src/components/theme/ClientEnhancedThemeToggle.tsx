"use client";

import { Suspense, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

interface ClientEnhancedThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'icon';
  showLabel?: boolean;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
}

export default function ClientEnhancedThemeToggle(props: ClientEnhancedThemeToggleProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on client side
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || 
        (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Update DOM
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
  };

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) return null;

  // Icon-only variant (default)
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className={props.className}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">
        {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
    </Button>
  );
}