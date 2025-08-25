"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Download,
  Trash2,
  Edit3,
  Eye,
  MoreVertical,
  FileText,
  Image,
  File,
  Calendar,
  User,
  Tag,
  HardDrive,
  RefreshCw,
  Grid,
  List,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { auditHooks } from "@/middleware/audit";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  lastAccessed?: string;
  tags: string[];
  description?: string;
  visibility: "private" | "organization" | "public";
  organizationId?: string;
  documentId?: string;
  checksum: string;
}

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  usedSpace: number;
  availableSpace: number;
}

interface FileManagerProps {
  organizationId?: string;
  onFileSelect?: (file: FileItem) => void;
  selectionMode?: boolean;
  className?: string;
}

type ViewMode = "grid" | "list";
type SortField = "name" | "size" | "uploadedAt" | "lastAccessed";
type SortOrder = "asc" | "desc";

const FileManager: React.FC<FileManagerProps> = ({
  organizationId,
  onFileSelect,
  selectionMode = false,
  className = "",
}) => {
  const { user, hasPermission } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mimeTypeFilter, setMimeTypeFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortField, setSortField] = useState<SortField>("uploadedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [editForm, setEditForm] = useState({
    filename: "",
    description: "",
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");

  const fetchFiles = useCallback(
    async (reset = false) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: reset ? "1" : page.toString(),
          limit: "20",
          sort: sortField,
          order: sortOrder,
        });

        if (searchQuery) params.append("search", searchQuery);
        if (mimeTypeFilter) params.append("mimeType", mimeTypeFilter);
        if (organizationId) params.append("organizationId", organizationId);

        const response = await fetch(`/api/files?${params}`);
        const result = await response.json();

        if (response.ok && result.success) {
          if (reset) {
            setFiles(result.files);
            setPage(1);
          } else {
            setFiles((prev) => [...prev, ...result.files]);
          }
          setStorageStats(result.stats);
          setHasMore(result.hasMore);
        } else {
          throw new Error(result.error || "Failed to fetch files");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch files");
      } finally {
        setLoading(false);
      }
    },
    [page, sortField, sortOrder, searchQuery, mimeTypeFilter, organizationId]
  );

  useEffect(() => {
    fetchFiles(true);
  }, [sortField, sortOrder, searchQuery, mimeTypeFilter, organizationId]);

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
      fetchFiles();
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleFileSelect = (file: FileItem) => {
    if (selectionMode) {
      setSelectedFiles((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(file.id)) {
          newSet.delete(file.id);
        } else {
          newSet.add(file.id);
        }
        return newSet;
      });
    }
    onFileSelect?.(file);
  };

  const downloadFile = async (file: FileItem) => {
    try {
      const response = await fetch(`/api/files/${file.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error("Download failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const deleteFile = async (fileId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this file? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: [fileId] }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        const deletedFile = files.find((f) => f.id === fileId);
        if (deletedFile) {
          if (user) {
            await auditHooks.logFileDelete(
              user.id,
              fileId,
              deletedFile.filename
            );
          }
        }
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        setSelectedFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      } else {
        throw new Error(result.error || "Delete failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const startEdit = (file: FileItem) => {
    setEditingFile(file);
    setEditForm({
      filename: file.originalName,
      description: file.description || "",
      tags: [...file.tags],
    });
  };

  const saveEdit = async () => {
    if (!editingFile) return;

    try {
      const response = await fetch("/api/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: editingFile.id,
          filename: editForm.filename,
          description: editForm.description,
          tags: editForm.tags,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === editingFile.id
              ? {
                  ...f,
                  originalName: editForm.filename,
                  description: editForm.description,
                  tags: editForm.tags,
                }
              : f
          )
        );
        setEditingFile(null);
        if (user) {
          await auditHooks.logFileMetadataUpdate(
            user.id,
            editingFile.id,
            editingFile.filename,
            editForm.filename,
            editForm.description,
            editForm.tags
          );
        }
      } else {
        throw new Error(result.error || "Update failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !editForm.tags.includes(tagInput.trim())) {
      setEditForm((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setEditForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <Image className="w-5 h-5" />;
    } else if (
      mimeType === "application/pdf" ||
      mimeType.includes("document")
    ) {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMimeTypeOptions = () => {
    const types = new Set(files.map((f) => f.mimeType));
    return Array.from(types).sort();
  };

  if (!user) {
    return (
      <Alert>
        <AlertDescription>
          Please sign in to access your files.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Storage Stats */}
      {storageStats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Files</p>
                <p className="font-medium">{storageStats.totalFiles}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Size</p>
                <p className="font-medium">
                  {formatFileSize(storageStats.totalSize)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Used Space</p>
                <p className="font-medium">
                  {formatFileSize(storageStats.usedSpace)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Available</p>
                <p className="font-medium">
                  {formatFileSize(storageStats.availableSpace)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={mimeTypeFilter} onValueChange={setMimeTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              {getMimeTypeOptions().map((type) => (
                <SelectItem key={type} value={type}>
                  {type.split("/")[1]?.toUpperCase() || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFiles(true)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? (
              <List className="w-4 h-4" />
            ) : (
              <Grid className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2 text-sm">
        <span className="text-muted-foreground">Sort by:</span>
        {(["name", "size", "uploadedAt"] as SortField[]).map((field) => (
          <Button
            key={field}
            variant="ghost"
            size="sm"
            onClick={() => handleSort(field)}
            className="h-auto p-1 font-normal"
          >
            {field === "uploadedAt"
              ? "Date"
              : field.charAt(0).toUpperCase() + field.slice(1)}
            {sortField === field &&
              (sortOrder === "asc" ? (
                <SortAsc className="w-3 h-3 ml-1" />
              ) : (
                <SortDesc className="w-3 h-3 ml-1" />
              ))}
          </Button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Files Display */}
      {loading && files.length === 0 ? (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-2"
          }
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className={viewMode === "grid" ? "h-32" : "h-16"}
            />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12">
          <File className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No files found</p>
          <p className="text-muted-foreground">
            {searchQuery || mimeTypeFilter
              ? "Try adjusting your search or filters"
              : "Upload some files to get started"}
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-2"
          }
        >
          {files.map((file) => (
            <TooltipProvider key={file.id}>
              <Card
                className={`
                  cursor-pointer transition-all hover:shadow-md
                  ${selectedFiles.has(file.id) ? "ring-2 ring-primary" : ""}
                  ${viewMode === "list" ? "p-3" : ""}
                `}
                onClick={() => handleFileSelect(file)}
              >
                {viewMode === "grid" ? (
                  <>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getFileIcon(file.mimeType)}
                          <div className="min-w-0 flex-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="font-medium truncate">
                                  {file.originalName}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{file.originalName}</p>
                              </TooltipContent>
                            </Tooltip>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => downloadFile(file)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => startEdit(file)}>
                              <Edit3 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteFile(file.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(file.uploadedAt)}
                        </div>
                        {file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {file.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs px-1 py-0"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {file.tags.length > 3 && (
                              <Badge
                                variant="secondary"
                                className="text-xs px-1 py-0"
                              >
                                +{file.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        {file.description && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="truncate">{file.description}</p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{file.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {file.originalName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} •{" "}
                        {formatDate(file.uploadedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.tags.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {file.tags.length}
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => downloadFile(file)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => startEdit(file)}>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deleteFile(file.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
              </Card>
            </TooltipProvider>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="text-center">
          <Button variant="outline" onClick={loadMore}>
            Load More
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-filename">Filename</Label>
              <Input
                id="edit-filename"
                value={editForm.filename}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, filename: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-tags"
                  placeholder="Add tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addTag())
                  }
                />
                <Button type="button" onClick={addTag} size="sm">
                  Add
                </Button>
              </div>
              {editForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editForm.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingFile(null)}>
                Cancel
              </Button>
              <Button onClick={saveEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileManager;
