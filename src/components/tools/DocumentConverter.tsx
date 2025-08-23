'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  Image,
  Download,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { auditHooks } from '@/middleware/audit';
import { useAuth } from '@/lib/auth-context';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

import { Slider } from '@/components/ui/slider';

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

interface ConversionResult {
  success: boolean;
  filename: string;
  downloadUrl: string;
  metadata?: {
    originalFormat: string;
    targetFormat: string;
    fileSize: number;
    pageCount?: number;
  };
}

const SUPPORTED_FORMATS = {
  input: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'tiff', 'docx', 'xlsx', 'pptx'],
  output: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'tiff'],
};

const FORMAT_ICONS = {
  pdf: FileText,
  png: Image,
  jpg: Image,
  jpeg: Image,
  webp: Image,
  tiff: Image,
  docx: FileText,
  xlsx: FileText,
  pptx: FileText,
};

export default function DocumentConverter() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [outputFormat, setOutputFormat] = useState<string>('pdf');
  const [quality, setQuality] = useState<number>(90);
  const [dpi, setDpi] = useState<number>(300);
  const [pages, setPages] = useState<string>('');
  const [compression, setCompression] = useState<string>('lzw');
  const [isConverting, setIsConverting] = useState(false);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [error, setError] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => {
      const fileWithPreview = Object.assign(file, {
        id: `${file.name}-${Date.now()}`,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }) as FileWithPreview;
      return fileWithPreview;
    });
    
    setFiles((prev) => [...prev, ...newFiles]);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.tiff'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
  });

  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const updated = prev.filter((file) => file.id !== fileId);
      // Revoke object URLs to prevent memory leaks
      const fileToRemove = prev.find((file) => file.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
  };

  const clearFiles = () => {
    files.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setResults([]);
    setError('');
  };

  const convertDocuments = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to convert');
      return;
    }

    setIsConverting(true);
    setError('');
    setResults([]);

    try {
      const conversionPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('format', outputFormat);
        formData.append('quality', quality.toString());
        formData.append('dpi', dpi.toString());
        if (pages.trim()) {
          formData.append('pages', pages.trim());
        }
        if (outputFormat === 'tiff') {
          formData.append('compression', compression);
        }

        const response = await fetch('/api/documents/convert', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to convert ${file.name}`);
        }

        // Get metadata from headers
        const metadata = {
          originalFormat: response.headers.get('X-Original-Format') || 'unknown',
          targetFormat: response.headers.get('X-Target-Format') || outputFormat,
          fileSize: parseInt(response.headers.get('X-File-Size') || '0', 10),
          pageCount: response.headers.get('X-Page-Count') 
            ? parseInt(response.headers.get('X-Page-Count')!, 10) 
            : undefined,
        };

        // Create download URL
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const originalName = file.name.replace(/\.[^/.]+$/, '');
        const extension = outputFormat === 'jpg' ? 'jpg' : outputFormat;
        const filename = `${originalName}.${extension}`;



        


        // Assuming user is available from useAuth hook in the parent component
        // For now, user is undefined in this component, so user?.id will be undefined.
        // A proper implementation would involve passing user as a prop or using a context/hook.
        await auditHooks.logDocumentConversion(user?.id, file.name, outputFormat, filename);

        return {
          success: true,
          filename,
          downloadUrl,
          metadata,
        };
      });

      const results = await Promise.allSettled(conversionPromises);
      const successfulResults: ConversionResult[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulResults.push(result.value);
        } else {
          errors.push(`${files[index].name}: ${result.reason.message}`);
        }
      });

      setResults(successfulResults);
      
      if (errors.length > 0) {
        setError(`Some conversions failed:\n${errors.join('\n')}`);
      }
    } catch (error) {
      setError(`Conversion failed: ${(error as Error).message}`);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadFile = (result: ConversionResult) => {
    const link = document.createElement('a');
    link.href = result.downloadUrl;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    results.forEach((result) => {
      setTimeout(() => downloadFile(result), 100); // Small delay between downloads
    });
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const IconComponent = FORMAT_ICONS[extension as keyof typeof FORMAT_ICONS] || FileText;
    return <IconComponent className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Converter</h2>
        <p className="text-gray-600">
          Convert between PDF, images, and Office documents with professional quality
        </p>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              {isDragActive
                ? 'Drop files here...'
                : 'Drag & drop files here, or click to select'}
            </p>
            <p className="text-sm text-gray-500">
              Supports PDF, images (PNG, JPG, WebP, TIFF), and Office documents (DOCX, XLSX, PPTX)
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Maximum file size: 50MB per file
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">
                  Selected Files ({files.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFiles}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.name)}
                      <div>
                        <p className="font-medium text-sm text-gray-900 truncate max-w-xs">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Conversion Settings
            </div>
            <Dialog.Root open={showAdvanced} onOpenChange={setShowAdvanced}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Advanced Options
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Advanced Conversion Options</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pages">Pages (for PDF input)</Label>
                    <Input
                      id="pages"
                      placeholder="e.g., 1,3,5-10"
                      value={pages}
                      onChange={(e) => setPages(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty for all pages. Use commas and ranges (e.g., 1,3,5-10)
                    </p>
                  </div>
                  
                  {outputFormat === 'tiff' && (
                    <div>
                      <Label htmlFor="compression">TIFF Compression</Label>
                      <Select value={compression} onValueChange={setCompression}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="lzw">LZW</SelectItem>
                          <SelectItem value="zip">ZIP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="dpi">DPI (for image output): {dpi}</Label>
                    <Slider
                      id="dpi"
                      min={72}
                      max={600}
                      step={1}
                      value={[dpi]}
                      onValueChange={(value: number[]) => setDpi(value[0])}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>72 (Web)</span>
                      <span>300 (Print)</span>
                      <span>600 (High)</span>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog.Root>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="output-format">Output Format</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {outputFormat ? outputFormat.toUpperCase() : 'Select format'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  {SUPPORTED_FORMATS.output.map((format) => (
                    <DropdownMenuItem key={format} onClick={() => setOutputFormat(format)}>
                      {format.toUpperCase()}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {['jpg', 'jpeg', 'webp'].includes(outputFormat) && (
              <div>
                <Label htmlFor="quality">Quality: {quality}%</Label>
                <input
                  id="quality"
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Convert Button */}
      <div className="flex justify-center">
        <Button
          onClick={convertDocuments}
          disabled={files.length === 0 || isConverting}
          size="lg"
          className="min-w-48"
        >
          {isConverting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5 mr-2" />
              Convert Documents
            </>
          )}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start space-x-3">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
          <div className="text-red-700 whitespace-pre-line">{error}</div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Conversion Results
              </div>
              <Button onClick={downloadAll} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(result.filename)}
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {result.filename}
                      </p>
                      {result.metadata && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {result.metadata.originalFormat.toUpperCase()} → {result.metadata.targetFormat.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatFileSize(result.metadata.fileSize)}
                          </span>
                          {result.metadata.pageCount && (
                            <span className="text-xs text-gray-500">
                              {result.metadata.pageCount} page{result.metadata.pageCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => downloadFile(result)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>

  );
}