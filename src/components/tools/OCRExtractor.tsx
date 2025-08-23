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
  Eye,
  Copy,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

interface OCRResult {
  success: boolean;
  type: 'image' | 'pdf';
  filename: string;
  fileSize: number;
  processingTime: number;
  text: string;
  confidence?: number;
  wordCount?: number;
  lineCount?: number;
  pageCount?: number;
  pages?: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
    wordCount: number;
    lineCount: number;
  }>;
  metadata?: {
    language: string;
    dpi?: number;
    preprocessed: boolean;
    totalWords?: number;
    averageConfidence?: number;
  };
}

const SUPPORTED_FORMATS = {
  input: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'tiff'],
};

const LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'rus', name: 'Russian' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'chi_tra', name: 'Chinese (Traditional)' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'ara', name: 'Arabic' },
  { code: 'hin', name: 'Hindi' },
  { code: 'tha', name: 'Thai' },
  { code: 'vie', name: 'Vietnamese' },
];

const FORMAT_ICONS = {
  pdf: FileText,
  png: Image,
  jpg: Image,
  jpeg: Image,
  webp: Image,
  tiff: Image,
};

export default function OCRExtractor() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [results, setResults] = useState<OCRResult[]>([]);
  const [error, setError] = useState<string>('');
  const [language, setLanguage] = useState('eng');
  const [outputFormat, setOutputFormat] = useState<'text' | 'json' | 'detailed'>('text');
  const [dpi, setDpi] = useState(300);
  const [pageNumbers, setPageNumbers] = useState('');
  const [preprocessImage, setPreprocessImage] = useState(true);
  const [selectedResult, setSelectedResult] = useState<OCRResult | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => {
      const fileWithPreview = Object.assign(file, {
        id: Math.random().toString(36).substr(2, 9),
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }) as FileWithPreview;
      return fileWithPreview;
    });
    
    setFiles(prev => [...prev, ...newFiles]);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.tiff'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
  });

  const removeFile = (fileId: string) => {
    setFiles(files => {
      const updatedFiles = files.filter(f => f.id !== fileId);
      // Revoke object URLs to prevent memory leaks
      const fileToRemove = files.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updatedFiles;
    });
  };

  const extractText = async () => {
    if (files.length === 0) {
      setError('Please select files to extract text from.');
      return;
    }

    setIsExtracting(true);
    setError('');
    setResults([]);

    try {
      const extractionPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('language', language);
        formData.append('outputFormat', outputFormat);
        formData.append('dpi', dpi.toString());
        formData.append('preprocessImage', preprocessImage.toString());
        
        if (pageNumbers && file.type === 'application/pdf') {
          formData.append('pageNumbers', pageNumbers);
        }

        const response = await fetch('/api/ocr/extract', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        if (outputFormat === 'text') {
          const text = await response.text();
          const processingTime = parseInt(response.headers.get('X-Processing-Time') || '0');
          const confidence = parseFloat(response.headers.get('X-Confidence') || '0');
          const wordCount = parseInt(response.headers.get('X-Word-Count') || '0');
          
          return {
            success: true,
            type: file.type === 'application/pdf' ? 'pdf' : 'image',
            filename: file.name,
            fileSize: file.size,
            processingTime,
            text,
            confidence: isNaN(confidence) ? undefined : confidence,
            wordCount: isNaN(wordCount) ? undefined : wordCount,
            metadata: {
              language,
              dpi,
              preprocessed: preprocessImage
            }
          } as OCRResult;
        } else {
          return await response.json() as OCRResult;
        }
      });

      const extractionResults = await Promise.all(extractionPromises);
      setResults(extractionResults);
    } catch (error) {
      console.error('Text extraction failed:', error);
      setError(error instanceof Error ? error.message : 'Text extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const downloadText = (result: OCRResult) => {
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.filename.replace(/\.[^/.]+$/, '')}_extracted.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const IconComponent = FORMAT_ICONS[extension as keyof typeof FORMAT_ICONS] || FileText;
    return <IconComponent className="w-5 h-5 text-blue-600" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSelectedLanguage = () => {
    return LANGUAGES.find(lang => lang.code === language)?.name || 'English';
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            OCR Text Extraction
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
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              {isDragActive ? 'Drop files here' : 'Upload Images or PDFs'}
            </p>
            <p className="text-sm text-gray-500">
              Drag & drop files here, or click to select
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports: PDF, PNG, JPG, WebP, TIFF (Max: 50MB)
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Files</h3>
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.name)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => removeFile(file.id)}
                      variant="outline"
                      size="sm"
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

      {/* OCR Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            OCR Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="language">Language</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <Languages className="w-4 h-4" />
                      {getSelectedLanguage()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full max-h-60 overflow-y-auto">
                  {LANGUAGES.map((lang) => (
                    <DropdownMenuItem key={lang.code} onClick={() => setLanguage(lang.code)}>
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              <Label htmlFor="output-format">Output Format</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {outputFormat.charAt(0).toUpperCase() + outputFormat.slice(1)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem onClick={() => setOutputFormat('text')}>Text</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOutputFormat('json')}>JSON</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOutputFormat('detailed')}>Detailed</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              <Label htmlFor="dpi">DPI for PDF: {dpi}</Label>
              <input
                id="dpi"
                type="range"
                min={150}
                max={600}
                step={50}
                value={dpi}
                onChange={(e) => setDpi(parseInt(e.target.value))}
                className="mt-2 w-full"
              />
            </div>

            <div>
              <Label htmlFor="page-numbers">PDF Page Numbers (optional)</Label>
              <Input
                id="page-numbers"
                type="text"
                placeholder="e.g., 1,2,3 or leave empty for all"
                value={pageNumbers}
                onChange={(e) => setPageNumbers(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preprocessImage}
                onChange={(e) => setPreprocessImage(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Enable image preprocessing (improves accuracy)</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Extract Button */}
      <div className="flex justify-center">
        <Button
          onClick={extractText}
          disabled={files.length === 0 || isExtracting}
          size="lg"
          className="min-w-48"
        >
          {isExtracting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Extracting Text...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5 mr-2" />
              Extract Text
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
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Extraction Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getFileIcon(result.filename)}
                      <div>
                        <p className="font-medium text-sm text-gray-900">
                          {result.filename}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{formatFileSize(result.fileSize)}</span>
                          <span>{result.processingTime}ms</span>
                          {result.confidence && (
                            <span>Confidence: {result.confidence.toFixed(1)}%</span>
                          )}
                          {result.wordCount && (
                            <span>{result.wordCount} words</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setSelectedResult(result)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        onClick={() => copyToClipboard(result.text)}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        onClick={() => downloadText(result)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  
                  {/* Preview of extracted text */}
                  <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {result.text.length > 200 
                        ? result.text.substring(0, 200) + '...' 
                        : result.text || 'No text extracted'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Text Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] w-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Extracted Text - {selectedResult.filename}</h3>
              <Button
                onClick={() => setSelectedResult(null)}
                variant="outline"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                {selectedResult.text}
              </pre>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <Button
                onClick={() => copyToClipboard(selectedResult.text)}
                variant="outline"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy All
              </Button>
              <Button
                onClick={() => downloadText(selectedResult)}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}