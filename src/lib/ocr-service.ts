import { createWorker, Worker } from 'tesseract.js';
import { renderPdfPageToImage } from './document-converter';

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
  lines: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
    words: Array<{
      text: string;
      confidence: number;
      bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
      };
    }>;
  }>;
}

export interface OCROptions {
  language?: string;
  pageNumbers?: number[];
  outputFormat?: 'text' | 'json' | 'hocr' | 'tsv';
  dpi?: number;
  preprocessImage?: boolean;
}

export class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;

  async initialize(language: string = 'eng'): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      this.worker = await createWorker(language, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      
      await this.worker.setParameters({
        tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
        tessedit_char_whitelist: '', // Allow all characters
        preserve_interword_spaces: '1',
      });
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      throw new Error('OCR initialization failed');
    }
  }

  async extractTextFromImage(
    imageBuffer: Buffer | Uint8Array,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    if (!this.worker || !this.isInitialized) {
      await this.initialize(options.language);
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      // Preprocess image if requested
      let processedImage = imageBuffer;
      if (options.preprocessImage) {
        processedImage = await this.preprocessImage(imageBuffer);
      }

      const { data } = await this.worker.recognize(processedImage);
      
      return {
        text: data.text,
        confidence: data.confidence,
        words: data.words.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        })),
        lines: data.lines.map(line => ({
          text: line.text,
          confidence: line.confidence,
          bbox: line.bbox,
          words: line.words.map(word => ({
            text: word.text,
            confidence: word.confidence,
            bbox: word.bbox
          }))
        }))
      };
    } catch (error) {
      console.error('OCR text extraction failed:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  async extractTextFromPDF(
    pdfBuffer: Buffer,
    options: OCROptions = {}
  ): Promise<{ pageResults: OCRResult[]; combinedText: string }> {
    if (!this.worker || !this.isInitialized) {
      await this.initialize(options.language);
    }

    try {
      // Load PDF and get page count
      const pdfDoc = await import('pdf-lib').then(lib => lib.PDFDocument.load(pdfBuffer));
      const pageCount = pdfDoc.getPageCount();
      
      // Determine which pages to process
      const pagesToProcess = options.pageNumbers || Array.from({ length: pageCount }, (_, i) => i + 1);
      
      const pageResults: OCRResult[] = [];
      const combinedTextParts: string[] = [];

      for (const pageNumber of pagesToProcess) {
        if (pageNumber < 1 || pageNumber > pageCount) {
          console.warn(`Skipping invalid page number: ${pageNumber}`);
          continue;
        }

        try {
          // Convert PDF page to image
          const imageBuffer = await renderPdfPageToImage(
            pdfBuffer,
            pageNumber,
            options.dpi || 300
          );

          // Extract text from the image
          const ocrResult = await this.extractTextFromImage(imageBuffer, {
            ...options,
            preprocessImage: true // Always preprocess for PDF pages
          });

          pageResults.push(ocrResult);
          combinedTextParts.push(`--- Page ${pageNumber} ---\n${ocrResult.text}\n`);
        } catch (error) {
          console.error(`Failed to process page ${pageNumber}:`, error);
          pageResults.push({
            text: '',
            confidence: 0,
            words: [],
            lines: []
          });
          combinedTextParts.push(`--- Page ${pageNumber} ---\n[Error processing page]\n`);
        }
      }

      return {
        pageResults,
        combinedText: combinedTextParts.join('\n')
      };
    } catch (error) {
      console.error('PDF OCR processing failed:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  private async preprocessImage(imageBuffer: Buffer | Uint8Array): Promise<Buffer> {
    try {
      const sharp = await import('sharp');
      
      // Apply image preprocessing to improve OCR accuracy
      const processedBuffer = await sharp.default(imageBuffer)
        .greyscale() // Convert to grayscale
        .normalize() // Normalize contrast
        .sharpen() // Sharpen the image
        .threshold(128) // Apply threshold for better text contrast
        .png() // Convert to PNG for better quality
        .toBuffer();
      
      return processedBuffer;
    } catch (error) {
      console.warn('Image preprocessing failed, using original:', error);
      return Buffer.from(imageBuffer);
    }
  }

  async getAvailableLanguages(): Promise<string[]> {
    // Common Tesseract language codes
    return [
      'eng', // English
      'spa', // Spanish
      'fra', // French
      'deu', // German
      'ita', // Italian
      'por', // Portuguese
      'rus', // Russian
      'chi_sim', // Chinese Simplified
      'chi_tra', // Chinese Traditional
      'jpn', // Japanese
      'kor', // Korean
      'ara', // Arabic
      'hin', // Hindi
      'tha', // Thai
      'vie', // Vietnamese
    ];
  }

  async changeLanguage(language: string): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
    await this.initialize(language);
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  // Utility method to format OCR results
  formatResults(result: OCRResult, format: 'text' | 'json' | 'detailed' = 'text'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      
      case 'detailed':
        let output = `Text (Confidence: ${result.confidence.toFixed(2)}%):\n`;
        output += `${result.text}\n\n`;
        output += `Lines: ${result.lines.length}\n`;
        output += `Words: ${result.words.length}\n`;
        return output;
      
      case 'text':
      default:
        return result.text;
    }
  }
}

// Export a singleton instance
export const ocrService = new OCRService();