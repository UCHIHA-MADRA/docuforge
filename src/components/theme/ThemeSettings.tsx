"use client";

import React, { useState } from 'react';
import { useTheme, ThemeConfig, ColorScheme, themePresets } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

const PaletteIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3H5a2 2 0 00-2 2v12a4 4 0 004 4h2a2 2 0 002-2V5a2 2 0 00-2-2z" />
  </svg>
);

const TypeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V4a1 1 0 011-1h5M4 7H2m2 0h8m6-3v3M6 20v-6a2 2 0 012-2h8a2 2 0 012 2v6M6 20H4a1 1 0 01-1-1v-3M6 20h12M18 20h2a1 1 0 001-1v-3m-3 4v-6" />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

interface ThemeSettingsProps {
  onClose?: () => void;
}

const ThemeSettings: React.FC<ThemeSettingsProps> = ({ onClose }) => {
  const { theme, updateTheme, resetTheme, applyTheme, actualTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'appearance' | 'accessibility' | 'presets'>('appearance');

  const colorSchemeOptions: { value: ColorScheme; label: string; color: string }[] = [
    { value: 'blue', label: 'Blue', color: 'rgb(59 130 246)' },
    { value: 'green', label: 'Green', color: 'rgb(34 197 94)' },
    { value: 'purple', label: 'Purple', color: 'rgb(147 51 234)' },
    { value: 'orange', label: 'Orange', color: 'rgb(249 115 22)' },
    { value: 'red', label: 'Red', color: 'rgb(239 68 68)' },
  ];

  const handlePresetApply = (presetKey: string) => {
    const preset = themePresets[presetKey];
    if (preset) {
      applyTheme(preset);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Theme Settings
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Customize the appearance and accessibility of your workspace
            </p>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            <Button
              variant={activeTab === 'appearance' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('appearance')}
              className="flex-1"
            >
              <PaletteIcon className="h-4 w-4 mr-2" />
              Appearance
            </Button>
            <Button
              variant={activeTab === 'accessibility' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('accessibility')}
              className="flex-1"
            >
              <TypeIcon className="h-4 w-4 mr-2" />
              Accessibility
            </Button>
            <Button
              variant={activeTab === 'presets' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('presets')}
              className="flex-1"
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Presets
            </Button>
          </div>

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Theme Mode */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Theme Mode</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={theme.mode === 'light' ? 'default' : 'outline'}
                    onClick={() => updateTheme({ mode: 'light' })}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <SunIcon className="h-6 w-6" />
                    <span>Light</span>
                  </Button>
                  <Button
                    variant={theme.mode === 'dark' ? 'default' : 'outline'}
                    onClick={() => updateTheme({ mode: 'dark' })}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <MoonIcon className="h-6 w-6" />
                    <span>Dark</span>
                  </Button>
                  <Button
                    variant={theme.mode === 'system' ? 'default' : 'outline'}
                    onClick={() => updateTheme({ mode: 'system' })}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <MonitorIcon className="h-6 w-6" />
                    <span>System</span>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Current: {actualTheme === 'light' ? 'Light' : 'Dark'} mode
                  {theme.mode === 'system' && ' (following system preference)'}
                </p>
              </div>

              {/* Color Scheme */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Color Scheme</Label>
                <div className="grid grid-cols-5 gap-3">
                  {colorSchemeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={theme.colorScheme === option.value ? 'default' : 'outline'}
                      onClick={() => updateTheme({ colorScheme: option.value })}
                      className="flex flex-col items-center gap-2 h-auto py-4"
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: option.color }}
                      />
                      <span className="text-xs">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Border Radius */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Border Radius</Label>
                <div className="grid grid-cols-4 gap-3">
                  {(['none', 'small', 'medium', 'large'] as const).map((radius) => (
                    <Button
                      key={radius}
                      variant={theme.borderRadius === radius ? 'default' : 'outline'}
                      onClick={() => updateTheme({ borderRadius: radius })}
                      className="capitalize"
                    >
                      {radius}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Accessibility Tab */}
          {activeTab === 'accessibility' && (
            <div className="space-y-6">
              {/* Font Size */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Font Size</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <Button
                      key={size}
                      variant={theme.fontSize === size ? 'default' : 'outline'}
                      onClick={() => updateTheme({ fontSize: size })}
                      className="capitalize"
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              {/* High Contrast */}
              <div className="space-y-3">
                <Label className="text-base font-medium">High Contrast</Label>
                <div className="flex items-center space-x-3">
                  <Button
                    variant={theme.highContrast ? 'default' : 'outline'}
                    onClick={() => updateTheme({ highContrast: !theme.highContrast })}
                    className="flex items-center"
                  >
                    <span className="inline-flex items-center">
                      <span>{theme.highContrast ? 'Enabled' : 'Disabled'}</span>
                    </span>
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Increases contrast for better visibility
                  </p>
                </div>
              </div>

              {/* Animations */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Animations</Label>
                <div className="flex items-center space-x-3">
                  <Button
                    variant={theme.animations ? 'default' : 'outline'}
                    onClick={() => updateTheme({ animations: !theme.animations })}
                    className="flex items-center"
                  >
                    <span className="inline-flex items-center">
                      <span>{theme.animations ? 'Enabled' : 'Disabled'}</span>
                    </span>
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Controls interface animations and transitions
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Presets Tab */}
          {activeTab === 'presets' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Theme Presets</Label>
                <p className="text-sm text-muted-foreground">
                  Quick configurations for different use cases
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(themePresets).map(([key, preset]) => (
                  <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handlePresetApply(key)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">{key.replace('-', ' ')}</h4>
                        <div className="flex items-center gap-1">
                          {preset.mode === 'light' && <SunIcon className="h-4 w-4" />}
                          {preset.mode === 'dark' && <MoonIcon className="h-4 w-4" />}
                          {preset.mode === 'system' && <MonitorIcon className="h-4 w-4" />}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Mode: {preset.mode}</p>
                        <p>Color: {preset.colorScheme}</p>
                        <p>Size: {preset.fontSize}</p>
                        {preset.highContrast && <p>High contrast enabled</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={resetTheme}>
              Reset to Default
            </Button>
            <div className="text-sm text-muted-foreground">
              Changes are saved automatically
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThemeSettings;