"use client";

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ThemeSettings from './ThemeSettings';

// Theme icons
const SunIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const MonitorIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  showLabel?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'dropdown', 
  showLabel = false, 
  size = 'default' 
}) => {
  const { theme, updateTheme, toggleTheme, actualTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  const getThemeIcon = () => {
    switch (theme.mode) {
      case 'light':
        return <SunIcon className="h-4 w-4" />;
      case 'dark':
        return <MoonIcon className="h-4 w-4" />;
      case 'system':
        return <MonitorIcon className="h-4 w-4" />;
      default:
        return <SunIcon className="h-4 w-4" />;
    }
  };

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

  if (showSettings) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <ThemeSettings onClose={() => setShowSettings(false)} />
        </div>
      </div>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={toggleTheme}
        className="flex items-center gap-2"
        title={`Current theme: ${getThemeLabel()} (${actualTheme})`}
      >
        {getThemeIcon()}
        {showLabel && <span>{getThemeLabel()}</span>}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className="flex items-center gap-2"
          title={`Current theme: ${getThemeLabel()} (${actualTheme})`}
        >
          {getThemeIcon()}
          {showLabel && <span>{getThemeLabel()}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => updateTheme({ mode: 'light' })}
          className="flex items-center gap-2"
        >
          <SunIcon className="h-4 w-4" />
          <span>Light</span>
          {theme.mode === 'light' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateTheme({ mode: 'dark' })}
          className="flex items-center gap-2"
        >
          <MoonIcon className="h-4 w-4" />
          <span>Dark</span>
          {theme.mode === 'dark' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateTheme({ mode: 'system' })}
          className="flex items-center gap-2"
        >
          <MonitorIcon className="h-4 w-4" />
          <span>System</span>
          {theme.mode === 'system' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <div className="border-t my-1" />
        <DropdownMenuItem
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2"
        >
          <SettingsIcon className="h-4 w-4" />
          <span>Theme Settings</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;

// Quick theme switcher component for mobile
export const MobileThemeToggle: React.FC = () => {
  const { toggleTheme, actualTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="flex items-center gap-2 md:hidden"
      title={`Switch theme (currently ${actualTheme})`}
    >
      {actualTheme === 'light' ? (
        <MoonIcon className="h-4 w-4" />
      ) : (
        <SunIcon className="h-4 w-4" />
      )}
    </Button>
  );
};

// Theme status indicator
export const ThemeStatusIndicator: React.FC = () => {
  const { theme, actualTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {actualTheme === 'light' ? (
        <SunIcon className="h-3 w-3" />
      ) : (
        <MoonIcon className="h-3 w-3" />
      )}
      <span>
        {actualTheme === 'light' ? 'Light' : 'Dark'} mode
        {theme.mode === 'system' && ' (auto)'}
      </span>
    </div>
  );
};