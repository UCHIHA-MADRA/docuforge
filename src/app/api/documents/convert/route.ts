import { NextRequest, NextResponse } from "next/server";
import { documentConverter, ConversionOptions, getSupportedFormats } from "@/lib/document-converter";

// Constants for limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PAGES = 100; // Maximum pages to convert
const DEFAULT_DPI = 300; // Default DPI for conversion
const MAX_DPI = 600; // Maximum allowed DPI
const DEFAULT_QUALITY = 90; // Default quality for lossy formats

export async function GET() {
  const supportedFormats = getSupportedFormats();
  
  return NextResponse.json(
    {
      message: "Document conversion endpoint. Send POST with a file and conversion parameters.",
      supportedFormats,
      limits: {
        maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
        maxPages: MAX_PAGES,
        defaultDPI: DEFAULT_DPI,
        maxDPI: MAX_DPI,
        defaultQuality: DEFAULT_QUALITY,
      },
      examples: {
        "PDF to PNG": {
          format: "png",
          dpi: 300,
          quality: 90
        },
        "Image to PDF": {
          format: "pdf"
        },
        "PDF pages selection": {
          format: "pdf",
          pages: [1, 3, 5]
        }
      }
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    // Get conversion parameters
    const format = (formData.get("format")?.toString() || "pdf").toLowerCase();
    const qualityParam = formData.get("quality")?.toString() || DEFAULT_QUALITY.toString();
    const quality = Math.min(100, Math.max(1, parseInt(qualityParam, 10) || DEFAULT_QUALITY));
    const dpiParam = formData.get("dpi")?.toString() || DEFAULT_DPI.toString();
    const dpi = Math.min(MAX_DPI, Math.max(72, parseInt(dpiParam, 10) || DEFAULT_DPI));
    const pagesParam = formData.get("pages")?.toString();
    const compressionParam = formData.get("compression")?.toString() || "lzw";
    
    // Parse pages parameter
    let pages: number[] | undefined;
    if (pagesParam) {
      try {
        pages = pagesParam.split(',').map(p => parseInt(p.trim(), 10)).filter(p => p > 0);
        if (pages.length === 0) pages = undefined;
      } catch {
        return NextResponse.json(
          { error: "Invalid pages parameter. Use comma-separated page numbers (e.g., '1,3,5')" },
          { status: 400 }
        );
      }
    }
    
    // Validate file
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Validate format
    const supportedFormats = getSupportedFormats();
    if (!supportedFormats.output.includes(format)) {
      return NextResponse.json(
        { error: `Unsupported output format. Supported formats: ${supportedFormats.output.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate compression for TIFF
    const validCompressions = ['none', 'lzw', 'zip'];
    if (format === 'tiff' && !validCompressions.includes(compressionParam)) {
      return NextResponse.json(
        { error: `Invalid compression for TIFF. Supported: ${validCompressions.join(", ")}` },
        { status: 400 }
      );
    }

    // Read the file
    const fileBuffer = await file.arrayBuffer();
    const inputBuffer = new Uint8Array(fileBuffer);
    
    // Determine input format from file type or content
    const inputFormat = getInputFormat(file.type, inputBuffer);
    
    // Validate input format
    if (!supportedFormats.input.includes(inputFormat)) {
      return NextResponse.json(
        { error: `Unsupported input format: ${inputFormat}. Supported formats: ${supportedFormats.input.join(", ")}` },
        { status: 400 }
      );
    }

    // Prepare conversion options
    const options: ConversionOptions = {
      format: format as 'pdf' | 'png' | 'jpg' | 'webp' | 'tiff' | 'docx' | 'xlsx' | 'pptx',
      quality,
      dpi,
      pages,
      compression: compressionParam as 'none' | 'lzw' | 'zip',
    };

    // Perform conversion
    const result = await documentConverter.convertDocument(inputBuffer, inputFormat, options);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Conversion failed" },
        { status: 500 }
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { error: "No data returned from conversion" },
        { status: 500 }
      );
    }

    // Create response with converted file
    const response = new NextResponse(result.data);
    
    // Set appropriate headers
    const mimeType = getMimeType(format);
    const fileExtension = getFileExtension(format);
    const originalName = file.name.replace(/\.[^/.]+$/, ""); // Remove original extension
    
    response.headers.set("Content-Type", mimeType);
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="${originalName}.${fileExtension}"`
    );
    response.headers.set("Content-Length", result.data.byteLength.toString());
    
    // Add metadata headers
    if (result.metadata) {
      response.headers.set("X-Original-Format", result.metadata.originalFormat);
      response.headers.set("X-Target-Format", result.metadata.targetFormat);
      response.headers.set("X-File-Size", result.metadata.fileSize.toString());
      if (result.metadata.pageCount) {
        response.headers.set("X-Page-Count", result.metadata.pageCount.toString());
      }
    }
    
    return response;
  } catch (error) {
    console.error("Document conversion error:", error);
    return NextResponse.json(
      { error: `Failed to convert document: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * Determine input format from MIME type and buffer content
 */
function getInputFormat(mimeType: string, buffer: Uint8Array): string {
  // First try MIME type
  switch (mimeType) {
    case 'application/pdf':
      return 'pdf';
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/tiff':
    case 'image/tif':
      return 'tiff';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'docx';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'xlsx';
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return 'pptx';
  }
  
  // Fallback to buffer detection
  // PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'pdf';
  }
  
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'png';
  }
  
  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'jpg';
  }
  
  // WebP
  if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'webp';
  }
  
  // TIFF
  if ((buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4D && buffer[1] === 0x4D)) {
    return 'tiff';
  }
  
  // Office formats (ZIP-based)
  if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
    return 'office'; // Generic office format
  }
  
  return 'unknown';
}

/**
 * Get MIME type for format
 */
function getMimeType(format: string): string {
  switch (format.toLowerCase()) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'tiff':
    case 'tif':
      return 'image/tiff';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Get file extension for format
 */
function getFileExtension(format: string): string {
  switch (format.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'jpg';
    case 'tif':
      return 'tiff';
    default:
      return format.toLowerCase();
  }
}