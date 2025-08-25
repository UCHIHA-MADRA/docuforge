"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Scissors,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import dynamic from 'next/dynamic';

// Dynamically import react-pdf components to avoid SSR issues
const PDFDocument = dynamic(() => import('react-pdf').then(mod => mod.Document), { ssr: false });
const PDFPage = dynamic(() => import('react-pdf').then(mod => mod.Page), { ssr: false });

// Import pdfjs for worker configuration
import { pdfjs } from 'react-pdf';

// Set up the worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface PDFSplitterProps {
  onSplitComplete?: (result: Blob) => void;
}

const PDFSplitter: React.FC<PDFSplitterProps> = ({ onSplitComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pagesSpec, setPagesSpec] = useState<string>("");
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageWidth, setPageWidth] = useState<number>(600);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    
    if (!selectedFile) return;
    
    if (selectedFile.type !== "application/pdf") {
      setError("Only PDF files are supported");
      return;
    }
    
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }
    
    setFile(selectedFile);
    setError("");
    setSuccess("");
    setPagesSpec("");
    setSelectedPages([]);
    setCurrentPage(1);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Simulate document load success with a fixed number of pages for demo
  useEffect(() => {
    if (file) {
      // In a real implementation, we would use PDF.js to get the actual page count
      // For now, we'll simulate with a random number between 1-20 pages
      const simulatedPageCount = Math.floor(Math.random() * 20) + 1;
      setNumPages(simulatedPageCount);
    }
  }, [file]);

  // Handle page navigation
  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    if (numPages) {
      setCurrentPage((prev) => Math.min(prev + 1, numPages));
    }
  };

  // Toggle page selection
  const togglePageSelection = (pageNum: number) => {
    setSelectedPages((prev) => {
      if (prev.includes(pageNum)) {
        return prev.filter((p) => p !== pageNum);
      } else {
        return [...prev, pageNum].sort((a, b) => a - b);
      }
    });
  };

  // Update pages spec when selected pages change
  useEffect(() => {
    if (selectedPages.length > 0) {
      // Convert array of page numbers to a range specification
      const ranges: string[] = [];
      let rangeStart = selectedPages[0];
      let rangeEnd = selectedPages[0];
      
      for (let i = 1; i < selectedPages.length; i++) {
        if (selectedPages[i] === rangeEnd + 1) {
          rangeEnd = selectedPages[i];
        } else {
          ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
          rangeStart = selectedPages[i];
          rangeEnd = selectedPages[i];
        }
      }
      
      ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
      setPagesSpec(ranges.join(','));
    } else {
      setPagesSpec("");
    }
  }, [selectedPages]);

  // Handle split PDF
  const handleSplitPDF = async () => {
    if (!file || !pagesSpec.trim()) {
      setError("Please select a PDF file and specify pages to extract");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pages", pagesSpec.trim());

      const response = await fetch("/api/pdf/split", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      const blob = await response.blob();
      const extractedPages = response.headers.get("X-Extracted-Pages") || "0";

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `split_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(`Successfully extracted ${extractedPages} pages from PDF`);
      
      if (onSplitComplete) {
        onSplitComplete(blob);
      }
    } catch (err) {
      console.error("Error splitting PDF:", err);
      setError(err instanceof Error ? err.message : "Failed to split PDF");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pages spec input change
  const handlePagesSpecChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPagesSpec(e.target.value);
    
    // Parse the input to update selected pages
    try {
      const newSelectedPages: number[] = [];
      const parts = e.target.value.split(',');
      
      parts.forEach(part => {
        part = part.trim();
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          if (!isNaN(start) && !isNaN(end) && start <= end && start > 0 && end <= (numPages || Infinity)) {
            for (let i = start; i <= end; i++) {
              newSelectedPages.push(i);
            }
          }
        } else {
          const pageNum = Number(part);
          if (!isNaN(pageNum) && pageNum > 0 && pageNum <= (numPages || Infinity)) {
            newSelectedPages.push(pageNum);
          }
        }
      });
      
      setSelectedPages([...new Set(newSelectedPages)].sort((a, b) => a - b));
    } catch (err) {
      // Ignore parsing errors
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        } ${file ? "border-green-500 bg-green-50" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-3">
          {file ? (
            <>
              <FileText className="h-12 w-12 text-green-600" />
              <div>
                <p className="text-lg font-medium text-green-600">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setNumPages(null);
                  setSelectedPages([]);
                  setPagesSpec("");
                }}
              >
                <X className="h-4 w-4 mr-2" /> Remove File
              </Button>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-700">
                  Drag & drop a PDF file here
                </p>
                <p className="text-sm text-gray-500">
                  or click to select a file (max {MAX_FILE_SIZE / (1024 * 1024)}MB)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* PDF Preview */}
      {file && showPreview && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">PDF Preview</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageWidth((prev) => Math.max(prev - 100, 300))}
                >
                  -
                </Button>
                <span className="text-sm">{Math.round((pageWidth / 600) * 100)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageWidth((prev) => Math.min(prev + 100, 1200))}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <PDFDocument
                file={file}
                onLoadSuccess={(pdf: { numPages: number }) => {
                  setNumPages(pdf.numPages);
                }}
                onLoadError={(error: Error) => setError("Error loading PDF: " + error.message)}
                className="mb-4"
              >
                <PDFPage
                  pageNumber={currentPage}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className={`border ${selectedPages.includes(currentPage) ? 'border-blue-500 shadow-md' : 'border-gray-200'}`}
                  onClick={() => togglePageSelection(currentPage)}
                />
              </PDFDocument>

              {numPages && (
                <div className="flex items-center justify-center space-x-4 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage >= (numPages || 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center mt-4 text-sm text-blue-600">
                <Info className="h-4 w-4 mr-1" />
                Click on the page to select/deselect it for extraction
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Page Selection */}
      {file && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="pagesSpec" className="block text-sm font-medium text-gray-700 mb-1">
              Pages to Extract (e.g., 1-3,5,7-9)
            </Label>
            <div className="flex space-x-2">
              <Input
                id="pagesSpec"
                value={pagesSpec}
                onChange={handlePagesSpecChange}
                placeholder="e.g., 1-3,5,7-9"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (numPages) {
                    setPagesSpec(`1-${numPages}`);
                    setSelectedPages(Array.from({ length: numPages }, (_, i) => i + 1));
                  }
                }}
              >
                All Pages
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {selectedPages.length > 0
                ? `Selected ${selectedPages.length} page${selectedPages.length !== 1 ? "s" : ""}`
                : "No pages selected"}
            </p>
          </div>

          {/* Selected Pages Preview */}
          {selectedPages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedPages.map((page) => (
                <div
                  key={page}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm flex items-center"
                >
                  Page {page}
                  <button
                    onClick={() => togglePageSelection(page)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleSplitPDF}
            disabled={isLoading || !file || !pagesSpec.trim() || selectedPages.length === 0}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Splitting PDF...
              </>
            ) : (
              <>
                <Scissors className="h-5 w-5 mr-2" />
                Split PDF
              </>
            )}
          </Button>
        </div>
      )}

      {/* Error and Success Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-600">{success}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFSplitter;