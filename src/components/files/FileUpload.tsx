"use client";

import React, { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  X,
  FileText,
  Image,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auditHooks } from "@/middleware/audit";

interface FileUploadProps {
  onUploadComplete?: (fileId: string) => void;
  onUploadError?: (error: string) => void;
  organizationId?: string;
  maxFiles?: number;
  className?: string;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  fileId?: string;
}

interface UploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  supportedFormats: {
    documents: string[];
    images: string[];
  };
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  organizationId,
  maxFiles = 10,
  className = "",
}) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploadConfig, setUploadConfig] = useState<UploadConfig | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [metadata, setMetadata] = useState({
    tags: [] as string[],
    description: "",
    visibility: "private" as "private" | "organization" | "public",
  });
  const [tagInput, setTagInput] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch upload configuration on component mount
  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/files/upload");
        if (response.ok) {
          const config = await response.json();
          setUploadConfig(config);
        }
      } catch (error) {
        console.error("Failed to fetch upload config:", error);
      }
    };

    fetchConfig();
  }, []);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!uploadConfig) return "Upload configuration not loaded";

      if (file.size > uploadConfig.maxFileSize) {
        return `File size exceeds maximum allowed size of ${
          uploadConfig.maxFileSize / (1024 * 1024)
        }MB`;
      }

      if (!uploadConfig.allowedMimeTypes.includes(file.type)) {
        return `File type ${file.type} is not supported`;
      }

      return null;
    },
    [uploadConfig]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Validate total file count
      if (files.length + acceptedFiles.length > maxFiles) {
        onUploadError?.(`Cannot upload more than ${maxFiles} files at once`);
        return;
      }

      // Validate individual files
      const newFiles: UploadFile[] = acceptedFiles.map((file) => {
        const validationError = validateFile(file);
        return {
          file,
          id: crypto.randomUUID(),
          progress: 0,
          status: validationError ? "error" : "pending",
          error: validationError || undefined,
        };
      });

      // Check for duplicate files
      const existingFileNames = files.map((f) => f.file.name.toLowerCase());
      const duplicateFiles = newFiles.filter((f) =>
        existingFileNames.includes(f.file.name.toLowerCase())
      );

      if (duplicateFiles.length > 0) {
        onUploadError?.(
          `Duplicate files detected: ${duplicateFiles
            .map((f) => f.file.name)
            .join(", ")}`
        );
        return;
      }

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length, maxFiles, validateFile, onUploadError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading || !uploadConfig,
    accept: uploadConfig
      ? {
          "application/pdf": [".pdf"],
          "application/msword": [".doc"],
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            [".docx"],
          "application/vnd.ms-excel": [".xls"],
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
            ".xlsx",
          ],
          "application/vnd.ms-powerpoint": [".ppt"],
          "application/vnd.openxmlformats-officedocument.presentationml.presentation":
            [".pptx"],
          "text/plain": [".txt"],
          "text/csv": [".csv"],
          "image/jpeg": [".jpg", ".jpeg"],
          "image/png": [".png"],
          "image/gif": [".gif"],
          "image/webp": [".webp"],
        }
      : undefined,
  });

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const addTag = () => {
    if (tagInput.trim() && !metadata.tags.includes(tagInput.trim())) {
      setMetadata((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setMetadata((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    const formData = new FormData();
    formData.append("file", uploadFile.file);
    formData.append(
      "metadata",
      JSON.stringify({
        ...metadata,
        organizationId,
      })
    );

    try {
      // Add timeout to prevent hanging uploads
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "completed",
                  progress: 100,
                  fileId: result.fileId,
                }
              : f
          )
        );
        onUploadComplete?.(result.fileId);

        // Log upload with error handling
        try {
          await auditHooks.logFileUpload(
            user?.id || "",
            result.fileId,
            uploadFile.file.name,
            uploadFile.file.size
          );
        } catch (auditError) {
          console.error("Failed to log file upload:", auditError);
          // Don't fail the upload if audit logging fails
        }
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        const errorMessage =
          error.message === "The user aborted a request."
            ? "Upload was cancelled"
            : "Upload timed out";
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "error", error: errorMessage }
              : f
          )
        );
        onUploadError?.(errorMessage);
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "error", error: errorMessage }
            : f
        )
      );
      onUploadError?.(errorMessage);
    }
  };

  const startUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    abortControllerRef.current = new AbortController();

    // Mark files as uploading
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending" ? { ...f, status: "uploading" } : f
      )
    );

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const file of pendingFiles) {
        if (abortControllerRef.current?.signal.aborted) break;
        await uploadFile(file);
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelUpload = () => {
    abortControllerRef.current?.abort();
    setIsUploading(false);
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "uploading" ? { ...f, status: "pending" } : f
      )
    );
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "completed"));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Please sign in to upload files.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Configuration */}
      {uploadConfig && (
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Maximum file size: {formatFileSize(uploadConfig.maxFileSize)}</p>
          <div className="flex flex-wrap gap-2">
            <span>Supported formats:</span>
            {uploadConfig.supportedFormats.documents.map((format) => (
              <Badge key={format} variant="secondary" className="text-xs">
                {format}
              </Badge>
            ))}
            {uploadConfig.supportedFormats.images.map((format) => (
              <Badge key={format} variant="secondary" className="text-xs">
                {format}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Metadata Form */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="font-medium">File Metadata</h3>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Optional description for your files"
            value={metadata.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setMetadata((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="visibility">Visibility</Label>
          <Select
            value={metadata.visibility}
            onValueChange={(value: "private" | "organization" | "public") =>
              setMetadata((prev) => ({ ...prev, visibility: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              {organizationId && (
                <SelectItem value="organization">Organization</SelectItem>
              )}
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <div className="flex gap-2">
            <Input
              id="tags"
              placeholder="Add tags"
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
          {metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {metadata.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          }
          ${
            isUploading
              ? "pointer-events-none opacity-50"
              : "hover:border-primary hover:bg-primary/5"
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-lg font-medium">Drop files here...</p>
        ) : (
          <div>
            <p className="text-lg font-medium mb-2">Drag & drop files here</p>
            <p className="text-muted-foreground">or click to select files</p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Files ({files.length})</h3>
            <div className="flex gap-2">
              {files.some((f) => f.status === "completed") && (
                <Button variant="outline" size="sm" onClick={clearCompleted}>
                  Clear Completed
                </Button>
              )}
              {files.some((f) => f.status === "pending") && !isUploading && (
                <Button onClick={startUpload}>Upload Files</Button>
              )}
              {isUploading && (
                <Button variant="destructive" onClick={cancelUpload}>
                  Cancel Upload
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                {getFileIcon(file.file.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.file.size)} • {file.file.type}
                  </p>
                  {file.status === "uploading" && (
                    <Progress value={file.progress} className="mt-2" />
                  )}
                  {file.error && (
                    <p className="text-sm text-destructive mt-1">
                      {file.error}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {file.status === "pending" && (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                  {file.status === "uploading" && (
                    <Badge variant="default">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Uploading
                    </Badge>
                  )}
                  {file.status === "completed" && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                  {file.status === "error" && (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Error
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    disabled={file.status === "uploading"}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
