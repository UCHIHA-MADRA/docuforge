'use client';

import React, { useState, useCallback } from 'react';
import {
  Highlighter,
  MessageSquare,
  Stamp,
  PenTool,
  Type,
  Link,
  Palette,
  Undo,
  Redo,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Search,
  Download,
  Upload,
  Trash2,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AnnotationType,
  AnnotationColor,
  StampAnnotation,
  CommentAnnotation,
  PDFAnnotationManager,
  getDefaultAnnotationColor,
} from '@/lib/pdf-annotations';

interface AnnotationToolbarProps {
  annotationManager: PDFAnnotationManager;
  selectedTool: AnnotationType | null;
  onToolSelect: (tool: AnnotationType | null) => void;
  onColorChange: (color: AnnotationColor) => void;
  onOpacityChange: (opacity: number) => void;
  onStrokeWidthChange: (width: number) => void;
  currentColor: AnnotationColor;
  currentOpacity: number;
  currentStrokeWidth: number;
  isVisible: boolean;
  onVisibilityToggle: () => void;
  onSearchAnnotations: (query: string) => void;
  onExportAnnotations: () => void;
  onImportAnnotations: (file: File) => void;
  onClearAllAnnotations: () => void;
  className?: string;
}

const PRESET_COLORS: AnnotationColor[] = [
  { r: 1, g: 1, b: 0 }, // Yellow
  { r: 0, g: 1, b: 0 }, // Green
  { r: 1, g: 0, b: 0 }, // Red
  { r: 0, g: 0, b: 1 }, // Blue
  { r: 1, g: 0.5, b: 0 }, // Orange
  { r: 1, g: 0, b: 1 }, // Magenta
  { r: 0, g: 1, b: 1 }, // Cyan
  { r: 0, g: 0, b: 0 }, // Black
];

const STAMP_TYPES: { type: StampAnnotation['stampType']; label: string; icon: string }[] = [
  { type: 'approved', label: 'Approved', icon: '✓' },
  { type: 'rejected', label: 'Rejected', icon: '✗' },
  { type: 'draft', label: 'Draft', icon: '📝' },
  { type: 'confidential', label: 'Confidential', icon: '🔒' },
  { type: 'urgent', label: 'Urgent', icon: '⚡' },
  { type: 'custom', label: 'Custom', icon: '⭐' },
];

const COMMENT_ICONS: { type: CommentAnnotation['iconType']; label: string }[] = [
  { type: 'note', label: 'Note' },
  { type: 'comment', label: 'Comment' },
  { type: 'key', label: 'Key Point' },
  { type: 'help', label: 'Help' },
  { type: 'insert', label: 'Insert' },
  { type: 'paragraph', label: 'Paragraph' },
];

export function AnnotationToolbar({
  annotationManager,
  selectedTool,
  onToolSelect,
  onColorChange,
  onOpacityChange,
  onStrokeWidthChange,
  currentColor,
  currentOpacity,
  currentStrokeWidth,
  isVisible,
  onVisibilityToggle,
  onSearchAnnotations,
  onExportAnnotations,
  onImportAnnotations,
  onClearAllAnnotations,
  className = '',
}: AnnotationToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStampType, setSelectedStampType] = useState<StampAnnotation['stampType']>('approved');
  const [selectedCommentIcon, setSelectedCommentIcon] = useState<CommentAnnotation['iconType']>('note');
  const [customStampText, setCustomStampText] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const stats = annotationManager.getStatistics();

  const handleToolSelect = useCallback((tool: AnnotationType) => {
    if (selectedTool === tool) {
      onToolSelect(null); // Deselect if already selected
    } else {
      onToolSelect(tool);
      // Set default color for the tool
      const defaultColor = getDefaultAnnotationColor(tool);
      onColorChange(defaultColor);
    }
  }, [selectedTool, onToolSelect, onColorChange]);

  const handleColorSelect = useCallback((color: AnnotationColor) => {
    onColorChange(color);
    setShowColorPicker(false);
  }, [onColorChange]);

  const handleCustomColorChange = useCallback((component: 'r' | 'g' | 'b', value: number) => {
    const newColor = {
      ...currentColor,
      [component]: value / 255,
    };
    onColorChange(newColor);
  }, [currentColor, onColorChange]);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      onSearchAnnotations(searchQuery.trim());
    }
  }, [searchQuery, onSearchAnnotations]);

  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportAnnotations(file);
      event.target.value = ''; // Reset input
    }
  }, [onImportAnnotations]);

  const colorToHex = (color: AnnotationColor): string => {
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  };

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 p-3 bg-white border-b border-gray-200 shadow-sm ${className}`}>
        {/* Tool Selection */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedTool === 'highlight' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleToolSelect('highlight')}
              >
                <Highlighter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Highlight Text</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={selectedTool === 'comment' ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center gap-1"
              >
                <MessageSquare className="h-4 w-4" />
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {COMMENT_ICONS.map((icon) => (
                <DropdownMenuItem
                  key={icon.type}
                  onClick={() => {
                    setSelectedCommentIcon(icon.type);
                    handleToolSelect('comment');
                  }}
                >
                  {icon.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={selectedTool === 'stamp' ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center"
              >
                <span className="inline-flex items-center">
                  <span className="mr-1"><Stamp className="h-4 w-4" /></span>
                  <span><ChevronDown className="h-3 w-3" /></span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {STAMP_TYPES.map((stamp) => (
                <DropdownMenuItem
                  key={stamp.type}
                  onClick={() => {
                    setSelectedStampType(stamp.type);
                    handleToolSelect('stamp');
                  }}
                  className="flex items-center gap-2"
                >
                  <span>{stamp.icon}</span>
                  {stamp.label}
                </DropdownMenuItem>
              ))}
              {selectedStampType === 'custom' && (
                <div className="p-2 border-t">
                  <Input
                    placeholder="Custom text"
                    value={customStampText}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomStampText(e.target.value)}
                    className="text-xs"
                  />
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedTool === 'drawing' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleToolSelect('drawing')}
              >
                <PenTool className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Draw</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedTool === 'text' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleToolSelect('text')}
              >
                <Type className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Text</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedTool === 'link' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleToolSelect('link')}
              >
                <Link className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Link</TooltipContent>
          </Tooltip>
        </div>

        {/* Color and Style Controls */}
        <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
          <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                <Palette className="h-4 w-4" />
                <div
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: colorToHex(currentColor) }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Preset Colors</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {PRESET_COLORS.map((color, index) => (
                      <button
                        key={index}
                        className="w-8 h-8 rounded border border-gray-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: colorToHex(color) }}
                        onClick={() => handleColorSelect(color)}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Custom Color</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      <Label className="w-4 text-xs">R</Label>
                      <Slider
                        value={[Math.round(currentColor.r * 255)]}
                        onValueChange={([value]: [number]) => handleCustomColorChange('r', value)}
                        max={255}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-8 text-xs">{Math.round(currentColor.r * 255)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-4 text-xs">G</Label>
                      <Slider
                        value={[Math.round(currentColor.g * 255)]}
                        onValueChange={([value]: [number]) => handleCustomColorChange('g', value)}
                        max={255}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-8 text-xs">{Math.round(currentColor.g * 255)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-4 text-xs">B</Label>
                      <Slider
                        value={[Math.round(currentColor.b * 255)]}
                        onValueChange={([value]: [number]) => handleCustomColorChange('b', value)}
                        max={255}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-8 text-xs">{Math.round(currentColor.b * 255)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Opacity Control */}
          <div className="flex items-center gap-2">
            <Label className="text-xs">Opacity</Label>
            <Slider
              value={[currentOpacity * 100]}
              onValueChange={([value]: [number]) => onOpacityChange(value / 100)}
              max={100}
              step={5}
              className="w-16"
            />
            <span className="text-xs w-8">{Math.round(currentOpacity * 100)}%</span>
          </div>

          {/* Stroke Width (for drawing) */}
          {selectedTool === 'drawing' && (
            <div className="flex items-center gap-2">
              <Label className="text-xs">Width</Label>
              <Slider
                value={[currentStrokeWidth]}
                onValueChange={([value]: [number]) => onStrokeWidthChange(value)}
                min={1}
                max={20}
                step={1}
                className="w-16"
              />
              <span className="text-xs w-6">{currentStrokeWidth}</span>
            </div>
          )}
        </div>

        {/* History Controls */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => annotationManager.undo()}
                disabled={!annotationManager.canUndo()}
              >
                <Undo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => annotationManager.redo()}
                disabled={!annotationManager.canRedo()}
              >
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </div>

        {/* Visibility Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onVisibilityToggle}
            >
              {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isVisible ? 'Hide Annotations' : 'Show Annotations'}</TooltipContent>
        </Tooltip>

        {/* Search */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
          <Input
            placeholder="Search annotations..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
            className="w-40 h-8 text-xs"
          />
          <Button variant="ghost" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Statistics */}
        <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
          <Badge variant="secondary" className="text-xs">
            {stats.total} annotations
          </Badge>
          {stats.unresolved > 0 && (
            <Badge variant="destructive" className="text-xs">
              {stats.unresolved} unresolved
            </Badge>
          )}
        </div>

        {/* Settings and Actions */}
        <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onExportAnnotations}>
              <Download className="h-4 w-4 mr-2" />
              Export Annotations
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild>
              <label className="flex items-center cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Import Annotations
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={onClearAllAnnotations}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Annotations
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}

export default AnnotationToolbar;