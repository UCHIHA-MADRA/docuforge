"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'red';

export interface ThemeConfig {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  fontSize: 'small' | 'medium' | 'large';
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  animations: boolean;
  highContrast: boolean;
}

export interface ThemeContextType {
  theme: ThemeConfig;
  actualTheme: 'light' | 'dark'; // Resolved theme (system preference resolved)
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
  toggleTheme: () => void;
  applyTheme: (config: ThemeConfig) => void;
}

const defaultTheme: ThemeConfig = {
  mode: 'system',
  colorScheme: 'blue',
  fontSize: 'medium',
  borderRadius: 'medium',
  animations: true,
  highContrast: false,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme storage key
const THEME_STORAGE_KEY = 'docuforge-theme';

// CSS custom properties for themes
const themeVariables = {
  light: {
    // Base colors
    '--background': '255 255 255',
    '--foreground': '15 23 42',
    '--card': '255 255 255',
    '--card-foreground': '15 23 42',
    '--popover': '255 255 255',
    '--popover-foreground': '15 23 42',
    '--primary': '59 130 246',
    '--primary-foreground': '255 255 255',
    '--secondary': '241 245 249',
    '--secondary-foreground': '15 23 42',
    '--muted': '241 245 249',
    '--muted-foreground': '100 116 139',
    '--accent': '241 245 249',
    '--accent-foreground': '15 23 42',
    '--destructive': '239 68 68',
    '--destructive-foreground': '255 255 255',
    '--border': '226 232 240',
    '--input': '226 232 240',
    '--ring': '59 130 246',
    '--success': '34 197 94',
    '--warning': '251 191 36',
    '--info': '59 130 246',
  },
  dark: {
    // Base colors - Dark blue/purple theme
    '--background': '15 23 42', // Dark blue
    '--foreground': '248 250 252', // Light gray/white
    '--card': '30 41 59', // Darker blue
    '--card-foreground': '248 250 252', // Light gray/white
    '--popover': '30 41 59', // Darker blue
    '--popover-foreground': '248 250 252', // Light gray/white
    '--primary': '147 51 234', // Purple
    '--primary-foreground': '255 255 255', // White
    '--secondary': '51 65 85', // Medium dark blue
    '--secondary-foreground': '248 250 252', // Light gray/white
    '--muted': '51 65 85', // Medium dark blue
    '--muted-foreground': '148 163 184', // Medium gray
    '--accent': '51 65 85', // Medium dark blue
    '--accent-foreground': '248 250 252', // Light gray/white
    '--destructive': '239 68 68', // Red
    '--destructive-foreground': '255 255 255', // White
    '--border': '51 65 85', // Medium dark blue
    '--input': '51 65 85', // Medium dark blue
    '--ring': '147 51 234', // Purple
    '--success': '34 197 94', // Green
    '--warning': '251 191 36', // Yellow
    '--info': '59 130 246', // Blue
  },
};

// Color scheme variations
const colorSchemes = {
  blue: {
    '--primary': '59 130 246',
    '--ring': '59 130 246',
  },
  green: {
    '--primary': '34 197 94',
    '--ring': '34 197 94',
  },
  purple: {
    '--primary': '147 51 234',
    '--ring': '147 51 234',
  },
  orange: {
    '--primary': '249 115 22',
    '--ring': '249 115 22',
  },
  red: {
    '--primary': '239 68 68',
    '--ring': '239 68 68',
  },
};

// Font size variations
const fontSizes = {
  small: {
    '--font-size-xs': '0.6875rem',
    '--font-size-sm': '0.8125rem',
    '--font-size-base': '0.875rem',
    '--font-size-lg': '1rem',
    '--font-size-xl': '1.125rem',
    '--font-size-2xl': '1.375rem',
  },
  medium: {
    '--font-size-xs': '0.75rem',
    '--font-size-sm': '0.875rem',
    '--font-size-base': '1rem',
    '--font-size-lg': '1.125rem',
    '--font-size-xl': '1.25rem',
    '--font-size-2xl': '1.5rem',
  },
  large: {
    '--font-size-xs': '0.875rem',
    '--font-size-sm': '1rem',
    '--font-size-base': '1.125rem',
    '--font-size-lg': '1.25rem',
    '--font-size-xl': '1.375rem',
    '--font-size-2xl': '1.625rem',
  },
};

// Border radius variations
const borderRadii = {
  none: {
    '--radius': '0px',
  },
  small: {
    '--radius': '0.25rem',
  },
  medium: {
    '--radius': '0.5rem',
  },
  large: {
    '--radius': '1rem',
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        const parsedTheme = JSON.parse(savedTheme) as ThemeConfig;
        setTheme(parsedTheme);
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }
    setMounted(true);
  }, []);

  // Handle system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme.mode === 'system') {
        const newActualTheme = mediaQuery.matches ? 'dark' : 'light';
        setActualTheme(newActualTheme);
      }
    };

    // Set initial theme
    if (theme.mode === 'system') {
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      setActualTheme(systemTheme);
    } else {
      const manualTheme = theme.mode === 'dark' ? 'dark' : 'light';
      setActualTheme(manualTheme);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme.mode, mounted]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    // Apply base theme variables
    const baseVariables = themeVariables[actualTheme];
    Object.entries(baseVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply color scheme
    const schemeVariables = colorSchemes[theme.colorScheme];
    Object.entries(schemeVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply font size
    const fontVariables = fontSizes[theme.fontSize];
    Object.entries(fontVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply border radius
    const radiusVariables = borderRadii[theme.borderRadius];
    Object.entries(radiusVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply high contrast mode
    if (theme.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply animations preference
    if (!theme.animations) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Apply theme class
    root.classList.remove('light', 'dark');
    root.classList.add(actualTheme);

    // Also set data-theme attribute for additional CSS targeting
    root.setAttribute('data-theme', actualTheme);

  }, [theme, actualTheme, mounted]);

  // Save theme to localStorage
  useEffect(() => {
    if (!mounted) return;
    
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }, [theme, mounted]);

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    setTheme(prev => ({ ...prev, ...updates }));
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
  };

  const toggleTheme = () => {
    const newMode = theme.mode === 'light' ? 'dark' : 'light';
    setTheme(prev => ({
      ...prev,
      mode: newMode
    }));
  };

  const applyTheme = (config: ThemeConfig) => {
    setTheme(config);
  };

  const value: ThemeContextType = {
    theme,
    actualTheme,
    updateTheme,
    resetTheme,
    toggleTheme,
    applyTheme,
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{
        theme: defaultTheme,
        actualTheme: 'light',
        updateTheme: () => {},
        resetTheme: () => {},
        toggleTheme: () => {},
        applyTheme: () => {},
      }}>
        <div style={{ visibility: 'hidden' }}>{children}</div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme preset configurations
export const themePresets: Record<string, ThemeConfig> = {
  'default-light': {
    mode: 'light',
    colorScheme: 'blue',
    fontSize: 'medium',
    borderRadius: 'medium',
    animations: true,
    highContrast: false,
  },
  'default-dark': {
    mode: 'dark',
    colorScheme: 'blue',
    fontSize: 'medium',
    borderRadius: 'medium',
    animations: true,
    highContrast: false,
  },
  'high-contrast': {
    mode: 'light',
    colorScheme: 'blue',
    fontSize: 'large',
    borderRadius: 'small',
    animations: false,
    highContrast: true,
  },
  'minimal': {
    mode: 'light',
    colorScheme: 'blue',
    fontSize: 'medium',
    borderRadius: 'none',
    animations: false,
    highContrast: false,
  },
  'vibrant': {
    mode: 'dark',
    colorScheme: 'purple',
    fontSize: 'medium',
    borderRadius: 'large',
    animations: true,
    highContrast: false,
  },
};