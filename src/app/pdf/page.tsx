"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { auditHooks } from "@/middleware/audit";
import {
  FileText,
  Plus,
  Upload,
  Edit3,
  Download,
  Trash2,
  Search,
  Filter,
  Grid,
  List,
  MoreVertical,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";
import { AuthGuard } from "@/components/auth/AuthGuard";
import PDFEditor from "@/components/pdf/PDFEditor";

interface PDFFile {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  mimeType: string;
  isDocument: boolean;
  documentTitle?: string;
  organizationName?: string;
}

const PDFManagementPage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditorDialog, setShowEditorDialog] = useState(false);
  const [newPdfTitle, setNewPdfTitle] = useState("");
  const [newPdfAuthor, setNewPdfAuthor] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [creating, setCreating] = useState(false);

  // Load PDF files
  React.useEffect(() => {
    if (session) {
      loadPDFFiles();
    }
  }, [session]);

  const loadPDFFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/files?mimeType=application/pdf");
      const data = await response.json();

      if (response.ok && data.success) {
        setFiles(data.files || []);
      } else {
        throw new Error(data.error || "Failed to load PDF files");
      }
    } catch (error) {
      console.error("Error loading PDF files:", error);
      toast.error("Failed to load PDF files");
    } finally {
      setLoading(false);
    }
  };

  const createNewPDF = async () => {
    try {
      setCreating(true);

      const response = await fetch("/api/pdf/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "create",
          title: newPdfTitle || "Untitled",
          author: newPdfAuthor || session?.user?.name || "Unknown",
          organizationId: selectedOrganization || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create PDF");
      }

      if (data.success) {
        toast.success("PDF created successfully");
        setShowCreateDialog(false);
        if (session?.user?.id) {
          await auditHooks.logPdfCreate(
            session.user.id,
            data.fileId,
            "PDF created"
          );
        }
        setNewPdfTitle("");
        setNewPdfAuthor("");
        setSelectedOrganization("");

        // Navigate to editor
        router.push(`/pdf/edit/${data.fileId}`);
      } else {
        throw new Error(data.error || "Failed to create PDF");
      }
    } catch (error) {
      console.error("Error creating PDF:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create PDF"
      );
    } finally {
      setCreating(false);
    }
  };

  const editPDF = (fileId: string) => {
    router.push(`/pdf/edit/${fileId}`);
  };

  const downloadPDF = async (fileId: string, filename: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("File downloaded successfully");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const deletePDF = async (fileId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this PDF? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/files", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileIds: [fileId] }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete file");
      }

      if (data.success) {
        toast.success("PDF deleted successfully");
        if (session?.user?.id) {
          await auditHooks.logPdfDelete(session.user.id, fileId, "PDF deleted");
        }
        loadPDFFiles(); // Reload the list
      } else {
        throw new Error(data.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete file"
      );
    }
  };

  const filteredFiles = files.filter(
    (file) =>
      file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.documentTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  PDF Documents
                </h1>
                <p className="text-muted-foreground">
                  Create, edit, and manage your PDF documents
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Dialog
                  open={showCreateDialog}
                  onOpenChange={setShowCreateDialog}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New PDF
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New PDF</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          placeholder="Enter PDF title"
                          value={newPdfTitle}
                          onChange={(e) => setNewPdfTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="author">Author</Label>
                        <Input
                          id="author"
                          placeholder="Enter author name"
                          value={newPdfAuthor}
                          onChange={(e) => setNewPdfAuthor(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="organization">
                          Organization (Optional)
                        </Label>
                        <Select
                          value={selectedOrganization}
                          onValueChange={setSelectedOrganization}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Personal Document</SelectItem>
                            {/* Organizations would be loaded dynamically */}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowCreateDialog(false)}
                          disabled={creating}
                        >
                          Cancel
                        </Button>
                        <Button onClick={createNewPDF} disabled={creating}>
                          {creating ? "Creating..." : "Create PDF"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={showEditorDialog}
                  onOpenChange={setShowEditorDialog}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Quick Editor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>PDF Editor</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                      <PDFEditor
                        onSave={(buffer) => {
                          // Handle save logic for quick editor
                          toast.success("PDF saved successfully");
                          setShowEditorDialog(false);
                        }}
                        onError={(error) => {
                          toast.error(error);
                        }}
                        className="h-full"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search PDFs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Toggle
                  pressed={viewMode === "grid"}
                  onPressedChange={() => setViewMode("grid")}
                  size="sm"
                >
                  <Grid className="w-4 h-4" />
                </Toggle>
                <Toggle
                  pressed={viewMode === "list"}
                  onPressedChange={() => setViewMode("list")}
                  size="sm"
                >
                  <List className="w-4 h-4" />
                </Toggle>
              </div>
            </div>
          </div>

          {/* Files Grid/List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading PDF files...</p>
              </div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? "No PDFs found" : "No PDF documents yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Create your first PDF document to get started"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New PDF
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFiles.map((file) => (
                <Card
                  key={file.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm truncate">
                            {file.documentTitle || file.filename}
                          </CardTitle>
                          {file.documentTitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {file.filename}
                            </p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => editPDF(file.id)}>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => downloadPDF(file.id, file.filename)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <Separator />
                          <DropdownMenuItem
                            onClick={() => deletePDF(file.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Size:</span>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Modified:</span>
                        <span>{formatDate(file.updatedAt)}</span>
                      </div>
                      {file.organizationName && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Organization:
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {file.organizationName}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => editPDF(file.id)}
                        size="sm"
                        className="flex-1"
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => downloadPDF(file.id, file.filename)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50"
                    >
                      <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">
                            {file.documentTitle || file.filename}
                          </h3>
                          {file.organizationName && (
                            <Badge variant="secondary" className="text-xs">
                              {file.organizationName}
                            </Badge>
                          )}
                        </div>
                        {file.documentTitle && (
                          <p className="text-sm text-muted-foreground truncate">
                            {file.filename}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{formatFileSize(file.size)}</span>
                          <span>Modified {formatDate(file.updatedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => editPDF(file.id)}
                          size="sm"
                          variant="outline"
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => downloadPDF(file.id, file.filename)}
                          size="sm"
                          variant="outline"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => deletePDF(file.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default PDFManagementPage;
