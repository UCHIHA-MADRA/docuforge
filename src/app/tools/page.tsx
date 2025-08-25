"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import DocumentConverter from "@/components/tools/DocumentConverter";
import OCRExtractor from "@/components/tools/OCRExtractor";
import SpreadsheetEngine from "@/components/spreadsheet/SpreadsheetEngine";
import ClientEnhancedThemeToggle from "@/components/theme/ClientEnhancedThemeToggle";
import { AlertCircle as AlertCircleIcon, CheckCircle as CheckCircleIcon } from "lucide-react";

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

// Simple Button component
const Button = ({
  children,
  onClick,
  disabled = false,
  variant = "default",
  size = "default",
  className = "",
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  [key: string]: React.ReactNode | (() => void) | boolean | string | undefined;
}) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
    ghost: "text-gray-600 hover:bg-gray-100 focus:ring-blue-500",
  };
  const sizeClasses = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${
        sizeClasses[size]
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// Simple icons as SVGs
const FileText = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const Upload = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    />
  </svg>
);

const Merge = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
    />
  </svg>
);

const Download = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const Compress = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const X = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const CheckCircle = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const AlertCircle = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const RefreshCw = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const Info = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const Convert = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
    />
  </svg>
);

const Scan = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const Scissors = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
    />
  </svg>
);

const Table = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1z"
    />
  </svg>
);

export default function ToolsPage() {
  // Tab state for different tools
  const [activeTab, setActiveTab] = useState<
    "merge" | "split" | "compress" | "convert" | "ocr" | "document-convert" | "spreadsheet"
  >("merge");
  const router = useRouter();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Split PDF state
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitPages, setSplitPages] = useState<string>("");
  const [isSplitting, setIsSplitting] = useState(false);

  // Compress PDF state
  const [compressFile, setCompressFile] = useState<File | null>(null);
  const [compressQuality, setCompressQuality] = useState<number>(0.7);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    savedPercentage: string;
    method: string;
  } | null>(null);

  // Convert PDF state
  const [convertFile, setConvertFile] = useState<File | null>(null);
  const [convertFormat, setConvertFormat] = useState<string>("png");
  const [convertDpi, setConvertDpi] = useState<number>(300);
  const [convertPage, setConvertPage] = useState<number>(1);
  const [isConverting, setIsConverting] = useState(false);

  // OCR state
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrLanguage, setOcrLanguage] = useState<string>("eng");
  const [extractedText, setExtractedText] = useState<string>("");
  const [isOcring, setIsOcring] = useState(false);

  // File validation with detailed checks
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    if (!file) {
      return { isValid: false, error: "File is undefined or null" };
    }

    if (file.size > 50 * 1024 * 1024) {
      return {
        isValid: false,
        error: `File size (${(file.size / (1024 * 1024)).toFixed(
          2
        )}MB) exceeds 50MB limit`,
      };
    }

    if (file.size === 0) {
      return { isValid: false, error: "File is empty" };
    }

    if (activeTab === "merge" && file.type !== "application/pdf") {
      return {
        isValid: false,
        error: `Invalid file type: ${file.type}. Only PDF files are supported.`,
      };
    }

    if (!file.name || file.name.trim() === "") {
      return { isValid: false, error: "File name is empty" };
    }

    return { isValid: true };
  };

  // Handle file drop and selection
  const handleFileChange = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles = Array.from(selectedFiles)
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
    },
    [activeTab]
  );

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const droppedFiles = e.dataTransfer.files;
    handleFileChange(droppedFiles);
  };

  // File removal with cleanup
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
    setError("");
  }, []);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setFiles([]);
    setError("");
    setSuccess("");
    setUploadProgress(0);
  }, []);

  // Enhanced PDF merging
  const mergePDFs = useCallback(async () => {
    if (files.length < 2) {
      setError("Please select at least 2 PDF files to merge");
      return;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 200 * 1024 * 1024) {
      setError(
        "Total file size exceeds 200MB limit. Please select smaller files."
      );
      return;
    }

    setIsProcessing(true);
    setError("");
    setSuccess("");
    setUploadProgress(0);

    try {
      setFiles((prev) =>
        prev.map((file) => ({ ...file, status: "processing" as const }))
      );

      // Simulate processing
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setUploadProgress(100);

      setSuccess(
        "PDFs merged successfully! (Demo mode - no actual merge performed)"
      );

      setFiles((prev) =>
        prev.map((file) => ({ ...file, status: "success" as const }))
      );

      setTimeout(() => {
        clearAllFiles();
      }, 3000);
    } catch (error) {
      setError("Failed to merge PDFs");
      setFiles((prev) =>
        prev.map((file) => ({
          ...file,
          status: "error" as const,
          errorMessage: "Processing failed",
        }))
      );
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  }, [files, clearAllFiles]);

  // Cancel processing
  const cancelProcessing = useCallback(() => {
    setIsProcessing(false);
    setUploadProgress(0);
    setError("PDF merge was cancelled");
  }, []);

  // Retry failed files
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

  // Compress PDF function
  const compressPDF = useCallback(async () => {
    if (!compressFile) {
      setError("Select a PDF file to compress");
      return;
    }

    // Validate quality
    if (compressQuality < 0.1 || compressQuality > 1.0) {
      setError("Quality must be between 0.1 and 1.0");
      return;
    }

    setError("");
    setSuccess("");
    setCompressionStats(null);
    setIsCompressing(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", compressFile);
      formData.append("quality", compressQuality.toString());
      formData.append("removeMetadata", "true");
      formData.append("optimizeImages", "true");
      formData.append("useAdvancedCompression", "true");

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 80));
      }, 200);

      const response = await fetch("/api/pdf/compress", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Get compression statistics from headers
      const method = response.headers.get("X-Compression-Method") || "unknown";
      const originalSize = parseInt(
        response.headers.get("X-Original-Size") || "0"
      );
      const compressedSize = parseInt(
        response.headers.get("X-Compressed-Size") || "0"
      );
      const compressionRatio = response.headers.get("X-Compression-Ratio");
      const savedPercentage = response.headers.get("X-Saved-Percentage");
      const processingTime = response.headers.get("X-Processing-Time");

      setUploadProgress(100);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compressed_${compressFile.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Set compression statistics
      if (originalSize && compressedSize) {
        setCompressionStats({
          originalSize,
          compressedSize,
          savedPercentage: savedPercentage || "0%",
          method,
        });
      }

      // Show detailed success message with compression stats
      let successMessage = "PDF compressed successfully!";
      if (compressionRatio && savedPercentage) {
        const savedKB =
          originalSize && compressedSize
            ? Math.round((originalSize - compressedSize) / 1024)
            : 0;
        successMessage += ` Compression: ${compressionRatio}x, saved ${savedPercentage} (${savedKB}KB)`;

        if (processingTime) {
          successMessage += `, processed in ${processingTime}`;
        }

        successMessage += ` using ${method}`;
      }
      setSuccess(successMessage);
    } catch (err) {
      console.error("Compression error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Compression failed";
      setError(`Compression failed: ${errorMessage}`);
    } finally {
      setIsCompressing(false);
      setUploadProgress(0);
    }
  }, [compressFile, compressQuality]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "z":
            event.preventDefault();
            clearAllFiles();
            break;
          case "Enter":
            if (files.length >= 2 && !isProcessing && activeTab === "merge") {
              event.preventDefault();
              mergePDFs();
            }
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [files.length, isProcessing, mergePDFs, clearAllFiles, activeTab]);

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  const hasErrors = files.some((file) => file.status === "error");

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

            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const themeToggle = document.getElementById('theme-toggle');
                  if (themeToggle) {
                    themeToggle.click();
                  }
                }}
                className="flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Button>
            </div>

            {(isProcessing || isCompressing) && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-blue-600">
                    {isCompressing ? "Compressing..." : "Processing..."}
                  </span>
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
          <div className="mt-4 text-sm text-gray-500">
            <p>Keyboard shortcuts: Ctrl+Z to clear, Ctrl+Enter to merge</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          <Button
            variant={activeTab === "merge" ? "default" : "outline"}
            onClick={() => setActiveTab("merge")}
            className="flex items-center gap-2"
          >
            <Merge className="h-4 w-4" /> Merge PDFs
          </Button>
          <Button
            variant={activeTab === "split" ? "default" : "outline"}
            onClick={() => setActiveTab("split")}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" /> Split PDF
          </Button>
          <Button
            variant={activeTab === "compress" ? "default" : "outline"}
            onClick={() => setActiveTab("compress")}
            className="flex items-center gap-2"
          >
            <Compress className="h-4 w-4" /> Compress PDF
          </Button>
          <Button
            variant={activeTab === "document-convert" ? "default" : "outline"}
            onClick={() => setActiveTab("document-convert")}
            className="flex items-center gap-2"
          >
            <Convert className="h-4 w-4" /> Document Converter
          </Button>
          <Button
            variant={activeTab === "ocr" ? "default" : "outline"}
            onClick={() => setActiveTab("ocr")}
            className="flex items-center gap-2"
          >
            <Scan className="h-4 w-4" /> OCR Text Extraction
          </Button>
          <Button
            variant={activeTab === ("spreadsheet" as "merge" | "split" | "compress" | "convert" | "ocr" | "document-convert") ? "default" : "outline"}
            onClick={() => setActiveTab("document-convert" as const)}
            className="flex items-center gap-2"
          >
            <Table className="h-4 w-4" /> Spreadsheet Engine
          </Button>
        </div>

        {/* PDF Merge Tool */}
        {activeTab === "merge" && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Merge className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Merge PDFs
                </h2>
              </div>

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
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                multiple
                accept="application/pdf"
                onChange={(e) => handleFileChange(e.target.files)}
                className="hidden"
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg text-gray-600 mb-2">
                {isDragActive
                  ? "Drop the PDF files here..."
                  : "Drag & drop PDF files here, or click to select"}
              </p>
              <p className="text-sm text-gray-500">
                Supports up to 20 files, 50MB each, 200MB total. Select at least
                2 PDFs to merge.
              </p>
            </div>

            {/* Upload progress indicator */}
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

                {/* Merge button */}
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

            {/* Error and success messages */}
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
        )}

        {/* Split PDF Tool */}
        {activeTab === "split" && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Scissors className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                Split PDF
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Extract specific pages from your PDF documents with our advanced PDF splitter tool.
              You can visually preview pages and select which ones to extract.
            </p>
            
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-center">
                <img 
                  src="/images/pdf-split-preview.svg" 
                  alt="PDF Split Preview" 
                  className="w-64 h-auto opacity-80"
                  onError={(e) => {
                    // Fallback if image doesn't exist
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              
              <Button
                onClick={() => router.push('/tools/pdf-splitter')}
                className="w-full"
                size="lg"
              >
                <Scissors className="h-5 w-5 mr-2" />
                Open PDF Splitter
              </Button>
              
              <p className="text-sm text-gray-500 text-center">
                Split PDFs by page ranges with visual preview
              </p>
            </div>
          </div>
        )}

        {/* PDF Compress Tool */}
        {activeTab === "compress" && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Compress className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                Compress PDF
              </h3>
            </div>

            <div className="grid gap-6">
              {/* File Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PDF File
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {compressFile ? (
                        <>
                          <FileText className="w-8 h-8 mb-2 text-blue-600" />
                          <p className="text-sm text-gray-700 font-medium">
                            {compressFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(compressFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mb-2 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">
                              Click to upload
                            </span>{" "}
                            PDF file
                          </p>
                          <p className="text-xs text-gray-500">Max 50MB</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        setCompressFile(e.target.files?.[0] || null);
                        setCompressionStats(null);
                        setError("");
                        setSuccess("");
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Quality Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compression Quality
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={compressQuality}
                    onChange={(e) =>
                      setCompressQuality(parseFloat(e.target.value))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>High Compression (0.1)</span>
                    <span className="font-medium">{compressQuality}</span>
                    <span>Low Compression (1.0)</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Lower values = smaller file size, higher values = better
                    quality
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="removeMetadata"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="removeMetadata"
                      className="text-sm text-gray-700"
                    >
                      Remove metadata
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="optimizeImages"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="optimizeImages"
                      className="text-sm text-gray-700"
                    >
                      Optimize images
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useAdvancedCompression"
                      defaultChecked
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="useAdvancedCompression"
                      className="text-sm text-gray-700"
                    >
                      Use advanced compression
                    </label>
                  </div>
                </div>
              </div>

              {/* Compression Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">
                      Hybrid Compression Technology
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Uses pdf-lib for basic compression and pdfcpu for advanced
                      optimization. Advanced compression can reduce file size by
                      70-90% while maintaining quality.
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {isCompressing && uploadProgress > 0 && (
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Compressing PDF...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Compression Statistics */}
              {compressionStats && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">
                    Compression Results
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-700">Original Size:</span>
                      <span className="ml-2 font-medium">
                        {(
                          compressionStats.originalSize /
                          (1024 * 1024)
                        ).toFixed(2)}{" "}
                        MB
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Compressed Size:</span>
                      <span className="ml-2 font-medium">
                        {(
                          compressionStats.compressedSize /
                          (1024 * 1024)
                        ).toFixed(2)}{" "}
                        MB
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Space Saved:</span>
                      <span className="ml-2 font-medium">
                        {compressionStats.savedPercentage}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Method:</span>
                      <span className="ml-2 font-medium capitalize">
                        {compressionStats.method}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Compress Button */}
              <div>
                <Button
                  onClick={compressPDF}
                  disabled={!compressFile || isCompressing}
                  className="w-full"
                  size="lg"
                >
                  {isCompressing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Compressing PDF...
                    </>
                  ) : (
                    <>
                      <Compress className="h-5 w-5 mr-2" />
                      Compress PDF
                    </>
                  )}
                </Button>

                {!compressFile && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    Select a PDF file to compress
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document Converter Tool */}
        {activeTab === "document-convert" && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
            <DocumentConverter />
          </div>
        )}

        {/* OCR Text Extraction Tool */}
        {activeTab === "ocr" && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
            <OCRExtractor />
          </div>
        )}

        {/* Spreadsheet Engine Tool */}
        {activeTab === ("spreadsheet" as "merge" | "split" | "compress" | "convert" | "ocr" | "document-convert") && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
            <SpreadsheetEngine />
          </div>
        )}

        {/* Global Error and Success Messages */}
        {error && activeTab !== "merge" && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {success && activeTab !== "merge" && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          </div>
        )}
      </main>


    </div>
  );
}
