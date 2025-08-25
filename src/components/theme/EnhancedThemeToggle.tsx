"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Settings } from 'lucide-react';
import ThemeSettings from './ThemeSettings';

interface EnhancedThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'icon';
  showLabel?: boolean;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
}

const EnhancedThemeToggle: React.FC<EnhancedThemeToggleProps> = ({
  variant = 'dropdown',
  showLabel = false,
  size = 'default',
  className = '',
}) => {
  const { theme, updateTheme, toggleTheme, actualTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) return null;

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

  // Settings modal
  if (showSettings) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
        >
          <ThemeSettings onClose={() => setShowSettings(false)} />
        </motion.div>
      </div>
    );
  }

  // Simple button variant
  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={toggleTheme}
        className={`flex items-center gap-2 ${className}`}
        title={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
        aria-label={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
      >
        <span className="sr-only">
          {actualTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        </span>
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 30 }}
          transition={{ duration: 0.2 }}
          className="flex items-center"
        >
          {actualTheme === 'light' ? (
            <>
              <Moon className="h-4 w-4 mr-2" />
              {showLabel && 'Dark mode'}
            </>
          ) : (
            <>
              <Sun className="h-4 w-4 mr-2" />
              {showLabel && 'Light mode'}
            </>
          )}
        </motion.div>
      </Button>
    );
  }

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className={`relative overflow-hidden ${className}`}
        title={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
        aria-label={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
      >
        <span className="sr-only">
          {actualTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        </span>
        <motion.div
          initial={false}
          animate={{ rotate: actualTheme === 'dark' ? 180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {actualTheme === 'light' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </motion.div>
      </Button>
    );
  }

  // Dropdown variant (default)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={`flex items-center gap-2 ${className}`}
          title={`Current theme: ${getThemeLabel()} (${actualTheme})`}
          aria-label="Change theme settings"
        >
          {theme.mode === 'light' && <Sun className="h-4 w-4" />}
          {theme.mode === 'dark' && <Moon className="h-4 w-4" />}
          {theme.mode === 'system' && <Monitor className="h-4 w-4" />}
          {showLabel && <span>{getThemeLabel()}</span>}
          <span className="sr-only">Select theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => updateTheme({ mode: 'light' })}
          className="flex items-center gap-2 cursor-pointer"
          aria-label="Light mode"
        >
          <Sun className="h-4 w-4" />
          <span>Light</span>
          {theme.mode === 'light' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateTheme({ mode: 'dark' })}
          className="flex items-center gap-2 cursor-pointer"
          aria-label="Dark mode"
        >
          <Moon className="h-4 w-4" />
          <span>Dark</span>
          {theme.mode === 'dark' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateTheme({ mode: 'system' })}
          className="flex items-center gap-2 cursor-pointer"
          aria-label="System theme"
        >
          <Monitor className="h-4 w-4" />
          <span>System</span>
          {theme.mode === 'system' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <div className="border-t my-1" />
        <DropdownMenuItem
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 cursor-pointer"
          aria-label="Customize theme"
        >
          <Settings className="h-4 w-4" />
          <span>Theme Settings</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EnhancedThemeToggle;