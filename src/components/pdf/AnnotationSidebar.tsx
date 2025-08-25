'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Highlighter,
  Stamp,
  PenTool,
  Type,
  Link,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Edit,
  Trash2,
  Reply,
  Check,
  X,
  Calendar,
  User,
  Filter,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Link as StyledLink } from '@/components/ui/link';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Annotation,
  AnnotationType,
  CommentAnnotation,
  CommentReply,
  PDFAnnotationManager,
} from '@/lib/pdf-annotations';
import { formatDistanceToNow } from 'date-fns';

interface AnnotationSidebarProps {
  annotationManager: PDFAnnotationManager;
  selectedAnnotation: Annotation | null;
  onAnnotationSelect: (annotation: Annotation | null) => void;
  onAnnotationUpdate: (annotation: Annotation) => void;
  onAnnotationDelete: (annotationId: string) => void;
  onPageNavigate: (pageIndex: number) => void;
  currentUserId: string;
  users: { id: string; name: string; avatar?: string }[];
  className?: string;
}

type SortOption = 'date' | 'type' | 'page' | 'author';
type FilterOption = 'all' | 'mine' | 'unresolved' | 'resolved';

const ANNOTATION_ICONS = {
  highlight: Highlighter,
  comment: MessageSquare,
  stamp: Stamp,
  drawing: PenTool,
  text: Type,
  link: Link,
};

const ANNOTATION_COLORS = {
  highlight: 'bg-yellow-100 text-yellow-800',
  comment: 'bg-blue-100 text-blue-800',
  stamp: 'bg-red-100 text-red-800',
  drawing: 'bg-green-100 text-green-800',
  text: 'bg-purple-100 text-purple-800',
  link: 'bg-indigo-100 text-indigo-800',
};

export function AnnotationSidebar({
  annotationManager,
  selectedAnnotation,
  onAnnotationSelect,
  onAnnotationUpdate,
  onAnnotationDelete,
  onPageNavigate,
  currentUserId,
  users,
  className = '',
}: AnnotationSidebarProps) {
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAnnotations, setExpandedAnnotations] = useState<Set<string>>(new Set());
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [newReplyContent, setNewReplyContent] = useState<Record<string, string>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);

  const stats = annotationManager.getStatistics();
  const allAnnotations = useMemo(() => {
    return Array.from(annotationManager['annotations'].values());
  }, [annotationManager]);

  // Filter and sort annotations
  const filteredAnnotations = useMemo(() => {
    let filtered = allAnnotations;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = annotationManager.searchAnnotations(searchQuery.trim());
    }

    // Apply type/status filter
    switch (filterBy) {
      case 'mine':
        filtered = filtered.filter(a => a.createdBy === currentUserId);
        break;
      case 'unresolved':
        filtered = filtered.filter(a => 
          a.type === 'comment' && !(a as CommentAnnotation).isResolved
        );
        break;
      case 'resolved':
        filtered = filtered.filter(a => 
          a.type === 'comment' && (a as CommentAnnotation).isResolved
        );
        break;
    }

    // Sort annotations
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'page':
          comparison = a.pageIndex - b.pageIndex;
          break;
        case 'author':
          const userA = users.find(u => u.id === a.createdBy)?.name || a.createdBy;
          const userB = users.find(u => u.id === b.createdBy)?.name || b.createdBy;
          comparison = userA.localeCompare(userB);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allAnnotations, searchQuery, filterBy, sortBy, sortOrder, currentUserId, users, annotationManager]);

  // Group annotations by page
  const annotationsByPage = useMemo(() => {
    const grouped = new Map<number, Annotation[]>();
    filteredAnnotations.forEach(annotation => {
      const pageAnnotations = grouped.get(annotation.pageIndex) || [];
      pageAnnotations.push(annotation);
      grouped.set(annotation.pageIndex, pageAnnotations);
    });
    return grouped;
  }, [filteredAnnotations]);

  const getUserName = useCallback((userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Unknown User';
  }, [users]);

  const toggleAnnotationExpanded = useCallback((annotationId: string) => {
    setExpandedAnnotations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(annotationId)) {
        newSet.delete(annotationId);
      } else {
        newSet.add(annotationId);
      }
      return newSet;
    });
  }, []);

  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    onAnnotationSelect(annotation);
    onPageNavigate(annotation.pageIndex);
  }, [onAnnotationSelect, onPageNavigate]);

  const handleToggleVisibility = useCallback((annotation: Annotation) => {
    annotationManager.updateAnnotation(annotation.id, {
      isVisible: !annotation.isVisible,
    });
    onAnnotationUpdate(annotation);
  }, [annotationManager, onAnnotationUpdate]);

  const handleToggleLock = useCallback((annotation: Annotation) => {
    annotationManager.updateAnnotation(annotation.id, {
      isLocked: !annotation.isLocked,
    });
    onAnnotationUpdate(annotation);
  }, [annotationManager, onAnnotationUpdate]);

  const handleDeleteAnnotation = useCallback((annotationId: string) => {
    annotationManager.deleteAnnotation(annotationId);
    onAnnotationDelete(annotationId);
    setShowDeleteDialog(null);
  }, [annotationManager, onAnnotationDelete]);

  const handleResolveComment = useCallback((annotation: CommentAnnotation) => {
    annotationManager.resolveComment(annotation.id);
    onAnnotationUpdate(annotation);
  }, [annotationManager, onAnnotationUpdate]);

  const handleAddReply = useCallback((annotationId: string) => {
    const content = newReplyContent[annotationId]?.trim();
    if (content) {
      annotationManager.addCommentReply(annotationId, content, currentUserId);
      setNewReplyContent(prev => ({ ...prev, [annotationId]: '' }));
      const updatedAnnotation = annotationManager.getAnnotation(annotationId);
      if (updatedAnnotation) {
        onAnnotationUpdate(updatedAnnotation);
      }
    }
  }, [annotationManager, currentUserId, newReplyContent, onAnnotationUpdate]);

  const renderAnnotationIcon = (type: AnnotationType) => {
    const IconComponent = ANNOTATION_ICONS[type];
    return <IconComponent className="h-4 w-4" />;
  };

  const renderAnnotationContent = (annotation: Annotation) => {
    switch (annotation.type) {
      case 'highlight':
        const highlight = annotation as { selectedText?: string };
        return (
          <div className="text-sm text-gray-600">
            <p className="font-medium">Highlighted text:</p>
            <p className="italic">&ldquo;{ highlight.selectedText || 'Selected text' }&rdquo;</p>
          </div>
        );
      case 'comment':
        const comment = annotation as CommentAnnotation;
        return (
          <div className="space-y-2">
            <p className="text-sm">{comment.content}</p>
            {comment.replies.length > 0 && (
              <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="text-sm">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <span className="font-medium">{getUserName(reply.createdBy)}</span>
                      <span>{formatDistanceToNow(reply.createdAt, { addSuffix: true })}</span>
                      {reply.isEdited && <span className="italic">(edited)</span>}
                    </div>
                    <p>{reply.content}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add a reply..."
                value={newReplyContent[annotation.id] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewReplyContent(prev => ({
                  ...prev,
                  [annotation.id]: e.target.value
                }))}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    handleAddReply(annotation.id);
                  }
                }}
                className="text-xs"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAddReply(annotation.id)}
                disabled={!newReplyContent[annotation.id]?.trim()}
              >
                <Reply className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      case 'stamp':
        const stamp = annotation as { stampType: string; text?: string };
        return (
          <div className="text-sm text-gray-600">
            <p className="font-medium">Stamp: {stamp.stampType}</p>
            {stamp.text && <p className="italic">&ldquo;{stamp.text}&rdquo;</p>}
          </div>
        );
      case 'text':
        const text = annotation as { content: string };
        return (
          <div className="text-sm text-gray-600">
            <p className="font-medium">Text annotation:</p>
            <p className="italic">&ldquo;{text.content}&rdquo;</p>
          </div>
        );
      case 'drawing':
        return (
          <div className="text-sm text-gray-600">
            <p className="font-medium">Drawing annotation</p>
            <p className="text-xs">Hand-drawn content</p>
          </div>
        );
      case 'link':
        const link = annotation as { url: string; displayText?: string };
        return (
          <div className="text-sm text-gray-600">
            <p className="font-medium">Link:</p>
            <StyledLink 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer"
              variant="buttonOutline"
              size="sm"
              className="mt-1 break-all"
            >
              {link.displayText || link.url}
            </StyledLink>
          </div>
        );
      default:
        return null;
    }
  };

  const renderAnnotationCard = (annotation: Annotation) => {
    const isExpanded = expandedAnnotations.has(annotation.id);
    const isSelected = selectedAnnotation?.id === annotation.id;
    const isComment = annotation.type === 'comment';
    const comment = isComment ? annotation as CommentAnnotation : null;
    const canEdit = annotation.createdBy === currentUserId;

    return (
      <Card 
        key={annotation.id} 
        className={`mb-2 cursor-pointer transition-colors ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
        }`}
        onClick={() => handleAnnotationClick(annotation)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={`${ANNOTATION_COLORS[annotation.type]} text-xs`}>
                {renderAnnotationIcon(annotation.type)}
                <span className="ml-1 capitalize">{annotation.type}</span>
              </Badge>
              <span className="text-xs text-gray-500">Page {annotation.pageIndex + 1}</span>
              {isComment && !comment?.isResolved && (
                <Badge variant="destructive" className="text-xs">Unresolved</Badge>
              )}
              {isComment && comment?.isResolved && (
                <Badge variant="secondary" className="text-xs">Resolved</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleToggleVisibility(annotation);
                      }}
                    >
                      {annotation.isVisible ? 
                        <Eye className="h-3 w-3" /> : 
                        <EyeOff className="h-3 w-3" />
                      }
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {annotation.isVisible ? 'Hide' : 'Show'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {canEdit && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleToggleLock(annotation);
                        }}
                      >
                        {annotation.isLocked ? 
                          <Lock className="h-3 w-3" /> : 
                          <Unlock className="h-3 w-3" />
                        }
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {annotation.isLocked ? 'Unlock' : 'Lock'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isComment && !comment?.isResolved && (
                    <DropdownMenuItem onClick={() => handleResolveComment(comment!)}>
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Resolved
                    </DropdownMenuItem>
                  )}
                  {canEdit && (
                    <>
                      <DropdownMenuItem onClick={() => setEditingAnnotation(annotation.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(annotation.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  toggleAnnotationExpanded(annotation.id);
                }}
              >
                {isExpanded ? 
                  <ChevronDown className="h-3 w-3" /> : 
                  <ChevronRight className="h-3 w-3" />
                }
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <User className="h-3 w-3" />
            <span>{getUserName(annotation.createdBy)}</span>
            <Calendar className="h-3 w-3" />
            <span>{formatDistanceToNow(annotation.createdAt, { addSuffix: true })}</span>
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="pt-0">
            {renderAnnotationContent(annotation)}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white border-l border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Annotations</h3>
          <Badge variant="secondary">{filteredAnnotations.length}</Badge>
        </div>

        {/* Search */}
        <Input
          placeholder="Search annotations..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          className="mb-3"
        />

        {/* Filters and Sort */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterBy('all')}>
                All Annotations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('mine')}>
                My Annotations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('unresolved')}>
                Unresolved Comments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('resolved')}>
                Resolved Comments
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center">
                <span className="inline-flex items-center">
                  <span className="mr-2">
                    {sortOrder === 'asc' ? 
                      <SortAsc className="h-3 w-3" /> : 
                      <SortDesc className="h-3 w-3" />
                    }
                  </span>
                  <span>Sort</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('date')}>
                By Date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('type')}>
                By Type
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('page')}>
                By Page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('author')}>
                By Author
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                {sortOrder === 'asc' ? 'Descending' : 'Ascending'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Statistics */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span>Total: {stats.total}</span>
          {stats.unresolved > 0 && (
            <span className="text-red-600">Unresolved: {stats.unresolved}</span>
          )}
          {stats.resolved > 0 && (
            <span className="text-green-600">Resolved: {stats.resolved}</span>
          )}
        </div>
      </div>

      {/* Annotations List */}
      <ScrollArea className="flex-1 p-4">
        {filteredAnnotations.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No annotations found</p>
            <p className="text-sm mt-1">
              {searchQuery ? 'Try adjusting your search' : 'Start annotating to see them here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(annotationsByPage.entries())
              .sort(([a], [b]) => a - b)
              .map(([pageIndex, pageAnnotations]) => (
                <div key={pageIndex}>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-sm text-gray-700">
                      Page {pageIndex + 1}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {pageAnnotations.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {pageAnnotations.map(renderAnnotationCard)}
                  </div>
                  {pageIndex < Array.from(annotationsByPage.keys()).sort((a, b) => a - b).pop()! && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))
            }
          </div>
        )}
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Annotation</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this annotation? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => showDeleteDialog && handleDeleteAnnotation(showDeleteDialog)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AnnotationSidebar;