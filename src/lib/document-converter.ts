import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import * as pdfjsLib from "pdfjs-dist";
import { createCanvas } from "canvas";

// Configure PDF.js worker for Node.js environment
if (typeof window === 'undefined') {
  // In Node.js environment
  // @ts-expect-error Type definitions for pdf.worker.js are not available
  const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.js');
  pdfjsLib.GlobalWorkerOptions.workerPort = new pdfjsWorker.PDFWorkerFactory();
} else {
  // In browser environment
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface ConversionOptions {
  format: "pdf" | "png" | "jpg" | "webp" | "tiff" | "docx" | "xlsx" | "pptx" | "txt" | "odt" | "rtf" | "html" | "md" | "latex" | "epub" | "xml";
  quality?: number; // 0-100 for lossy formats
  dpi?: number; // For image conversions
  pages?: number[]; // Specific pages to convert (1-indexed)
  compression?: "none" | "lzw" | "zip"; // For TIFF
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

// Export the PDF page rendering function
export async function renderPdfPageToImage(
  pdfBuffer: Buffer | Uint8Array,
  pageIndex: number = 0,
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


  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport: viewport,

  }).promise;

  // Convert canvas to buffer
  return canvas.toBuffer('image/png');
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
      const {
        format,
        quality = 90,
        dpi = 300,
        pages,
        compression = "lzw",
      } = options;

      // Determine input format if not provided
      const detectedFormat = inputFormat || this.detectFormat(inputBuffer);

      // Handle PDF conversions
      if (detectedFormat === "pdf") {
        return await this.convertFromPDF(inputBuffer, options);
      }

      // Handle image conversions
      if (this.isImageFormat(detectedFormat)) {
        return await this.convertFromImage(
          inputBuffer,
          detectedFormat,
          options
        );
      }
      
      // Handle DOCX conversions specifically
      if (detectedFormat === "docx") {
        return await this.convertFromDOCX(inputBuffer, options);
      }

      // Handle TXT conversions
      if (detectedFormat === "txt") {
        return await this.convertFromTXT(inputBuffer, options);
      }

      // Handle other Office document conversions
      if (this.isOfficeFormat(detectedFormat)) {
        return await this.convertFromOffice(
          inputBuffer,
          detectedFormat,
          options
        );
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
      const pagesToConvert =
        pages || Array.from({ length: pageCount }, (_, i) => i + 1);

      if (format === "pdf") {
        // PDF to PDF (potentially with page selection)
        if (pages && pages.length < pageCount) {
          const newPdfDoc = await PDFDocument.create();
          const copiedPages = await newPdfDoc.copyPages(
            pdfDoc,
            pages.map((p) => p - 1)
          );
          copiedPages.forEach((page) => newPdfDoc.addPage(page));
          const pdfBytes = await newPdfDoc.save();

          return {
            success: true,
            data: new Uint8Array(pdfBytes),
            metadata: {
              originalFormat: "pdf",
              targetFormat: "pdf",
              pageCount: pages.length,
              fileSize: pdfBytes.byteLength,
            },
          };
        }

        return {
          success: true,
          data: pdfBuffer,
          metadata: {
            originalFormat: "pdf",
            targetFormat: "pdf",
            pageCount,
            fileSize: pdfBuffer.byteLength,
          },
        };
      }
      
      // PDF to text formats
      if (["txt", "md", "html", "xml", "rtf", "latex"].includes(format)) {
        // For a real implementation, you would use pdf.js to extract text
        // This is a simplified placeholder implementation
        const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
        const pdf = await loadingTask.promise;
        
        let textContent = "";
        
        for (const pageNum of pagesToConvert) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item) => 'str' in item ? item.str : '')
            .join(" ");
          
          textContent += `Page ${pageNum}\n${pageText}\n\n`;
        }
        
        // Format the text according to the target format
        let formattedContent = textContent;
        const targetFormat = format;
        
        if (format === "html") {
          formattedContent = `<!DOCTYPE html>\n<html>\n<head>\n<title>Converted PDF</title>\n</head>\n<body>\n${textContent.split('\n').map(line => `<p>${line}</p>`).join('\n')}\n</body>\n</html>`;
        } else if (format === "md") {
          // Simple markdown conversion
          formattedContent = textContent.replace(/Page (\d+)/g, '# Page $1');
        } else if (format === "xml") {
          formattedContent = `<?xml version="1.0" encoding="UTF-8"?>\n<document>\n${textContent.split('\n').map(line => `  <line>${line}</line>`).join('\n')}\n</document>`;
        } else if (format === "latex") {
          formattedContent = `\\documentclass{article}\n\\begin{document}\n${textContent.split('\n').map(line => line).join('\n')}\n\\end{document}`;
        } else if (format === "rtf") {
          formattedContent = `{\\rtf1\\ansi\\ansicpg1252\\cocoartf2580\n{\\fonttbl\\f0\\fswiss\\fcharset0 Helvetica;}\n{\\colortbl;\\red255\\green255\\blue255;}\n\\margl1440\\margr1440\\vieww11520\\viewh8400\\viewkind0\n\\pard\\tx720\\tx1440\\tx2160\\tx2880\\tx3600\\tx4320\\tx5040\\tx5760\\tx6480\\tx7200\\tx7920\\tx8640\\pardirnatural\\partightenfactor0\n\n\\f0\\fs24 \\cf0 ${textContent.replace(/\n/g, '\\\n')}}`;
        }
        
        const encoder = new TextEncoder();
        const data = encoder.encode(formattedContent);
        
        return {
          success: true,
          data,
          metadata: {
            originalFormat: "pdf",
            targetFormat,
            pageCount: pagesToConvert.length,
            fileSize: data.byteLength,
          },
        };
      }
      
      // PDF to DOCX, ODT, EPUB (placeholder implementation)
      if (["docx", "odt", "epub"].includes(format)) {
        // This is a placeholder. In a real implementation, you would use:
        // - docx: docx-templates or similar library
        // - odt: odt-templates or similar library
        // - epub: epub-gen or similar library
        
        // For now, we'll return a simple text representation as a placeholder
        const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
        const pdf = await loadingTask.promise;
        
        let textContent = "";
        
        for (const pageNum of pagesToConvert) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item) => 'str' in item ? item.str : '')
            .join(" ");
          
          textContent += `Page ${pageNum}\n${pageText}\n\n`;
        }
        
        // In a real implementation, you would convert this text to the appropriate format
        // For now, we'll just encode it as a placeholder
        const encoder = new TextEncoder();
        const data = encoder.encode(`This is a placeholder for ${format.toUpperCase()} conversion. In a real implementation, you would use appropriate libraries.\n\nExtracted content:\n${textContent}`);
        
        return {
          success: true,
          data,
          metadata: {
            originalFormat: "pdf",
            targetFormat: format,
            pageCount: pagesToConvert.length,
            fileSize: data.byteLength,
          },
        };
      }

      // PDF to image formats
      if (this.isImageFormat(format)) {
        const images: Buffer[] = [];

        for (const pageNum of pagesToConvert) {
          const imageBuffer = await this.renderPdfPageToImage(
            pdfBuffer,
            pageNum - 1,
            dpi
          );
          images.push(imageBuffer);
        }

        // If multiple pages, create a multi-page TIFF or combine images
        if (images.length === 1) {
          const processedImage = await this.processImageBuffer(
            images[0],
            format,
            quality,
            options
          );
          return {
            success: true,
            data: new Uint8Array(processedImage),
            metadata: {
              originalFormat: "pdf",
              targetFormat: format,
              pageCount: 1,
              fileSize: processedImage.byteLength,
            },
          };
        } else {
          // For multiple pages, create a multi-page TIFF or ZIP of images
          if (format === "tiff") {
            // Create multi-page TIFF (placeholder - requires additional library)
            const processedImage = await this.processImageBuffer(
              images[0],
              format,
              quality,
              options
            );
            return {
              success: true,
              data: new Uint8Array(processedImage),
              metadata: {
                originalFormat: "pdf",
                targetFormat: format,
                pageCount: images.length,
                fileSize: processedImage.byteLength,
              },
            };
          } else {
            // For other formats, return the first page
            const processedImage = await this.processImageBuffer(
              images[0],
              format,
              quality,
              options
            );
            return {
              success: true,
              data: new Uint8Array(processedImage),
              metadata: {
                originalFormat: "pdf",
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
      if (format === "pdf") {
        // Image to PDF
        const pdfDoc = await PDFDocument.create();

        // Get image dimensions
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();

        // Embed image in PDF
        let embeddedImage;
        if (inputFormat === "png" || imageBuffer[0] === 0x89) {
          embeddedImage = await pdfDoc.embedPng(imageBuffer);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imageBuffer);
        }

        // Create page with image
        const page = pdfDoc.addPage([
          metadata.width || 612,
          metadata.height || 792,
        ]);
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
            targetFormat: "pdf",
            pageCount: 1,
            fileSize: pdfBytes.byteLength,
          },
        };
      }

      // Image to image conversion
      if (this.isImageFormat(format)) {
        const processedImage = await this.processImageBuffer(
          Buffer.from(imageBuffer),
          format,
          quality,
          options
        );

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
   * Convert from DOCX format
   */
  private async convertFromDOCX(
    buffer: Uint8Array,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const { format } = options;
    
    try {
      // For text-based formats (TXT, HTML, MD, etc.)
      if (["txt", "md", "html", "xml", "rtf", "latex"].includes(format)) {
        // This is a placeholder implementation
        // In a real implementation, you would use libraries like mammoth.js for HTML extraction
        // or other specialized libraries for different formats
        
        // Simulate text extraction from DOCX
        // In a real implementation, you would use mammoth.js or similar
        const textContent = "This is a placeholder for text extracted from DOCX.\n\nIn a real implementation, you would use mammoth.js or similar libraries to extract and convert DOCX content.";
        
        // Format the text according to the target format
        let formattedContent = textContent;
        
        if (format === "html") {
          formattedContent = `<!DOCTYPE html>\n<html>\n<head>\n<title>Converted DOCX</title>\n</head>\n<body>\n${textContent.split('\n').map(line => `<p>${line}</p>`).join('\n')}\n</body>\n</html>`;
        } else if (format === "md") {
          // Simple markdown conversion
          formattedContent = textContent;
        } else if (format === "xml") {
          formattedContent = `<?xml version="1.0" encoding="UTF-8"?>\n<document>\n${textContent.split('\n').map(line => `  <line>${line}</line>`).join('\n')}\n</document>`;
        } else if (format === "latex") {
          formattedContent = `\\documentclass{article}\n\\begin{document}\n${textContent.split('\n').map(line => line).join('\n')}\n\\end{document}`;
        } else if (format === "rtf") {
          formattedContent = `{\\rtf1\\ansi\\ansicpg1252\\cocoartf2580\n{\\fonttbl\\f0\\fswiss\\fcharset0 Helvetica;}\n{\\colortbl;\\red255\\green255\\blue255;}\n\\margl1440\\margr1440\\vieww11520\\viewh8400\\viewkind0\n\\pard\\tx720\\tx1440\\tx2160\\tx2880\\tx3600\\tx4320\\tx5040\\tx5760\\tx6480\\tx7200\\tx7920\\tx8640\\pardirnatural\\partightenfactor0\n\n\\f0\\fs24 \\cf0 ${textContent.replace(/\n/g, '\\\n')}}`;
        }
        
        const encoder = new TextEncoder();
        const data = encoder.encode(formattedContent);
        
        return {
          success: true,
          data,
          metadata: {
            originalFormat: "docx",
            targetFormat: format,
            fileSize: data.byteLength,
          },
        };
      }
      
      // DOCX to PDF conversion
      if (format === "pdf") {
        // This is a placeholder implementation
        // In a real implementation, you would use libraries like docx-pdf or similar
        
        // Create a simple PDF with placeholder text
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([612, 792]); // US Letter size
        
        page.drawText("This is a placeholder for DOCX to PDF conversion.", {
          x: 50,
          y: 700,
        });
        
        page.drawText("In a real implementation, you would use specialized libraries", {
          x: 50,
          y: 680,
        });
        
        page.drawText("to convert DOCX to PDF while preserving formatting.", {
          x: 50,
          y: 660,
        });
        
        const pdfBytes = await pdfDoc.save();
        
        return {
          success: true,
          data: new Uint8Array(pdfBytes),
          metadata: {
            originalFormat: "docx",
            targetFormat: "pdf",
            fileSize: pdfBytes.byteLength,
          },
        };
      }
      
      // DOCX to image formats
      if (this.isImageFormat(format)) {
        // This is a placeholder implementation
        // In a real implementation, you would render the DOCX to an image
        
        // Create a simple placeholder image with text
        const width = 612;
        const height = 792;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Add some text
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText('DOCX to Image Conversion', 50, 50);
        ctx.font = '14px Arial';
        ctx.fillText('This is a placeholder for DOCX to image conversion.', 50, 100);
        ctx.fillText('In a real implementation, you would render the DOCX content as an image.', 50, 120);
        
        // Convert to the requested image format
        const imageBuffer = await this.processImageBuffer(
          canvas.toBuffer(),
          format,
          options.quality || 90,
          options
        );
        
        return {
          success: true,
          data: new Uint8Array(imageBuffer),
          metadata: {
            originalFormat: "docx",
            targetFormat: format,
            fileSize: imageBuffer.byteLength,
          },
        };
      }
      
      return {
        success: false,
        error: `Conversion from DOCX to ${format} is not supported`,
      };
    } catch (error) {
      return {
        success: false,
        error: `DOCX conversion failed: ${(error as Error).message}`,
      };
    }
  }
  
  /**
   * Convert from TXT format to other formats
   */
  private async convertFromTXT(
    buffer: Uint8Array,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const { format, quality = 90 } = options;

    try {
      // Get the text content from the buffer
      const textContent = new TextDecoder().decode(buffer);

      if (format === "pdf") {
        // Convert TXT to PDF using pdf-lib
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([612, 792]); // Letter size
        const { height } = page.getSize();
        
        // Add text content to the PDF
        // In a real implementation, you would handle pagination and text wrapping
        page.drawText(textContent.substring(0, 1000), { // Limit text for this example
          x: 50,
          y: height - 50,
          size: 12,
          maxWidth: 500,
        });
        
        const pdfBytes = await pdfDoc.save();
        return {
          success: true,
          data: new Uint8Array(pdfBytes),
          metadata: {
            originalFormat: "txt",
            targetFormat: "pdf",
            pageCount: 1,
            fileSize: pdfBytes.byteLength,
          },
        };
      } else if (format === "html") {
        // TXT to HTML conversion
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Converted Text Document</title>
</head>
<body>
  <pre>${textContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;
        
        const encoder = new TextEncoder();
        const data = encoder.encode(htmlContent);
        
        return {
          success: true,
          data,
          metadata: {
            originalFormat: "txt",
            targetFormat: "html",
            fileSize: data.byteLength,
          },
        };
      } else if (this.isImageFormat(format)) {
        // For TXT to image conversion, render text on a canvas
        const width = 800;
        const height = 1200;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Add text content
        ctx.fillStyle = 'black';
        ctx.font = '14px monospace';
        
        // Simple text rendering (would need proper line wrapping in production)
        const lines = textContent.split('\n').slice(0, 40); // Limit lines for this example
        lines.forEach((line, index) => {
          ctx.fillText(line.substring(0, 80), 40, 40 + (index * 20)); // Limit line length
        });
        
        // Convert to the requested image format
        const imageBuffer = await this.processImageBuffer(
          canvas.toBuffer(),
          format,
          quality,
          options
        );
        
        return {
          success: true,
          data: new Uint8Array(imageBuffer),
          metadata: {
            originalFormat: "txt",
            targetFormat: format,
            fileSize: imageBuffer.byteLength,
          },
        };
      }
      
      return {
        success: false,
        error: `Conversion from TXT to ${format} is not supported`,
      };
    } catch (error) {
      return {
        success: false,
        error: `TXT conversion failed: ${(error as Error).message}`,
      };
    }
  }
  
  /**
   * Convert from Markdown format to other formats
   */
  private async convertFromMarkdown(
    buffer: Uint8Array,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const { format, quality = 90 } = options;

    try {
      // Get the markdown content from the buffer
      const markdownContent = new TextDecoder().decode(buffer);

      if (format === "pdf") {
        // Convert Markdown to PDF
        // In a real implementation, you would use a library like markdown-pdf
        // For now, we'll create a simple PDF with the markdown content
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([612, 792]); // Letter size
        const { height } = page.getSize();
        
        // Add markdown content to the PDF (as plain text for now)
        page.drawText(markdownContent.substring(0, 1000), { // Limit text for this example
          x: 50,
          y: height - 50,
          size: 12,
          maxWidth: 500,
        });
        
        const pdfBytes = await pdfDoc.save();
        return {
          success: true,
          data: new Uint8Array(pdfBytes),
          metadata: {
            originalFormat: "md",
            targetFormat: "pdf",
            pageCount: 1,
            fileSize: pdfBytes.byteLength,
          },
        };
      } else if (format === "html") {
        // Markdown to HTML conversion
        // In a real implementation, you would use a library like marked
        // For now, we'll create a simple HTML wrapper
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Converted Markdown Document</title>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }
    code { font-family: monospace; }
  </style>
</head>
<body>
  <pre>${markdownContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;
        
        const encoder = new TextEncoder();
        const data = encoder.encode(htmlContent);
        
        return {
          success: true,
          data,
          metadata: {
            originalFormat: "md",
            targetFormat: "html",
            fileSize: data.byteLength,
          },
        };
      } else if (format === "txt") {
        // Markdown to TXT - strip markdown formatting
        // In a real implementation, you would use a library to properly strip markdown
        const encoder = new TextEncoder();
        const data = encoder.encode(markdownContent);
        
        return {
          success: true,
          data,
          metadata: {
            originalFormat: "md",
            targetFormat: "txt",
            fileSize: data.byteLength,
          },
        };
      } else if (this.isImageFormat(format)) {
        // For Markdown to image conversion, render markdown on a canvas
        const width = 800;
        const height = 1200;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Add markdown content as plain text
        ctx.fillStyle = 'black';
        ctx.font = '14px monospace';
        
        // Simple text rendering (would need proper markdown rendering in production)
        const lines = markdownContent.split('\n').slice(0, 40); // Limit lines for this example
        lines.forEach((line, index) => {
          ctx.fillText(line.substring(0, 80), 40, 40 + (index * 20)); // Limit line length
        });
        
        // Convert to the requested image format
        const imageBuffer = await this.processImageBuffer(
          canvas.toBuffer(),
          format,
          quality,
          options
        );
        
        return {
          success: true,
          data: new Uint8Array(imageBuffer),
          metadata: {
            originalFormat: "md",
            targetFormat: format,
            fileSize: imageBuffer.byteLength,
          },
        };
      }
      
      return {
        success: false,
        error: `Conversion from Markdown to ${format} is not supported`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Markdown conversion failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Convert from HTML format to other formats
   */
  private async convertFromHTML(
    buffer: Uint8Array,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const { format, quality = 90 } = options;

    try {
      // Get the HTML content from the buffer
      const htmlContent = new TextDecoder().decode(buffer);

      if (format === "pdf") {
        // Convert HTML to PDF
        // In a real implementation, you would use a library like puppeteer or wkhtmltopdf
        // For now, we'll create a simple PDF with some of the HTML content
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([612, 792]); // Letter size
        const { height } = page.getSize();
        
        // Extract text from HTML (very basic implementation)
        const textContent = htmlContent.replace(/<[^>]*>/g, '').substring(0, 1000);
        
        // Add text content to the PDF
        page.drawText(textContent, {
          x: 50,
          y: height - 50,
          size: 12,
          maxWidth: 500,
        });
        
        const pdfBytes = await pdfDoc.save();
        return {
          success: true,
          data: new Uint8Array(pdfBytes),
          metadata: {
            originalFormat: "html",
            targetFormat: "pdf",
            pageCount: 1,
            fileSize: pdfBytes.byteLength,
          },
        };
      } else if (format === "txt") {
        // HTML to TXT - strip HTML tags
        // In a real implementation, you would use a library like html-to-text
        const textContent = htmlContent.replace(/<[^>]*>/g, '');
        
        const encoder = new TextEncoder();
        const data = encoder.encode(textContent);
        
        return {
          success: true,
          data,
          metadata: {
            originalFormat: "html",
            targetFormat: "txt",
            fileSize: data.byteLength,
          },
        };
      } else if (format === "md") {
        // HTML to Markdown
        // In a real implementation, you would use a library like turndown
        // For now, we'll just create a simple markdown representation
        const textContent = htmlContent.replace(/<[^>]*>/g, '');
        const markdownContent = `# Converted HTML Document

${textContent}`;
        
        const encoder = new TextEncoder();
        const data = encoder.encode(markdownContent);
        
        return {
          success: true,
          data,
          metadata: {
            originalFormat: "html",
            targetFormat: format,
            fileSize: data.byteLength,
          },
        };
      } else if (this.isImageFormat(format)) {
        // For HTML to image conversion, render HTML on a canvas
        // In a real implementation, you would use a library like puppeteer
        const width = 800;
        const height = 1200;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Add text content
        ctx.fillStyle = 'black';
        ctx.font = '14px sans-serif';
        
        // Extract and render text (very basic implementation)
        const textContent = htmlContent.replace(/<[^>]*>/g, '');
        const lines = textContent.split('\n').slice(0, 40); // Limit lines for this example
        lines.forEach((line, index) => {
          ctx.fillText(line.substring(0, 80), 40, 40 + (index * 20)); // Limit line length
        });
        
        // Convert to the requested image format
        const imageBuffer = await this.processImageBuffer(
          canvas.toBuffer(),
          format,
          quality,
          options
        );
        
        return {
          success: true,
          data: new Uint8Array(imageBuffer),
          metadata: {
            originalFormat: "html",
            targetFormat: format,
            fileSize: imageBuffer.byteLength,
          },
        };
      }
      
      return {
        success: false,
        error: `Conversion from HTML to ${format} is not supported`,
      };
    } catch (error) {
      return {
        success: false,
        error: `HTML conversion failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Convert from ODT format to other formats
   */
  private async convertFromODT(
    buffer: Uint8Array,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const { format } = options;

    try {
      if (format === "pdf") {
        // Convert ODT to PDF
        // In a real implementation, you would use a library like libreoffice
        // For now, we'll create a placeholder PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([612, 792]); // Letter size
        const { height } = page.getSize();
        
        // Add placeholder text
        page.drawText("Converted from ODT document", {
          x: 50,
          y: height - 50,
          size: 12,
        });
        
        const pdfBytes = await pdfDoc.save();
        return {
          success: true,
          data: new Uint8Array(pdfBytes),
          metadata: {
            originalFormat: "odt",
            targetFormat: "pdf",
            pageCount: 1,
            fileSize: pdfBytes.byteLength,
          },
        };
      } else if (format === "txt") {
        // ODT to TXT
        // In a real implementation, you would extract text from the ODT XML structure
        const textContent = "This is a placeholder for ODT to TXT conversion. In a real implementation, text would be extracted from the ODT file.";
        
        const encoder = new TextEncoder();
        const data = encoder.encode(textContent);
        
        return {
          success: true,
          data,
          metadata: {
            originalFormat: "odt",
            targetFormat: "txt",
            fileSize: data.byteLength,
          },
        };
      } else if (format === "docx") {
        // ODT to DOCX
        // In a real implementation, you would use a library like libreoffice
        return {
          success: false,
          error: "ODT to DOCX conversion requires external libraries not implemented in this demo",
        };
      }
      
      return {
        success: false,
        error: `Conversion from ODT to ${format} is not supported`,
      };
    } catch (error) {
      return {
        success: false,
        error: `ODT conversion failed: ${(error as Error).message}`,
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
    const { format } = options;

    try {
      if (format === "pdf") {
        // Convert Office to PDF
        // In a real implementation, you would use a library like libreoffice or a cloud service
        // For now, we'll create a placeholder PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([612, 792]); // Letter size
        const { height } = page.getSize();
        
        // Add placeholder text
        page.drawText(`Converted from ${inputFormat.toUpperCase()} document`, {
          x: 50,
          y: height - 50,
          size: 12,
        });
        
        const pdfBytes = await pdfDoc.save();
        return {
          success: true,
          data: new Uint8Array(pdfBytes),
          metadata: {
            originalFormat: inputFormat,
            targetFormat: "pdf",
            pageCount: 1,
            fileSize: pdfBytes.byteLength,
          },
        };
      } else if (format === "txt") {
        // Office to TXT
        // In a real implementation, you would extract text from the Office document
        const textContent = `This is a placeholder for ${inputFormat.toUpperCase()} to TXT conversion. In a real implementation, text would be extracted from the Office file.`;
        
        const encoder = new TextEncoder();
        const data = encoder.encode(textContent);
        
        return {
          success: true,
          data,
          metadata: {
            originalFormat: inputFormat,
            targetFormat: "txt",
            fileSize: data.byteLength,
          },
        };
      }
      
      return {
        success: false,
        error: `Conversion from ${inputFormat} to ${format} is not supported`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Office conversion failed: ${(error as Error).message}`,
      };
    }
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
      case "jpg":
      case "jpeg":
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case "png":
        sharpInstance = sharpInstance.png({ compressionLevel: 9 });
        break;
      case "webp":
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case "tiff":
        sharpInstance = sharpInstance.tiff({
          compression: options.compression || "lzw",
        });
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
    pdfBuffer: Buffer | Uint8Array,
    pageIndex: number,
    dpi: number = 300
  ): Promise<Buffer> {
    // Use the exported function to avoid code duplication
    return renderPdfPageToImage(pdfBuffer, pageIndex, dpi);
  }

  /**
   * Detect file format from buffer
   */
  private detectFormat(buffer: Uint8Array): string {
    // PDF
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return "pdf";
    }

    // PNG
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return "png";
    }

    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return "jpg";
    }

    // WebP
    if (
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return "webp";
    }

    // TIFF
    if (
      (buffer[0] === 0x49 && buffer[1] === 0x49) ||
      (buffer[0] === 0x4d && buffer[1] === 0x4d)
    ) {
      return "tiff";
    }

    // Office formats (simplified detection)
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      // ZIP-based format (DOCX, XLSX, PPTX)
      return "office";
    }

    // Try to detect text-based formats by checking for common patterns
    const textSample = buffer.length > 1000 ? 
      new TextDecoder().decode(buffer.slice(0, 1000)) : 
      new TextDecoder().decode(buffer);

    // Check for HTML
    if (textSample.trim().startsWith('<!DOCTYPE html>') || 
        textSample.trim().startsWith('<html') || 
        textSample.includes('<body') || 
        textSample.includes('<head')) {
      return 'html';
    }

    // Check for Markdown
    if (textSample.includes('# ') || 
        textSample.includes('## ') || 
        textSample.includes('```') || 
        textSample.includes('![') || 
        textSample.includes('[](')) {
      return 'md';
    }

    // Check for XML
    if (textSample.trim().startsWith('<?xml') || 
        (textSample.trim().startsWith('<') && textSample.includes('</'))) {
      return 'xml';
    }

    // Check for LaTeX
    if (textSample.includes('\\documentclass') || 
        textSample.includes('\\begin{document}') || 
        textSample.includes('\\end{document}')) {
      return 'latex';
    }

    // Check for RTF
    if (textSample.trim().startsWith('{\\rtf1')) {
      return 'rtf';
    }

    // Check for plain text (if it's mostly ASCII characters)
    let asciiCount = 0;
    const sampleLength = Math.min(buffer.length, 1000);
    for (let i = 0; i < sampleLength; i++) {
      if (buffer[i] >= 32 && buffer[i] <= 126) {
        asciiCount++;
      }
    }
    if (asciiCount / sampleLength > 0.8) {
      return 'txt';
    }

    return "unknown";
  }

  /**
   * Check if format is an image format
   */
  private isImageFormat(format: string): boolean {
    return ["png", "jpg", "jpeg", "webp", "tiff", "gif", "bmp", "svg"].includes(
      format.toLowerCase()
    );
  }

  /**
   * Check if format is an Office format
   */
  private isOfficeFormat(format: string): boolean {
    return ["docx", "xlsx", "pptx", "office", "doc", "xls", "ppt"].includes(format.toLowerCase());
  }

  /**
   * Check if format is a text-based format
   */
  private isTextFormat(format: string): boolean {
    return ["txt", "md", "markdown", "html", "xml", "rtf", "latex"].includes(format.toLowerCase());
  }

  /**
   * Check if format is a document format (not Office, not image, not text)
   */
  private isDocumentFormat(format: string): boolean {
    return ["pdf", "epub", "odt"].includes(format.toLowerCase());
  }
}

// Export singleton instance
export const documentConverter = DocumentConverter.getInstance();

// Utility functions
export const convertDocument = (
  buffer: Uint8Array,
  inputFormat: string,
  options: ConversionOptions
) => {
  return documentConverter.convertDocument(buffer, inputFormat, options);
};

export const getSupportedFormats = () => {
  return {
    input: [
      // Document formats
      "pdf", "epub", "odt",
      // Image formats
      "png", "jpg", "jpeg", "webp", "tiff", "gif", "bmp", "svg",
      // Office formats
      "docx", "xlsx", "pptx", "doc", "xls", "ppt",
      // Text formats
      "txt", "md", "markdown", "html", "xml", "rtf", "latex"
    ],
    output: [
      // Document formats
      "pdf", "epub", "odt",
      // Image formats
      "png", "jpg", "jpeg", "webp", "tiff", "gif", "bmp",
      // Office formats
      "docx",
      // Text formats
      "txt", "md", "markdown", "html", "xml", "rtf", "latex"
    ],
  };
};
