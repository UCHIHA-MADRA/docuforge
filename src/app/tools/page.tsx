"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Upload,
  Merge,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  RefreshCw,
} from "lucide-react";

interface FileWithPreview extends File {
  preview: string;
  id: string;
  status: "pending" | "processing" | "error" | "success";
  errorMessage?: string;
}

interface ProcessingStats {
  totalFiles: number;
  processedFiles: number;
  totalSize: number;
  errors: string[];
}

export default function PDFToolsPage() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    totalFiles: 0,
    processedFiles: 0,
    totalSize: 0,
    errors: [],
  });
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitPages, setSplitPages] = useState<string>("");
  const [isSplitting, setIsSplitting] = useState(false);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgWidth, setImgWidth] = useState<string | undefined>(undefined);
  const [imgHeight, setImgHeight] = useState<string | undefined>(undefined);
  const [imgFit, setImgFit] = useState<string | undefined>(undefined);
  const [imgFormat, setImgFormat] = useState<string | undefined>(undefined);
  const [imgQuality, setImgQuality] = useState<string | undefined>(undefined);

  // Edge Case 1: File validation with detailed checks
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    // Check if file exists
    if (!file) {
      return { isValid: false, error: "File is undefined or null" };
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return {
        isValid: false,
        error: `File size (${(file.size / (1024 * 1024)).toFixed(
          2
        )}MB) exceeds 50MB limit`,
      };
    }

    // Check if file is empty
    if (file.size === 0) {
      return { isValid: false, error: "File is empty" };
    }

    // Check file type
    if (file.type !== "application/pdf") {
      return {
        isValid: false,
        error: `Invalid file type: ${file.type}. Only PDF files are supported.`,
      };
    }

    // Check file name
    if (!file.name || file.name.trim() === "") {
      return { isValid: false, error: "File name is empty" };
    }

    // Check for suspicious file extensions
    const suspiciousExtensions = [
      ".exe",
      ".bat",
      ".cmd",
      ".com",
      ".pif",
      ".scr",
      ".vbs",
    ];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));
    if (suspiciousExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: "File type not allowed for security reasons",
      };
    }

    return { isValid: true };
  };

  // Edge Case 2: Enhanced file processing with progress tracking
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: import("react-dropzone").FileRejection[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejectionReasons = rejectedFiles.map((rejection) => {
        if (rejection.errors) {
          return rejection.errors
            .map((error: import("react-dropzone").FileError) => `${rejection.file.name}: ${error.message}`)
            .join(", ");
        }
        return `${rejection.file.name}: Unknown error`;
      });

      setError(`Some files were rejected: ${rejectionReasons.join("; ")}`);
    }

    // Process accepted files
    const newFiles = acceptedFiles
      .map((file) => {
        const validation = validateFile(file);
        if (!validation.isValid) {
          setError(validation.error || "File validation failed");
          return undefined;
        }

        return {
          ...file,
          id: Math.random().toString(36).substr(2, 9),
          preview: file.name || "",
          status: "pending" as const,
        } as FileWithPreview;
      })
      .filter((file): file is FileWithPreview => file !== undefined);

    setFiles((prev) => [...prev, ...newFiles]);
    setError("");

    // Update processing stats
    setProcessingStats((prev) => ({
      ...prev,
      totalFiles: prev.totalFiles + newFiles.length,
      totalSize:
        prev.totalSize + newFiles.reduce((sum, file) => sum + file.size, 0),
    }));
  }, []);

  // Edge Case 3: Enhanced dropzone configuration with error handling
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 20, // Maximum 20 files
    onDropRejected: (rejectedFiles) => {
      const errors = rejectedFiles.map((rejection) =>
        rejection.errors
          .map((error: import("react-dropzone").FileError) => `${rejection.file.name}: ${error.message}`)
          .join(", ")
      );
      setError(`File upload rejected: ${errors.join("; ")}`);
    },
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
  });

  // Edge Case 4: File removal with cleanup
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove) {
        setProcessingStats((prevStats) => ({
          ...prevStats,
          totalSize: prevStats.totalSize - fileToRemove.size,
          totalFiles: prevStats.totalFiles - 1,
        }));
      }
      return prev.filter((file) => file.id !== id);
    });
    setError("");
  }, []);

  // Edge Case 5: Clear all files
  const clearAllFiles = useCallback(() => {
    setFiles([]);
    setError("");
    setSuccess("");
    setProcessingStats({
      totalFiles: 0,
      processedFiles: 0,
      totalSize: 0,
      errors: [],
    });
    setUploadProgress(0);
  }, []);

  // Edge Case 6: Enhanced PDF merging with progress tracking and error recovery
  const mergePDFs = useCallback(async () => {
    if (files.length < 2) {
      setError("Please select at least 2 PDF files to merge");
      return;
    }

    // Check total size limit
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 200 * 1024 * 1024) {
      // 200MB total limit
      setError(
        "Total file size exceeds 200MB limit. Please select smaller files."
      );
      return;
    }

    setIsProcessing(true);
    setError("");
    setSuccess("");
    setUploadProgress(0);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Update file statuses
      setFiles((prev) =>
        prev.map((file) => ({ ...file, status: "processing" as const }))
      );

      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/pdf/merge", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      // Download the merged PDF
      const blob = await response.blob();

      // Edge Case 7: Validate downloaded file
      if (blob.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged-document.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess("PDFs merged successfully! Download started.");

      // Update file statuses to success
      setFiles((prev) =>
        prev.map((file) => ({ ...file, status: "success" as const }))
      );

      // Clear files after successful merge
      setTimeout(() => {
        clearAllFiles();
      }, 3000);
    } catch (error) {
      // Edge Case 8: Handle specific error types
      let errorMessage = "Failed to merge PDFs";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "PDF merge was cancelled";
        } else if (error.message.includes("NetworkError")) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Request timeout. Files may be too large or complex.";
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);

      // Update file statuses to error
      setFiles((prev) =>
        prev.map((file) => ({
          ...file,
          status: "error" as const,
          errorMessage: errorMessage,
        }))
      );
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
      abortControllerRef.current = null;
    }
  }, [files, clearAllFiles]);

  // Edge Case 9: Cancel processing
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    setUploadProgress(0);
    setError("PDF merge was cancelled");
  }, []);

  // Edge Case 10: Retry failed files
  const retryFailedFiles = useCallback(() => {
    setFiles((prev) =>
      prev.map((file) => ({
        ...file,
        status: "pending" as const,
        errorMessage: undefined,
      }))
    );
    setError("");
  }, []);

  // Edge Case 11: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Edge Case 12: Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "z":
            event.preventDefault();
            clearAllFiles();
            break;
          case "Enter":
            if (files.length >= 2 && !isProcessing) {
              event.preventDefault();
              mergePDFs();
            }
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [files.length, isProcessing, mergePDFs, clearAllFiles]);

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  const hasErrors = files.some((file) => file.status === "error");
  const hasSuccess = files.some((file) => file.status === "success");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <FileText className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">DocuForge</span>
            </div>

            {/* Edge Case 13: Show processing status and controls */}
            {isProcessing && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-blue-600">Processing...</span>
                </div>
                <Button variant="outline" size="sm" onClick={cancelProcessing}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">PDF Tools</h1>
          <p className="text-lg text-gray-600">
            Professional PDF processing tools for your documents
          </p>

          {/* Edge Case 14: Show keyboard shortcuts help */}
          <div className="mt-4 text-sm text-gray-500">
            <p>Keyboard shortcuts: Ctrl+Z to clear, Ctrl+Enter to merge</p>
          </div>
        </div>

        {/* PDF Merge Tool */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Merge className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Merge PDFs
              </h2>
            </div>

            {/* Edge Case 15: File management controls */}
            {files.length > 0 && (
              <div className="flex items-center space-x-2">
                {hasErrors && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryFailedFiles}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Failed
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={clearAllFiles}>
                  Clear All
                </Button>
              </div>
            )}
          </div>

          {/* File Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg text-gray-600 mb-2">
              {isDragActive
                ? "Drop the PDF files here..."
                : "Drag & drop PDF files here, or click to select"}
            </p>
            <p className="text-sm text-gray-500">
              Supports up to 20 files, 50MB each, 200MB total. Select at least 2
              PDFs to merge.
            </p>
          </div>

          {/* Edge Case 16: Upload progress indicator */}
          {isProcessing && uploadProgress > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Processing...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Selected Files ({files.length})
              </h3>
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`p-3 rounded-lg border ${
                      file.status === "error"
                        ? "bg-red-50 border-red-200"
                        : file.status === "success"
                        ? "bg-green-50 border-green-200"
                        : file.status === "processing"
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText
                          className={`h-5 w-5 ${
                            file.status === "error"
                              ? "text-red-600"
                              : file.status === "success"
                              ? "text-green-600"
                              : file.status === "processing"
                              ? "text-blue-600"
                              : "text-gray-600"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                          {/* Edge Case 17: Show file status and errors */}
                          {file.status === "error" && file.errorMessage && (
                            <p className="text-xs text-red-600 mt-1">
                              {file.errorMessage}
                            </p>
                          )}
                          {file.status === "success" && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Processed successfully
                            </p>
                          )}
                          {file.status === "processing" && (
                            <p className="text-xs text-blue-600 mt-1">
                              Processing...
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  Total size:{" "}
                  <span className="font-medium">{totalSizeMB} MB</span>
                </p>
                {totalSize > 200 * 1024 * 1024 && (
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ Total size exceeds 200MB limit
                  </p>
                )}
              </div>

              {/* Edge Case 18: Enhanced merge button with validation */}
              <div className="mt-6">
                <Button
                  onClick={mergePDFs}
                  disabled={
                    isProcessing ||
                    files.length < 2 ||
                    totalSize > 200 * 1024 * 1024
                  }
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Merging PDFs...
                    </>
                  ) : (
                    <>
                      <Merge className="h-5 w-5 mr-2" />
                      Merge PDFs
                    </>
                  )}
                </Button>

                {files.length < 2 && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    Select at least 2 PDF files to merge
                  </p>
                )}

                {totalSize > 200 * 1024 * 1024 && (
                  <p className="text-sm text-red-500 text-center mt-2">
                    Total file size exceeds 200MB limit
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Edge Case 19: Enhanced error and success messages */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-600">{success}</p>
              </div>
            </div>
          )}
        </div>

        {/* Additional Tools Info */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Split PDF</h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PDF File</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setSplitFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pages (e.g., 1-3,5,7-9)</label>
              <input
                type="text"
                value={splitPages}
                onChange={(e) => setSplitPages(e.target.value)}
                placeholder="Pages to extract"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <Button
                onClick={async () => {
                  if (!splitFile || !splitPages.trim()) {
                    setError('Select a PDF and specify pages to extract');
                    return;
                  }
                  setError('');
                  setIsSplitting(true);
                  try {
                    const fd = new FormData();
                    fd.append('file', splitFile);
                    fd.append('pages', splitPages);
                    const res = await fetch('/api/pdf/split', { method: 'POST', body: fd });
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      throw new Error(j.error || 'Split failed');
                    }
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'extracted-pages.pdf';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    setSuccess('Split successful. Download started.');
                  } catch (e: any) {
                    setError(e?.message || 'Split failed');
                  } finally {
                    setIsSplitting(false);
                  }
                }}
                disabled={isSplitting}
              >
                {isSplitting ? 'Splitting...' : 'Split'}
              </Button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Image Resize</h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image File</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(e) => setImgFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
                <input
                  type="number"
                  value={imgWidth}
                  onChange={(e) => setImgWidth(e.target.value)}
                  placeholder="e.g. 800"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
                <input
                  type="number"
                  value={imgHeight}
                  onChange={(e) => setImgHeight(e.target.value)}
                  placeholder="optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fit</label>
                <select
                  value={imgFit}
                  onChange={(e) => setImgFit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="inside">inside</option>
                  <option value="cover">cover</option>
                  <option value="contain">contain</option>
                  <option value="fill">fill</option>
                  <option value="outside">outside</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                <select
                  value={imgFormat}
                  onChange={(e) => setImgFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">keep</option>
                  <option value="jpeg">jpeg</option>
                  <option value="png">png</option>
                  <option value="webp">webp</option>
                  <option value="avif">avif</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                <input
                  type="number"
                  value={imgQuality}
                  onChange={(e) => setImgQuality(e.target.value)}
                  min={1}
                  max={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <Button
                onClick={async () => {
                  if (!imgFile || (!imgWidth && !imgHeight)) {
                    setError('Select an image and provide width or height');
                    return;
                  }
                  setError('');
                  setSuccess('');
                  try {
                    const fd = new FormData();
                    fd.append('file', imgFile);
                    if (imgWidth) fd.append('width', imgWidth);
                    if (imgHeight) fd.append('height', imgHeight);
                    if (imgFit) fd.append('fit', imgFit);
                    if (imgFormat) fd.append('format', imgFormat);
                    if (imgQuality) fd.append('quality', imgQuality);
                    const res = await fetch('/api/images/resize', { method: 'POST', body: fd });
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      throw new Error(j.error || 'Resize failed');
                    }
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `resized.${imgFormat || (imgFile.type.split('/')[1] || 'img')}`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    setSuccess('Image resized. Download started.');
                  } catch (e: any) {
                    setError(e?.message || 'Resize failed');
                  }
                }}
              >
                Resize
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
