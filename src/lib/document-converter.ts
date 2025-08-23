import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from 'canvas';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ConversionOptions {
  format: 'pdf' | 'png' | 'jpg' | 'webp' | 'tiff' | 'docx' | 'xlsx' | 'pptx';
  quality?: number; // 0-100 for lossy formats
  dpi?: number; // For image conversions
  pages?: number[]; // Specific pages to convert (1-indexed)
  compression?: 'none' | 'lzw' | 'zip'; // For TIFF
}

export interface ConversionResult {
  success: boolean;
  data?: Uint8Array;
  error?: string;
  metadata?: {
    originalFormat: string;
    targetFormat: string;
    pageCount?: number;
    fileSize: number;
  };
}

export class DocumentConverter {
  private static instance: DocumentConverter;

  public static getInstance(): DocumentConverter {
    if (!DocumentConverter.instance) {
      DocumentConverter.instance = new DocumentConverter();
    }
    return DocumentConverter.instance;
  }

  /**
   * Convert document to specified format
   */
  async convertDocument(
    inputBuffer: Uint8Array,
    inputFormat: string,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    try {
      const { format, quality = 90, dpi = 300, pages, compression = 'lzw' } = options;

      // Determine input format if not provided
      const detectedFormat = inputFormat || this.detectFormat(inputBuffer);

      // Handle PDF conversions
      if (detectedFormat === 'pdf') {
        return await this.convertFromPDF(inputBuffer, options);
      }

      // Handle image conversions
      if (this.isImageFormat(detectedFormat)) {
        return await this.convertFromImage(inputBuffer, detectedFormat, options);
      }

      // Handle Office document conversions (placeholder)
      if (this.isOfficeFormat(detectedFormat)) {
        return await this.convertFromOffice(inputBuffer, detectedFormat, options);
      }

      return {
        success: false,
        error: `Unsupported input format: ${detectedFormat}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Conversion failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Convert PDF to other formats
   */
  private async convertFromPDF(
    pdfBuffer: Uint8Array,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const { format, quality = 90, dpi = 300, pages } = options;

    try {
      // Load PDF document
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();

      // Determine which pages to convert
      const pagesToConvert = pages || Array.from({ length: pageCount }, (_, i) => i + 1);

      if (format === 'pdf') {
        // PDF to PDF (potentially with page selection)
        if (pages && pages.length < pageCount) {
          const newPdfDoc = await PDFDocument.create();
          const copiedPages = await newPdfDoc.copyPages(pdfDoc, pages.map(p => p - 1));
          copiedPages.forEach(page => newPdfDoc.addPage(page));
          const pdfBytes = await newPdfDoc.save();
          
          return {
            success: true,
            data: new Uint8Array(pdfBytes),
            metadata: {
              originalFormat: 'pdf',
              targetFormat: 'pdf',
              pageCount: pages.length,
              fileSize: pdfBytes.byteLength,
            },
          };
        }
        
        return {
          success: true,
          data: pdfBuffer,
          metadata: {
            originalFormat: 'pdf',
            targetFormat: 'pdf',
            pageCount,
            fileSize: pdfBuffer.byteLength,
          },
        };
      }

      // PDF to image formats
      if (this.isImageFormat(format)) {
        const images: Buffer[] = [];
        
        for (const pageNum of pagesToConvert) {
          const imageBuffer = await this.renderPdfPageToImage(pdfBuffer, pageNum - 1, dpi);
          images.push(imageBuffer);
        }

        // If multiple pages, create a multi-page TIFF or combine images
        if (images.length === 1) {
          const processedImage = await this.processImageBuffer(images[0], format, quality, options);
          return {
            success: true,
            data: new Uint8Array(processedImage),
            metadata: {
              originalFormat: 'pdf',
              targetFormat: format,
              pageCount: 1,
              fileSize: processedImage.byteLength,
            },
          };
        } else {
          // For multiple pages, create a multi-page TIFF or ZIP of images
          if (format === 'tiff') {
            // Create multi-page TIFF (placeholder - requires additional library)
            const processedImage = await this.processImageBuffer(images[0], format, quality, options);
            return {
              success: true,
              data: new Uint8Array(processedImage),
              metadata: {
                originalFormat: 'pdf',
                targetFormat: format,
                pageCount: images.length,
                fileSize: processedImage.byteLength,
              },
            };
          } else {
            // For other formats, return the first page
            const processedImage = await this.processImageBuffer(images[0], format, quality, options);
            return {
              success: true,
              data: new Uint8Array(processedImage),
              metadata: {
                originalFormat: 'pdf',
                targetFormat: format,
                pageCount: 1,
                fileSize: processedImage.byteLength,
              },
            };
          }
        }
      }

      return {
        success: false,
        error: `Unsupported target format: ${format}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `PDF conversion failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Convert image to other formats
   */
  private async convertFromImage(
    imageBuffer: Uint8Array,
    inputFormat: string,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const { format, quality = 90 } = options;

    try {
      if (format === 'pdf') {
        // Image to PDF
        const pdfDoc = await PDFDocument.create();
        
        // Get image dimensions
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();
        
        // Embed image in PDF
        let embeddedImage;
        if (inputFormat === 'png' || imageBuffer[0] === 0x89) {
          embeddedImage = await pdfDoc.embedPng(imageBuffer);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imageBuffer);
        }
        
        // Create page with image
        const page = pdfDoc.addPage([metadata.width || 612, metadata.height || 792]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: metadata.width || 612,
          height: metadata.height || 792,
        });
        
        const pdfBytes = await pdfDoc.save();
        
        return {
          success: true,
          data: new Uint8Array(pdfBytes),
          metadata: {
            originalFormat: inputFormat,
            targetFormat: 'pdf',
            pageCount: 1,
            fileSize: pdfBytes.byteLength,
          },
        };
      }

      // Image to image conversion
      if (this.isImageFormat(format)) {
        const processedImage = await this.processImageBuffer(Buffer.from(imageBuffer), format, quality, options);
        
        return {
          success: true,
          data: new Uint8Array(processedImage),
          metadata: {
            originalFormat: inputFormat,
            targetFormat: format,
            fileSize: processedImage.byteLength,
          },
        };
      }

      return {
        success: false,
        error: `Unsupported conversion from ${inputFormat} to ${format}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Image conversion failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Convert Office documents (placeholder implementation)
   */
  private async convertFromOffice(
    buffer: Uint8Array,
    inputFormat: string,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    // This is a placeholder for Office document conversion
    // In a real implementation, you would use libraries like:
    // - mammoth for DOCX to HTML/PDF
    // - xlsx for Excel file processing
    // - officegen for creating Office documents
    
    return {
      success: false,
      error: `Office document conversion from ${inputFormat} to ${options.format} is not yet implemented. This requires additional libraries like mammoth, xlsx, or similar.`,
    };
  }

  /**
   * Process image buffer with Sharp
   */
  private async processImageBuffer(
    imageBuffer: Buffer,
    format: string,
    quality: number,
    options: ConversionOptions
  ): Promise<Buffer> {
    let sharpInstance = sharp(imageBuffer);

    switch (format) {
      case 'jpg':
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ compressionLevel: 9 });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'tiff':
        sharpInstance = sharpInstance.tiff({ compression: options.compression || 'lzw' });
        break;
      default:
        throw new Error(`Unsupported image format: ${format}`);
    }

    return await sharpInstance.toBuffer();
  }

  /**
   * Render PDF page to image buffer
   */
  private async renderPdfPageToImage(
    pdfBuffer: Uint8Array,
    pageIndex: number,
    dpi: number = 300
  ): Promise<Buffer> {
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdfDocument = await loadingTask.promise;
    
    // Get the specified page
    const page = await pdfDocument.getPage(pageIndex + 1);
    
    // Calculate scale based on DPI (default PDF DPI is 72)
    const scale = dpi / 72;
    const viewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    // Render page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    
await page.render({
  canvasContext: context as unknown as CanvasRenderingContext2D,
  viewport: viewport,
  canvas: canvas as unknown as HTMLCanvasElement
}).promise;
    
    // Convert canvas to buffer
    return canvas.toBuffer('image/png');
  }

  /**
   * Detect file format from buffer
   */
  private detectFormat(buffer: Uint8Array): string {
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
    
    // Office formats (simplified detection)
    if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
      // ZIP-based format (DOCX, XLSX, PPTX)
      return 'office';
    }
    
    return 'unknown';
  }

  /**
   * Check if format is an image format
   */
  private isImageFormat(format: string): boolean {
    return ['png', 'jpg', 'jpeg', 'webp', 'tiff'].includes(format.toLowerCase());
  }

  /**
   * Check if format is an Office format
   */
  private isOfficeFormat(format: string): boolean {
    return ['docx', 'xlsx', 'pptx', 'office'].includes(format.toLowerCase());
  }
}

// Export singleton instance
export const documentConverter = DocumentConverter.getInstance();

// Utility functions
export const convertDocument = (buffer: Uint8Array, inputFormat: string, options: ConversionOptions) => {
  return documentConverter.convertDocument(buffer, inputFormat, options);
};

export const getSupportedFormats = () => {
  return {
    input: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'tiff', 'docx', 'xlsx', 'pptx'],
    output: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'tiff'],
    // Note: Office format output requires additional libraries
  };
};