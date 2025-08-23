import { NextRequest, NextResponse } from 'next/server';
import { ocrService, OCROptions } from '@/lib/ocr-service';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff'];
const SUPPORTED_PDF_TYPE = 'application/pdf';

export async function GET() {
  return NextResponse.json({
    message: 'OCR Text Extraction API',
    version: '1.0.0',
    supportedFormats: {
      images: ['JPEG', 'PNG', 'WebP', 'TIFF'],
      documents: ['PDF']
    },
    maxFileSize: '50MB',
    availableLanguages: await ocrService.getAvailableLanguages(),
    features: [
      'Text extraction from images',
      'Text extraction from PDF documents',
      'Multi-language support',
      'Confidence scoring',
      'Word and line-level results',
      'Bounding box coordinates',
      'Image preprocessing'
    ],
    usage: {
      endpoint: '/api/ocr/extract',
      method: 'POST',
      contentType: 'multipart/form-data',
      parameters: {
        file: 'File to extract text from (required)',
        language: 'OCR language code (optional, default: eng)',
        pageNumbers: 'Comma-separated page numbers for PDF (optional)',
        outputFormat: 'Output format: text, json, detailed (optional, default: text)',
        dpi: 'DPI for PDF rendering (optional, default: 300)',
        preprocessImage: 'Enable image preprocessing (optional, default: true)'
      }
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }

    // Validate file type
    const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
    const isPDF = file.type === SUPPORTED_PDF_TYPE;
    
    if (!isImage && !isPDF) {
      return NextResponse.json(
        { 
          error: 'Unsupported file type',
          supportedTypes: [...SUPPORTED_IMAGE_TYPES, SUPPORTED_PDF_TYPE]
        },
        { status: 400 }
      );
    }

    // Parse options
    const language = (formData.get('language') as string) || 'eng';
    const outputFormat = (formData.get('outputFormat') as string) || 'text';
    const dpi = parseInt((formData.get('dpi') as string) || '300');
    const preprocessImage = (formData.get('preprocessImage') as string) !== 'false';
    
    // Parse page numbers for PDF
    let pageNumbers: number[] | undefined;
    const pageNumbersStr = formData.get('pageNumbers') as string;
    if (pageNumbersStr && isPDF) {
      try {
        pageNumbers = pageNumbersStr
          .split(',')
          .map(num => parseInt(num.trim()))
          .filter(num => !isNaN(num) && num > 0);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid page numbers format. Use comma-separated numbers (e.g., "1,2,3")' },
          { status: 400 }
        );
      }
    }

    const options: OCROptions = {
      language,
      outputFormat: outputFormat as 'text' | 'json' | 'hocr' | 'tsv',
      dpi,
      preprocessImage,
      ...(pageNumbers && { pageNumbers })
    };

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    let result;
    const startTime = Date.now();

    try {
      if (isPDF) {
        // Process PDF
        const pdfResult = await ocrService.extractTextFromPDF(fileBuffer, options);
        
        result = {
          success: true,
          type: 'pdf',
          filename: file.name,
          fileSize: file.size,
          processingTime: Date.now() - startTime,
          pageCount: pdfResult.pageResults.length,
          text: pdfResult.combinedText,
          pages: pdfResult.pageResults.map((pageResult, index) => ({
            pageNumber: pageNumbers ? pageNumbers[index] : index + 1,
            text: pageResult.text,
            confidence: pageResult.confidence,
            wordCount: pageResult.words.length,
            lineCount: pageResult.lines.length
          })),
          metadata: {
            language: options.language,
            dpi: options.dpi,
            preprocessed: options.preprocessImage,
            totalWords: pdfResult.pageResults.reduce((sum, page) => sum + page.words.length, 0),
            averageConfidence: pdfResult.pageResults.reduce((sum, page) => sum + page.confidence, 0) / pdfResult.pageResults.length
          }
        };
      } else {
        // Process image
        const imageResult = await ocrService.extractTextFromImage(fileBuffer, options);
        
        result = {
          success: true,
          type: 'image',
          filename: file.name,
          fileSize: file.size,
          processingTime: Date.now() - startTime,
          text: imageResult.text,
          confidence: imageResult.confidence,
          wordCount: imageResult.words.length,
          lineCount: imageResult.lines.length,
          words: outputFormat === 'json' ? imageResult.words : undefined,
          lines: outputFormat === 'json' ? imageResult.lines : undefined,
          metadata: {
            language: options.language,
            preprocessed: options.preprocessImage,
            dimensions: {
              // These would be available if we extracted them from the image
              width: null,
              height: null
            }
          }
        };
      }

      // Format output based on requested format
      if (outputFormat === 'text') {
        return new NextResponse(result.text, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Processing-Time': result.processingTime.toString(),
            'X-Confidence': result.confidence?.toString() || 'N/A',
            'X-Word-Count': result.wordCount?.toString() || result.metadata?.totalWords?.toString() || 'N/A'
          }
        });
      }

      return NextResponse.json(result);
      
    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);
      return NextResponse.json(
        { 
          error: 'OCR processing failed',
          details: ocrError instanceof Error ? ocrError.message : 'Unknown error',
          processingTime: Date.now() - startTime
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('OCR API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}