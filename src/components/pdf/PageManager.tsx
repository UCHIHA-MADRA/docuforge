'use client';

import React, { useState } from 'react';
import {
  RotateCw,
  RotateCcw,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Plus,
  FileText,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import PDFProcessor, { PDFMetadata } from '@/lib/pdf-processor';

interface PageManagerProps {
  processor: PDFProcessor;
  metadata: PDFMetadata | null;
  currentPage: number;
  onPageChange: (pageIndex: number) => void;
  onPagesUpdated: () => void;
  className?: string;
}

interface PageInfo {
  index: number;
  thumbnail?: string;
  rotation: number;
  size: { width: number; height: number };
  elementCount: number;
}

export function PageManager({
  processor,
  metadata,
  currentPage,
  onPageChange,
  onPagesUpdated,
  className = '',
}: PageManagerProps) {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [draggedPage, setDraggedPage] = useState<number | null>(null);
  const [dragOverPage, setDragOverPage] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize pages info
  React.useEffect(() => {
    if (metadata) {
      const pageInfos: PageInfo[] = [];
      for (let i = 0; i < metadata.pageCount; i++) {
        const elementsOnPage = processor.getTextElementsForPage(i);
        pageInfos.push({
          index: i,
          rotation: 0, // TODO: Get actual rotation from PDF
          size: metadata.pageSize,
          elementCount: elementsOnPage.length,
        });
      }
      setPages(pageInfos);
    }
  }, [metadata, processor]);

  const handleAddPage = async () => {
    setIsLoading(true);
    try {
      await processor.addPage();
      onPagesUpdated();
    } catch (error) {
      console.error('Failed to add page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePage = async (pageIndex: number) => {
    if (!metadata || metadata.pageCount <= 1) return;
    
    setIsLoading(true);
    try {
      const success = await processor.deletePage(pageIndex);
      if (success) {
        // Adjust current page if necessary
        if (currentPage >= pageIndex && currentPage > 0) {
          onPageChange(currentPage - 1);
        }
        onPagesUpdated();
      }
    } catch (error) {
      console.error('Failed to delete page:', error);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setPageToDelete(null);
    }
  };

  const handleDuplicatePage = async (pageIndex: number) => {
    setIsLoading(true);
    try {
      const newPageIndex = await processor.duplicatePage(pageIndex);
      if (newPageIndex !== -1) {
        onPagesUpdated();
        onPageChange(newPageIndex);
      }
    } catch (error) {
      console.error('Failed to duplicate page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRotatePage = async (pageIndex: number, degrees: 90 | 180 | 270) => {
    setIsLoading(true);
    try {
      const success = await processor.rotatePage(pageIndex, degrees);
      if (success) {
        onPagesUpdated();
      }
    } catch (error) {
      console.error('Failed to rotate page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorderPages = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setIsLoading(true);
    try {
      const success = await processor.reorderPages(fromIndex, toIndex);
      if (success) {
        // Update current page if it was moved
        let newCurrentPage = currentPage;
        if (currentPage === fromIndex) {
          newCurrentPage = toIndex;
        } else if (fromIndex < toIndex && currentPage > fromIndex && currentPage <= toIndex) {
          newCurrentPage = currentPage - 1;
        } else if (fromIndex > toIndex && currentPage >= toIndex && currentPage < fromIndex) {
          newCurrentPage = currentPage + 1;
        }
        
        onPageChange(newCurrentPage);
        onPagesUpdated();
      }
    } catch (error) {
      console.error('Failed to reorder pages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (pageIndex: number) => {
    setDraggedPage(pageIndex);
  };

  const handleDragOver = (e: React.DragEvent, pageIndex: number) => {
    e.preventDefault();
    setDragOverPage(pageIndex);
  };

  const handleDragEnd = () => {
    if (draggedPage !== null && dragOverPage !== null && draggedPage !== dragOverPage) {
      handleReorderPages(draggedPage, dragOverPage);
    }
    setDraggedPage(null);
    setDragOverPage(null);
  };

  const confirmDeletePage = (pageIndex: number) => {
    setPageToDelete(pageIndex);
    setDeleteDialogOpen(true);
  };

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Page Management</CardTitle>
            <Button
              onClick={handleAddPage}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Page
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {pages.map((page, index) => (
                <div
                  key={page.index}
                  className={`
                    relative p-3 border rounded-lg transition-all duration-200
                    ${currentPage === page.index ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                    ${dragOverPage === page.index ? 'border-primary border-2' : ''}
                    ${draggedPage === page.index ? 'opacity-50' : ''}
                  `}
                  draggable
                  onDragStart={() => handleDragStart(page.index)}
                  onDragOver={(e) => handleDragOver(e, page.index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onPageChange(page.index)}
                >
                  <div className="flex items-center gap-3">
                    {/* Drag Handle */}
                    <div className="cursor-move text-muted-foreground hover:text-foreground">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Page Thumbnail/Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-16 bg-muted rounded border flex items-center justify-center">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Page Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          Page {page.index + 1}
                        </span>
                        {page.elementCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {page.elementCount} elements
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {Math.round(page.size.width)} × {Math.round(page.size.height)}
                        {page.rotation !== 0 && (
                          <span className="ml-2">• Rotated {page.rotation}°</span>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRotatePage(page.index, 90);
                            }}
                            disabled={isLoading}
                          >
                            <RotateCw className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Rotate 90° clockwise</TooltipContent>
                      </Tooltip>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDuplicatePage(page.index)}
                            disabled={isLoading}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate Page
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRotatePage(page.index, 90)}
                            disabled={isLoading}
                          >
                            <RotateCw className="w-4 h-4 mr-2" />
                            Rotate 90° CW
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRotatePage(page.index, 270)}
                            disabled={isLoading}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Rotate 90° CCW
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRotatePage(page.index, 180)}
                            disabled={isLoading}
                          >
                            <RotateCw className="w-4 h-4 mr-2" />
                            Rotate 180°
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => confirmDeletePage(page.index)}
                            disabled={isLoading || (metadata?.pageCount || 0) <= 1}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Page
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Page Navigation */}
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <Button
              onClick={() => onPageChange(Math.max(0, currentPage - 1))}
              variant="outline"
              size="sm"
              disabled={currentPage === 0 || isLoading}
            >
              <ArrowUp className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage + 1} of {metadata?.pageCount || 0}
            </span>
            <Button
              onClick={() => onPageChange(Math.min((metadata?.pageCount || 1) - 1, currentPage + 1))}
              variant="outline"
              size="sm"
              disabled={currentPage >= (metadata?.pageCount || 1) - 1 || isLoading}
            >
              Next
              <ArrowDown className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete page {(pageToDelete || 0) + 1}? This action cannot be undone.
              {pageToDelete !== null && pages[pageToDelete]?.elementCount > 0 && (
                <span className="block mt-2 text-destructive">
                  This page contains {pages[pageToDelete].elementCount} text elements that will also be deleted.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pageToDelete !== null && handleDeletePage(pageToDelete)}
              disabled={isLoading}
            >
              Delete Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

export default PageManager;