'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Plus,
  Minus,
  Save,
  Download,
  Search,
  Undo,
  Redo,
  Trash2,
  Move,
  Edit3,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings,
  Files,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PDFProcessor, { TextElement, FormattingOptions, PDFEditOperation, PDFMetadata } from '@/lib/pdf-processor';
import { PDFAnnotationManager, Annotation, AnnotationType } from '@/lib/pdf-annotations';
import AnnotationToolbar from './AnnotationToolbar';
import AnnotationCanvas from './AnnotationCanvas';
import AnnotationSidebar from './AnnotationSidebar';
import PageManager from './PageManager';

interface PDFEditorProps {
  pdfBuffer?: Uint8Array;
  onSave?: (pdfBuffer: Uint8Array) => void;
  onError?: (error: string) => void;
  className?: string;
  enableAnnotations?: boolean;
}

interface EditorState {
  selectedElement: TextElement | null;
  isEditing: boolean;
  editingText: string;
  zoom: number;
  currentPage: number;
  searchQuery: string;
  searchResults: TextElement[];
  undoStack: PDFEditOperation[][];
  redoStack: PDFEditOperation[][];
  showAnnotationSidebar: boolean;
  showPageManager: boolean;
  selectedAnnotationTool: AnnotationType | null;
}

const PDFEditor: React.FC<PDFEditorProps> = ({
  pdfBuffer,
  onSave,
  onError,
  className = '',
  enableAnnotations = true,
}) => {
  const [processor] = useState(() => new PDFProcessor());
  const [annotationManager] = useState(() => new PDFAnnotationManager());
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [metadata, setMetadata] = useState<PDFMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    selectedElement: null,
    isEditing: false,
    editingText: '',
    zoom: 100,
    currentPage: 0,
    searchQuery: '',
    searchResults: [],
    undoStack: [],
    redoStack: [],
    showAnnotationSidebar: false,
    showPageManager: false,
    selectedAnnotationTool: null,
  });
  const [annotationSettings, setAnnotationSettings] = useState({
    currentColor: { r: 1, g: 1, b: 0 }, // Yellow
    currentOpacity: 0.5,
    currentStrokeWidth: 2,
    isVisible: true,
  });
  const [formatting, setFormatting] = useState<FormattingOptions>({
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: { r: 0, g: 0, b: 0 },
    bold: false,
    italic: false,
    underline: false,
    alignment: 'left',
    lineHeight: 1.2,
  });
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF on mount or when pdfBuffer changes
  useEffect(() => {
    if (pdfBuffer) {
      loadPDF(pdfBuffer);
    } else {
      createNewPDF();
    }
  }, [pdfBuffer]);

  const loadPDF = async (buffer: Uint8Array) => {
    setLoading(true);
    setError(null);

    try {
      const result = await processor.loadPDF(buffer);
      if (result.success) {
        setTextElements(result.textElements || []);
        setMetadata(result.metadata || null);
        renderPDF();
      } else {
        throw new Error(result.error || 'Failed to load PDF');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createNewPDF = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await processor.createNewPDF();
      if (result.success) {
        setTextElements(result.textElements || []);
        setMetadata(result.metadata || null);
        renderPDF();
      } else {
        throw new Error(result.error || 'Failed to create PDF');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create PDF';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderPDF = useCallback(() => {
    // This would render the PDF on canvas
    // In a real implementation, you'd use PDF.js or similar library
    // For now, we'll just render text elements as overlays
    if (!canvasRef.current || !metadata) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on PDF page size and zoom
    const scale = editorState.zoom / 100;
    canvas.width = metadata.pageSize.width * scale;
    canvas.height = metadata.pageSize.height * scale;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text elements for current page
    const pageElements = textElements.filter(el => el.pageIndex === editorState.currentPage);
    pageElements.forEach(element => {
      drawTextElement(ctx, element, scale);
    });
  }, [textElements, metadata, editorState.zoom, editorState.currentPage]);

  const drawTextElement = (ctx: CanvasRenderingContext2D, element: TextElement, scale: number) => {
    ctx.save();
    
    // Set font
    let fontStyle = '';
    if (element.italic) fontStyle += 'italic ';
    if (element.bold) fontStyle += 'bold ';
    ctx.font = `${fontStyle}${element.fontSize * scale}px ${element.fontFamily}`;
    
    // Set color
    ctx.fillStyle = `rgb(${element.color.r * 255}, ${element.color.g * 255}, ${element.color.b * 255})`;
    
    // Draw text
    const x = element.x * scale;
    const y = element.y * scale;
    ctx.fillText(element.content, x, y);
    
    // Draw underline if needed
    if (element.underline) {
      const textWidth = ctx.measureText(element.content).width;
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x + textWidth, y + 2);
      ctx.stroke();
    }
    
    // Highlight selected element
    if (editorState.selectedElement?.id === element.id) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - element.height * scale - 2, element.width * scale + 4, element.height * scale + 4);
    }
    
    ctx.restore();
  };

  // Re-render when dependencies change
  useEffect(() => {
    renderPDF();
  }, [renderPDF]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !metadata) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = editorState.zoom / 100;
    
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    // Find clicked text element
    const pageElements = textElements.filter(el => el.pageIndex === editorState.currentPage);
    const clickedElement = pageElements.find(element => 
      x >= element.x && x <= element.x + element.width &&
      y >= element.y - element.height && y <= element.y
    );

    if (clickedElement) {
      selectElement(clickedElement);
    } else {
      // Create new text element
      addTextElement(x, y);
    }
  };

  const selectElement = (element: TextElement) => {
    setEditorState(prev => ({
      ...prev,
      selectedElement: element,
      isEditing: false,
      editingText: element.content,
    }));
    
    // Update formatting state
    setFormatting({
      fontSize: element.fontSize,
      fontFamily: element.fontFamily,
      color: element.color,
      bold: element.bold,
      italic: element.italic,
      underline: element.underline,
      alignment: element.alignment,
      lineHeight: element.lineHeight,
    });
  };

  const addTextElement = async (x: number, y: number) => {
    try {
      const elementId = await processor.addTextElement(
        'New Text',
        x,
        y,
        editorState.currentPage,
        formatting
      );
      
      // Update text elements
      const updatedElements = processor.getTextElements();
      setTextElements(updatedElements);
      
      // Select the new element
      const newElement = updatedElements.find(el => el.id === elementId);
      if (newElement) {
        selectElement(newElement);
        startEditing();
      }
      
      // Add to undo stack
      addToUndoStack([{ type: 'add', elementId, data: newElement }]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add text element';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const startEditing = () => {
    if (!editorState.selectedElement) return;
    
    setEditorState(prev => ({
      ...prev,
      isEditing: true,
      editingText: prev.selectedElement?.content || '',
    }));
  };

  const finishEditing = async () => {
    if (!editorState.selectedElement || !editorState.isEditing) return;

    try {
      const success = await processor.editTextElement(editorState.selectedElement.id, {
        content: editorState.editingText,
      });
      
      if (success) {
        const updatedElements = processor.getTextElements();
        setTextElements(updatedElements);
        
        setEditorState(prev => ({
          ...prev,
          isEditing: false,
          selectedElement: updatedElements.find(el => el.id === prev.selectedElement?.id) || null,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update text';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const deleteSelectedElement = async () => {
    if (!editorState.selectedElement) return;

    try {
      const success = await processor.deleteTextElement(editorState.selectedElement.id);
      
      if (success) {
        const updatedElements = processor.getTextElements();
        setTextElements(updatedElements);
        
        setEditorState(prev => ({
          ...prev,
          selectedElement: null,
          isEditing: false,
        }));
        
        // Add to undo stack
        addToUndoStack([{ type: 'delete', elementId: editorState.selectedElement.id }]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete element';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const applyFormatting = async (newFormatting: Partial<FormattingOptions>) => {
    if (!editorState.selectedElement) return;

    const updatedFormatting = { ...formatting, ...newFormatting };
    setFormatting(updatedFormatting);

    try {
      const success = await processor.formatTextElement(editorState.selectedElement.id, updatedFormatting);
      
      if (success) {
        const updatedElements = processor.getTextElements();
        setTextElements(updatedElements);
        
        setEditorState(prev => ({
          ...prev,
          selectedElement: updatedElements.find(el => el.id === prev.selectedElement?.id) || null,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply formatting';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const searchText = () => {
    if (!editorState.searchQuery.trim()) {
      setEditorState(prev => ({ ...prev, searchResults: [] }));
      return;
    }

    const results = processor.searchText(editorState.searchQuery);
    setEditorState(prev => ({ ...prev, searchResults: results }));
  };

  const addToUndoStack = (operations: PDFEditOperation[]) => {
    setEditorState(prev => ({
      ...prev,
      undoStack: [...prev.undoStack, operations],
      redoStack: [], // Clear redo stack when new operation is added
    }));
  };

  const undo = async () => {
    if (editorState.undoStack.length === 0) return;

    const lastOperations = editorState.undoStack[editorState.undoStack.length - 1];
    
    // Create reverse operations for redo
    const reverseOperations: PDFEditOperation[] = lastOperations.map(op => {
      switch (op.type) {
        case 'add':
          return { type: 'delete', elementId: op.elementId };
        case 'delete':
          return { type: 'add', elementId: op.elementId, data: op.data };
        case 'edit':
          // Would need to store original data for proper undo
          return { type: 'edit', elementId: op.elementId, data: op.data };
        default:
          return op;
      }
    });

    try {
      await processor.applyBatchOperations(reverseOperations);
      const updatedElements = processor.getTextElements();
      setTextElements(updatedElements);
      
      setEditorState(prev => ({
        ...prev,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, reverseOperations],
        selectedElement: null,
      }));
    } catch (err) {
      console.error('Undo failed:', err);
    }
  };

  const redo = async () => {
    if (editorState.redoStack.length === 0) return;

    const operations = editorState.redoStack[editorState.redoStack.length - 1];
    
    try {
      await processor.applyBatchOperations(operations);
      const updatedElements = processor.getTextElements();
      setTextElements(updatedElements);
      
      setEditorState(prev => ({
        ...prev,
        redoStack: prev.redoStack.slice(0, -1),
        undoStack: [...prev.undoStack, operations],
        selectedElement: null,
      }));
    } catch (err) {
      console.error('Redo failed:', err);
    }
  };

  const savePDF = async () => {
    try {
      const result = await processor.exportPDF();
      if (result.success && result.data) {
        onSave?.(result.data);
      } else {
        throw new Error(result.error || 'Failed to save PDF');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save PDF';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const downloadPDF = async () => {
    try {
      const result = await processor.exportPDF();
      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${metadata?.title || 'document'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error(result.error || 'Failed to export PDF');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download PDF';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const changePage = (direction: 'prev' | 'next') => {
    if (!metadata) return;
    
    const newPage = direction === 'prev' 
      ? Math.max(0, editorState.currentPage - 1)
      : Math.min(metadata.pageCount - 1, editorState.currentPage + 1);
    
    setEditorState(prev => ({
      ...prev,
      currentPage: newPage,
      selectedElement: null,
      isEditing: false,
    }));
  };

  const changeZoom = (newZoom: number) => {
    setEditorState(prev => ({ ...prev, zoom: Math.max(25, Math.min(400, newZoom)) }));
  };

  // Annotation handlers
  const handleAnnotationToolSelect = (tool: AnnotationType | null) => {
    setEditorState(prev => ({ ...prev, selectedAnnotationTool: tool }));
  };

  const handleAnnotationCreate = (annotation: Omit<Annotation, 'id' | 'createdAt' | 'modifiedAt'>) => {
    const newAnnotation = annotationManager.addAnnotation(annotation);
setAnnotations(annotationManager.getAnnotations());
    return newAnnotation;
  };

  const handleAnnotationUpdate = (id: string, updates: Partial<Annotation>) => {
    const success = annotationManager.updateAnnotation(id, updates);
    if (success) {
      setAnnotations(annotationManager.getAnnotations());
    }
    return success;
  };

  const handleAnnotationDelete = (id: string) => {
    const success = annotationManager.deleteAnnotation(id);
    if (success) {
      setAnnotations(annotationManager.getAnnotations());
    }
    return success;
  };

  const toggleAnnotationSidebar = () => {
    setEditorState(prev => ({ ...prev, showAnnotationSidebar: !prev.showAnnotationSidebar }));
  };

  const handleColorChange = (color: { r: number; g: number; b: number }) => {
    setAnnotationSettings(prev => ({ ...prev, currentColor: color }));
  };

  const handleOpacityChange = (opacity: number) => {
    setAnnotationSettings(prev => ({ ...prev, currentOpacity: opacity }));
  };

  const handleStrokeWidthChange = (width: number) => {
    setAnnotationSettings(prev => ({ ...prev, currentStrokeWidth: width }));
  };

  const handleVisibilityToggle = () => {
    setAnnotationSettings(prev => ({ ...prev, isVisible: !prev.isVisible }));
  };

  const handleSearchAnnotations = (query: string) => {
    // TODO: Implement annotation search
    console.log('Search annotations:', query);
  };

  const handleExportAnnotations = () => {
    // TODO: Implement annotation export
    console.log('Export annotations');
  };

  const handleImportAnnotations = (file: File) => {
    // TODO: Implement annotation import
    console.log('Import annotations:', file.name);
  };

  const handleClearAllAnnotations = () => {
    setAnnotations([]);
  };

  const handlePagesUpdated = useCallback(async () => {
    try {
      const newMetadata = await processor.getMetadata();
      setMetadata(newMetadata);
      const newTextElements = await processor.getAllTextElements();
      setTextElements(newTextElements);
    } catch (error) {
      console.error('Failed to update pages:', error);
    }
  }, [processor]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`flex flex-col h-full ${className}`}>
        {/* Toolbar */}
        <div className="border-b bg-background p-4 space-y-4">
          {/* Main Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={savePDF} size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button onClick={downloadPDF} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={undo} 
                  variant="outline" 
                  size="sm" 
                  disabled={editorState.undoStack.length === 0}
                >
                  <Undo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={redo} 
                  variant="outline" 
                  size="sm" 
                  disabled={editorState.redoStack.length === 0}
                >
                  <Redo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="h-6" />
            <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Search Text</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search for text..."
                      value={editorState.searchQuery}
                      onChange={(e) => setEditorState(prev => ({ ...prev, searchQuery: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && searchText()}
                    />
                    <Button onClick={searchText}>Search</Button>
                  </div>
                  {editorState.searchResults.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Found {editorState.searchResults.length} results
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {editorState.searchResults.map(result => (
                          <div
                            key={result.id}
                            className="p-2 border rounded cursor-pointer hover:bg-muted"
                            onClick={() => {
                              setEditorState(prev => ({ ...prev, currentPage: result.pageIndex }));
                              selectElement(result);
                              setShowSearchDialog(false);
                            }}
                          >
                            <p className="text-sm font-medium truncate">{result.content}</p>
                            <p className="text-xs text-muted-foreground">Page {result.pageIndex + 1}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setEditorState(prev => ({ ...prev, showPageManager: !prev.showPageManager }))}
                  variant={editorState.showPageManager ? "default" : "outline"}
                  size="sm"
                >
                  <Files className="w-4 h-4 mr-2" />
                  Pages
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Page Manager</TooltipContent>
            </Tooltip>
          </div>

          {/* Formatting Controls */}
          {editorState.selectedElement && (
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={formatting.fontFamily}
                onValueChange={(value: string) => applyFormatting({ fontFamily: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times-Roman">Times</SelectItem>
                  <SelectItem value="Courier">Courier</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                type="number"
                value={formatting.fontSize}
                onChange={(e) => applyFormatting({ fontSize: parseInt(e.target.value) || 12 })}
                className="w-16"
                min="8"
                max="72"
              />
              
              <Separator orientation="vertical" className="h-6" />
              
              <Toggle
                pressed={formatting.bold}
                onPressedChange={(pressed: boolean) => applyFormatting({ bold: pressed })}
                size="sm"
              >
                <Bold className="w-4 h-4" />
              </Toggle>
              
              <Toggle
                pressed={formatting.italic}
                onPressedChange={(pressed: boolean) => applyFormatting({ italic: pressed })}
                size="sm"
              >
                <Italic className="w-4 h-4" />
              </Toggle>
              
              <Toggle
                pressed={formatting.underline}
                onPressedChange={(pressed: boolean) => applyFormatting({ underline: pressed })}
                size="sm"
              >
                <Underline className="w-4 h-4" />
              </Toggle>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Toggle
                pressed={formatting.alignment === 'left'}
                onPressedChange={() => applyFormatting({ alignment: 'left' })}
                size="sm"
              >
                <AlignLeft className="w-4 h-4" />
              </Toggle>
              
              <Toggle
                pressed={formatting.alignment === 'center'}
                onPressedChange={() => applyFormatting({ alignment: 'center' })}
                size="sm"
              >
                <AlignCenter className="w-4 h-4" />
              </Toggle>
              
              <Toggle
                pressed={formatting.alignment === 'right'}
                onPressedChange={() => applyFormatting({ alignment: 'right' })}
                size="sm"
              >
                <AlignRight className="w-4 h-4" />
              </Toggle>
              
              <Separator orientation="vertical" className="h-6" />
              
              {editorState.isEditing ? (
                <Button onClick={finishEditing} size="sm">
                  Done
                </Button>
              ) : (
                <Button onClick={startEditing} variant="outline" size="sm">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              
              <Button onClick={deleteSelectedElement} variant="destructive" size="sm">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Annotation Toolbar */}
        {enableAnnotations && (
          <AnnotationToolbar
            annotationManager={annotationManager}
            selectedTool={editorState.selectedAnnotationTool}
            onToolSelect={handleAnnotationToolSelect}
            onColorChange={handleColorChange}
            onOpacityChange={handleOpacityChange}
            onStrokeWidthChange={handleStrokeWidthChange}
            currentColor={annotationSettings.currentColor}
            currentOpacity={annotationSettings.currentOpacity}
            currentStrokeWidth={annotationSettings.currentStrokeWidth}
            isVisible={annotationSettings.isVisible}
            onVisibilityToggle={handleVisibilityToggle}
            onSearchAnnotations={handleSearchAnnotations}
            onExportAnnotations={handleExportAnnotations}
            onImportAnnotations={handleImportAnnotations}
            onClearAllAnnotations={handleClearAllAnnotations}
          />
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex">
          {/* Canvas Area */}
          <div className="flex-1 overflow-auto bg-gray-100 p-4" ref={containerRef}>
            <div className="bg-white shadow-lg mx-auto" style={{ width: 'fit-content' }}>
              {enableAnnotations ? (
                <AnnotationCanvas
                  pageIndex={editorState.currentPage}
                  width={canvasRef.current?.width || 800}
                  height={canvasRef.current?.height || 600}
                  scale={editorState.zoom / 100}
                  annotationManager={annotationManager}
                  selectedTool={editorState.selectedAnnotationTool}
                  currentColor={annotationSettings.currentColor}
                  currentOpacity={annotationSettings.currentOpacity}
                  currentStrokeWidth={annotationSettings.currentStrokeWidth}
                  isVisible={annotationSettings.isVisible}
                  userId="current-user"
                  onAnnotationSelect={(annotation) => console.log('Selected annotation:', annotation)}
                  onAnnotationCreate={handleAnnotationCreate}
                  onAnnotationUpdate={handleAnnotationUpdate}
                  onAnnotationDelete={handleAnnotationDelete}
                />
              ) : (
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="cursor-crosshair"
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                />
              )}
              
              {/* Text Input Overlay */}
              {editorState.isEditing && editorState.selectedElement && (
                <div
                  className="absolute bg-white border-2 border-primary rounded p-1"
                  style={{
                    left: editorState.selectedElement.x * (editorState.zoom / 100),
                    top: editorState.selectedElement.y * (editorState.zoom / 100) - editorState.selectedElement.height * (editorState.zoom / 100),
                    fontSize: editorState.selectedElement.fontSize * (editorState.zoom / 100),
                    fontFamily: editorState.selectedElement.fontFamily,
                    minWidth: 100,
                  }}
                >
                  <Textarea
                    value={editorState.editingText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditorState(prev => ({ ...prev, editingText: e.target.value }))}
                    onBlur={finishEditing}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        finishEditing();
                      }
                    }}
                    className="border-none resize-none p-0 min-h-0"
                    autoFocus
                    rows={1}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l bg-background">
            {enableAnnotations && editorState.showAnnotationSidebar ? (
              <AnnotationSidebar
                annotationManager={annotationManager}
                selectedAnnotation={selectedAnnotation}
                onAnnotationSelect={setSelectedAnnotation}
                onAnnotationUpdate={handleAnnotationUpdate}
                onAnnotationDelete={handleAnnotationDelete}
                onPageNavigate={(pageIndex) => setEditorState(prev => ({ ...prev, currentPage: pageIndex }))}
                currentUserId="current-user"
                users={[{ id: "current-user", name: "Current User" }]}
              />
            ) : editorState.showPageManager ? (
              <PageManager
                processor={processor}
                metadata={metadata}
                currentPage={editorState.currentPage}
                onPageChange={(pageIndex) => setEditorState(prev => ({ ...prev, currentPage: pageIndex }))}
                onPagesUpdated={handlePagesUpdated}
              />
            ) : (
              <div className="p-4 space-y-6">
            {/* Page Navigation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Pages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Button 
                    onClick={() => changePage('prev')} 
                    variant="outline" 
                    size="sm"
                    disabled={editorState.currentPage === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    {editorState.currentPage + 1} / {metadata?.pageCount || 1}
                  </span>
                  <Button 
                    onClick={() => changePage('next')} 
                    variant="outline" 
                    size="sm"
                    disabled={editorState.currentPage >= (metadata?.pageCount || 1) - 1}
                  >
                    Next
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => processor.addPage()} variant="outline" size="sm" className="flex-1">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Page
                  </Button>
                  <Button 
                    onClick={() => processor.deletePage(editorState.currentPage)} 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    disabled={(metadata?.pageCount || 1) <= 1}
                  >
                    <Minus className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Zoom Controls */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Zoom</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => changeZoom(editorState.zoom - 25)} 
                    variant="outline" 
                    size="sm"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium flex-1 text-center">
                    {editorState.zoom}%
                  </span>
                  <Button 
                    onClick={() => changeZoom(editorState.zoom + 25)} 
                    variant="outline" 
                    size="sm"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
                <Slider
                  value={[editorState.zoom]}
                  onValueChange={([value]: number[]) => changeZoom(value)}
                  min={25}
                  max={400}
                  step={25}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Text Elements */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Text Elements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {textElements
                    .filter(el => el.pageIndex === editorState.currentPage)
                    .map(element => (
                      <div
                        key={element.id}
                        className={`p-2 border rounded cursor-pointer hover:bg-muted ${
                          editorState.selectedElement?.id === element.id ? 'bg-primary/10 border-primary' : ''
                        }`}
                        onClick={() => selectElement(element)}
                      >
                        <p className="text-sm font-medium truncate">{element.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {element.fontSize}px {element.fontFamily}
                        </p>
                      </div>
                    ))
                  }
                  {textElements.filter(el => el.pageIndex === editorState.currentPage).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No text elements on this page
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Document Info */}
            {metadata && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Document Info
                    <Dialog open={showMetadataDialog} onOpenChange={setShowMetadataDialog}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Document Metadata</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <Label>Title</Label>
                              <p className="mt-1">{metadata.title || 'Untitled'}</p>
                            </div>
                            <div>
                              <Label>Author</Label>
                              <p className="mt-1">{metadata.author || 'Unknown'}</p>
                            </div>
                            <div>
                              <Label>Pages</Label>
                              <p className="mt-1">{metadata.pageCount}</p>
                            </div>
                            <div>
                              <Label>Page Size</Label>
                              <p className="mt-1">
                                {Math.round(metadata.pageSize.width)} × {Math.round(metadata.pageSize.height)}
                              </p>
                            </div>
                          </div>
                          {metadata.keywords && metadata.keywords.length > 0 && (
                            <div>
                              <Label>Keywords</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {metadata.keywords.map(keyword => (
                                  <Badge key={keyword} variant="secondary" className="text-xs">
                                    {keyword}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pages:</span>
                    <span>{metadata.pageCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Elements:</span>
                    <span>{textElements.length}</span>
                  </div>
                  {metadata.modificationDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modified:</span>
                      <span>{metadata.modificationDate.toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PDFEditor;