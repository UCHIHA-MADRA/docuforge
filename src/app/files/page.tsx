'use client';

import React, { useState } from 'react';
import { Upload, FolderOpen, Plus, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FileUpload from '@/components/files/FileUpload';
import FileManager from '@/components/files/FileManager';

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
  visibility: 'private' | 'organization' | 'public';
  organizationId?: string;
  documentId?: string;
  checksum: string;
}

const FilesPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('files');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = (fileId: string) => {
    // Refresh the file manager to show the new file
    setRefreshKey(prev => prev + 1);
    setShowUploadDialog(false);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    // You could show a toast notification here
  };

  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file);
    // You could navigate to a file viewer or editor here
    console.log('Selected file:', file);
  };

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Files</h1>
            <p className="text-muted-foreground mt-2">
              Upload, manage, and organize your documents securely
            </p>
          </div>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Upload Files
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Files
                </DialogTitle>
              </DialogHeader>
              <FileUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxFiles={10}
                className="mt-4"
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              My Files
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-6">
            <FileManager
              key={refreshKey}
              onFileSelect={handleFileSelect}
              className="min-h-[600px]"
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload New Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onUploadComplete={(fileId) => {
                    handleUploadComplete(fileId);
                    setActiveTab('files');
                  }}
                  onUploadError={handleUploadError}
                  maxFiles={10}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* File Preview/Details Modal */}
        {selectedFile && (
          <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5" />
                    File Details
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Name</p>
                    <p className="mt-1">{selectedFile.originalName}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Size</p>
                    <p className="mt-1">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Type</p>
                    <p className="mt-1">{selectedFile.mimeType}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Uploaded</p>
                    <p className="mt-1">
                      {new Date(selectedFile.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Visibility</p>
                    <p className="mt-1 capitalize">{selectedFile.visibility}</p>
                  </div>
                  {selectedFile.lastAccessed && (
                    <div>
                      <p className="font-medium text-muted-foreground">Last Accessed</p>
                      <p className="mt-1">
                        {new Date(selectedFile.lastAccessed).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                
                {selectedFile.description && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-2">Description</p>
                    <p className="text-sm bg-muted p-3 rounded-md">
                      {selectedFile.description}
                    </p>
                  </div>
                )}
                
                {selectedFile.tags.length > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedFile.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedFile(null)}>
                    Close
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/files/${selectedFile.id}/download`);
                        if (response.ok) {
                          const blob = await response.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = selectedFile.originalName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }
                      } catch (error) {
                        console.error('Download failed:', error);
                      }
                    }}
                  >
                    Download
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>File Management Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium mb-2">Supported File Types</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Documents: PDF, DOC, DOCX, TXT</li>
                  <li>• Spreadsheets: XLS, XLSX, CSV</li>
                  <li>• Presentations: PPT, PPTX</li>
                  <li>• Images: JPG, PNG, GIF, WebP</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Security Features</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• End-to-end encryption for all files</li>
                  <li>• Role-based access control</li>
                  <li>• Audit logging for all activities</li>
                  <li>• Secure file sharing and collaboration</li>
                </ul>
              </div>
            </div>
            <Alert>
              <AlertDescription>
                All files are automatically encrypted before storage and can only be accessed by authorized users.
                Maximum file size is 100MB per file.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
};

export default FilesPage;