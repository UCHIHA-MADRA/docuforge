"use client";

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ClientEnhancedThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'icon';
  showLabel?: boolean;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
}

export default function ClientEnhancedThemeToggle(props: ClientEnhancedThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { theme, updateTheme, actualTheme } = useTheme();

  // Ensure component is mounted before rendering interactive UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className={props.className}
        disabled
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

    // Get the appropriate icon based on current theme mode
    const getThemeIcon = () => {
      if (isLoading) {
        return <Loader2 className="h-4 w-4 animate-spin" />;
      }
      
      switch (theme.mode) {
        case 'light':
          return <Sun className="h-4 w-4" />;
        case 'dark':
          return <Moon className="h-4 w-4" />;
        case 'system':
          return <Monitor className="h-4 w-4" />;
        default:
          return <Sun className="h-4 w-4" />;
      }
    };

    // Get the label for the current theme mode
    const getThemeLabel = () => {
      switch (theme.mode) {
        case 'light':
          return 'Light';
        case 'dark':
          return 'Dark';
        case 'system':
          return 'System';
        default:
          return 'Light';
      }
    };

  // Toggle between light and dark
  const toggleTheme = async () => {
    setIsLoading(true);
    const newMode = theme.mode === 'light' ? 'dark' : 'light';
    updateTheme({ mode: newMode });
    await new Promise(resolve => setTimeout(resolve, 100));
    setIsLoading(false);
  };

  // Icon-only variant (default)
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className={props.className}
      disabled={isLoading}
      aria-label={`Switch theme (currently ${getThemeLabel()})`}
      title={`Current theme: ${getThemeLabel()} (${actualTheme})`}
    >
      {getThemeIcon()}
      <span className="sr-only">
        Switch theme (currently {getThemeLabel()})
      </span>
    </Button>
  );
}