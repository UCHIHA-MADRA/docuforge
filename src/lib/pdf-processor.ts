import {
  PDFDocument,
  PDFPage,
  PDFFont,
  rgb,
  StandardFonts,
  PageSizes,
  degrees,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// PDF Text editing and formatting interfaces
export interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: { r: number; g: number; b: number };
  bold: boolean;
  italic: boolean;
  underline: boolean;
  alignment: "left" | "center" | "right" | "justify";
  lineHeight: number;
  pageIndex: number;
}

export interface FormattingOptions {
  fontSize?: number;
  fontFamily?: string;
  color?: { r: number; g: number; b: number };
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
}

export interface PDFEditOperation {
  type: "add" | "edit" | "delete" | "move";
  elementId: string;
  data?: Partial<TextElement>;
  position?: { x: number; y: number };
}

export interface PDFProcessingResult {
  success: boolean;
  data?: Uint8Array;
  error?: string;
  textElements?: TextElement[];
  metadata?: PDFMetadata;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
  pageSize: { width: number; height: number };
}

class PDFProcessor {
  private pdfDoc: PDFDocument | null = null;
  private textElements: Map<string, TextElement> = new Map();
  private fonts: Map<string, PDFFont> = new Map();
  private currentElementId = 0;

  /**
   * Load a PDF document from buffer
   */
  async loadPDF(pdfBuffer: Uint8Array): Promise<PDFProcessingResult> {
    try {
      this.pdfDoc = await PDFDocument.load(pdfBuffer);
      this.pdfDoc.registerFontkit(fontkit);

      // Load standard fonts
      await this.loadStandardFonts();

      // Extract existing text elements
      const textElements = await this.extractTextElements();

      // Get metadata
      const metadata = this.extractMetadata();

      return {
        success: true,
        textElements,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load PDF",
      };
    }
  }

  /**
   * Create a new PDF document
   */
  async createNewPDF(
    pageSize: "A4" | "Letter" | "Legal" = "A4"
  ): Promise<PDFProcessingResult> {
    try {
      this.pdfDoc = await PDFDocument.create();
      this.pdfDoc.registerFontkit(fontkit);

      // Add first page
      const page = this.pdfDoc.addPage(PageSizes[pageSize]);

      // Load standard fonts
      await this.loadStandardFonts();

      const metadata: PDFMetadata = {
        pageCount: 1,
        pageSize: { width: page.getWidth(), height: page.getHeight() },
        creationDate: new Date(),
        modificationDate: new Date(),
      };

      return {
        success: true,
        textElements: [],
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create PDF",
      };
    }
  }

  /**
   * Load standard fonts
   */
  private async loadStandardFonts(): Promise<void> {
    if (!this.pdfDoc) return;

    const standardFonts = [
      { name: "Helvetica", font: StandardFonts.Helvetica },
      { name: "Helvetica-Bold", font: StandardFonts.HelveticaBold },
      { name: "Helvetica-Oblique", font: StandardFonts.HelveticaOblique },
      {
        name: "Helvetica-BoldOblique",
        font: StandardFonts.HelveticaBoldOblique,
      },
      { name: "Times-Roman", font: StandardFonts.TimesRoman },
      { name: "Times-Bold", font: StandardFonts.TimesRomanBold },
      { name: "Times-Italic", font: StandardFonts.TimesRomanItalic },
      { name: "Times-BoldItalic", font: StandardFonts.TimesRomanBoldItalic },
      { name: "Courier", font: StandardFonts.Courier },
      { name: "Courier-Bold", font: StandardFonts.CourierBold },
      { name: "Courier-Oblique", font: StandardFonts.CourierOblique },
      { name: "Courier-BoldOblique", font: StandardFonts.CourierBoldOblique },
    ];

    for (const { name, font } of standardFonts) {
      const pdfFont = await this.pdfDoc.embedFont(font);
      this.fonts.set(name, pdfFont);
    }
  }

  /**
   * Extract text elements from PDF (simplified - in real implementation would use pdf-parse or similar)
   */
  private async extractTextElements(): Promise<TextElement[]> {
    // This is a simplified implementation
    // In a real application, you would use libraries like pdf-parse or pdf2json
    // to extract existing text elements with their positions and formatting
    return [];
  }

  /**
   * Extract PDF metadata
   */
  private extractMetadata(): PDFMetadata {
    if (!this.pdfDoc) {
      throw new Error("No PDF document loaded");
    }

    const pages = this.pdfDoc.getPages();
    const firstPage = pages[0];

    return {
      title: this.pdfDoc.getTitle(),
      author: this.pdfDoc.getAuthor(),
      subject: this.pdfDoc.getSubject(),
      keywords:
        this.pdfDoc
          .getKeywords()
          ?.split(",")
          .map((k) => k.trim()) || [],
      creator: this.pdfDoc.getCreator(),
      producer: this.pdfDoc.getProducer(),
      creationDate: this.pdfDoc.getCreationDate(),
      modificationDate: this.pdfDoc.getModificationDate(),
      pageCount: pages.length,
      pageSize: {
        width: firstPage.getWidth(),
        height: firstPage.getHeight(),
      },
    };
  }

  /**
   * Add text element to PDF
   */
  async addTextElement(
    content: string,
    x: number,
    y: number,
    pageIndex: number,
    formatting: FormattingOptions = {}
  ): Promise<string> {
    if (!this.pdfDoc) {
      throw new Error("No PDF document loaded");
    }

    const elementId = `text_${++this.currentElementId}`;
    const pages = this.pdfDoc.getPages();

    if (pageIndex >= pages.length) {
      throw new Error("Page index out of range");
    }

    const page = pages[pageIndex];
    const fontSize = formatting.fontSize || 12;
    const fontFamily = formatting.fontFamily || "Helvetica";
    const color = formatting.color || { r: 0, g: 0, b: 0 };

    // Get font with formatting
    const fontName = this.getFontName(
      fontFamily,
      formatting.bold,
      formatting.italic
    );
    const font = this.fonts.get(fontName) || this.fonts.get("Helvetica")!;

    // Calculate text dimensions
    const textWidth = font.widthOfTextAtSize(content, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    // Create text element
    const textElement: TextElement = {
      id: elementId,
      content,
      x,
      y,
      width: textWidth,
      height: textHeight,
      fontSize,
      fontFamily,
      color,
      bold: formatting.bold || false,
      italic: formatting.italic || false,
      underline: formatting.underline || false,
      alignment: formatting.alignment || "left",
      lineHeight: formatting.lineHeight || 1.2,
      pageIndex,
    };

    this.textElements.set(elementId, textElement);

    // Draw text on page
    await this.drawTextElement(page, textElement);

    return elementId;
  }

  /**
   * Edit existing text element
   */
  async editTextElement(
    elementId: string,
    updates: Partial<TextElement>
  ): Promise<boolean> {
    const element = this.textElements.get(elementId);
    if (!element) {
      return false;
    }

    // Update element
    const updatedElement = { ...element, ...updates };
    this.textElements.set(elementId, updatedElement);

    // Redraw the page
    await this.redrawPage(element.pageIndex);

    return true;
  }

  /**
   * Delete text element
   */
  async deleteTextElement(elementId: string): Promise<boolean> {
    const element = this.textElements.get(elementId);
    if (!element) {
      return false;
    }

    this.textElements.delete(elementId);

    // Redraw the page
    await this.redrawPage(element.pageIndex);

    return true;
  }

  /**
   * Move text element
   */
  async moveTextElement(
    elementId: string,
    x: number,
    y: number
  ): Promise<boolean> {
    return this.editTextElement(elementId, { x, y });
  }

  /**
   * Apply formatting to text element
   */
  async formatTextElement(
    elementId: string,
    formatting: FormattingOptions
  ): Promise<boolean> {
    return this.editTextElement(elementId, formatting);
  }

  /**
   * Get font name based on formatting
   */
  private getFontName(
    fontFamily: string,
    bold?: boolean,
    italic?: boolean
  ): string {
    let fontName = fontFamily;

    if (bold && italic) {
      fontName += "-BoldItalic";
    } else if (bold) {
      fontName += "-Bold";
    } else if (italic) {
      fontName += "-Italic";
    }

    return fontName;
  }

  /**
   * Draw text element on page
   */
  private async drawTextElement(
    page: PDFPage,
    element: TextElement
  ): Promise<void> {
    const fontName = this.getFontName(
      element.fontFamily,
      element.bold,
      element.italic
    );
    const font = this.fonts.get(fontName) || this.fonts.get("Helvetica")!;

    // Handle multi-line text
    const lines = this.wrapText(
      element.content,
      element.width,
      font,
      element.fontSize
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineY = element.y - i * element.fontSize * element.lineHeight;

      let lineX = element.x;

      // Handle text alignment
      if (element.alignment === "center") {
        const lineWidth = font.widthOfTextAtSize(line, element.fontSize);
        lineX = element.x + (element.width - lineWidth) / 2;
      } else if (element.alignment === "right") {
        const lineWidth = font.widthOfTextAtSize(line, element.fontSize);
        lineX = element.x + element.width - lineWidth;
      }

      // Draw text
      page.drawText(line, {
        x: lineX,
        y: lineY,
        size: element.fontSize,
        font,
        color: rgb(element.color.r, element.color.g, element.color.b),
      });

      // Draw underline if needed
      if (element.underline) {
        const lineWidth = font.widthOfTextAtSize(line, element.fontSize);
        page.drawLine({
          start: { x: lineX, y: lineY - 2 },
          end: { x: lineX + lineWidth, y: lineY - 2 },
          thickness: 1,
          color: rgb(element.color.r, element.color.g, element.color.b),
        });
      }
    }
  }

  /**
   * Wrap text to fit within specified width
   */
  private wrapText(
    text: string,
    maxWidth: number,
    font: PDFFont,
    fontSize: number
  ): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [""];
  }

  /**
   * Redraw entire page
   */
  private async redrawPage(pageIndex: number): Promise<void> {
    if (!this.pdfDoc) return;

    const pages = this.pdfDoc.getPages();
    if (pageIndex >= pages.length) return;

    const page = pages[pageIndex];

    // Clear page content (simplified - in real implementation would need more sophisticated clearing)
    // For now, we'll just redraw all text elements on this page

    const pageElements = Array.from(this.textElements.values()).filter(
      (element) => element.pageIndex === pageIndex
    );

    for (const element of pageElements) {
      await this.drawTextElement(page, element);
    }
  }

  /**
   * Add new page
   */
  async addPage(pageSize: "A4" | "Letter" | "Legal" = "A4"): Promise<number> {
    if (!this.pdfDoc) {
      throw new Error("No PDF document loaded");
    }

    const page = this.pdfDoc.addPage(PageSizes[pageSize]);
    const pages = this.pdfDoc.getPages();

    return pages.length - 1;
  }

  /**
   * Delete page
   */
  async deletePage(pageIndex: number): Promise<boolean> {
    if (!this.pdfDoc) {
      throw new Error("No PDF document loaded");
    }

    const pages = this.pdfDoc.getPages();
    if (pageIndex >= pages.length || pages.length <= 1) {
      return false;
    }

    // Remove text elements on this page
    const elementsToRemove = Array.from(this.textElements.entries())
      .filter(([_, element]) => element.pageIndex === pageIndex)
      .map(([id]) => id);

    elementsToRemove.forEach((id) => this.textElements.delete(id));

    // Update page indices for elements on pages after the deleted page
    this.textElements.forEach((element) => {
      if (element.pageIndex > pageIndex) {
        element.pageIndex--;
      }
    });

    // Remove page from document
    this.pdfDoc.removePage(pageIndex);

    return true;
  }

  /**
   * Reorder pages
   */
  async reorderPages(fromIndex: number, toIndex: number): Promise<boolean> {
    if (!this.pdfDoc) {
      throw new Error("No PDF document loaded");
    }

    const pages = this.pdfDoc.getPages();
    if (
      fromIndex >= pages.length ||
      toIndex >= pages.length ||
      fromIndex < 0 ||
      toIndex < 0
    ) {
      return false;
    }

    if (fromIndex === toIndex) {
      return true;
    }

    // Get the page to move
    const pageToMove = pages[fromIndex];

    // Remove the page from its current position
    this.pdfDoc.removePage(fromIndex);

    // Insert the page at the new position
    this.pdfDoc.insertPage(toIndex, pageToMove);

    // Update text element page indices
    this.textElements.forEach((element) => {
      if (element.pageIndex === fromIndex) {
        element.pageIndex = toIndex;
      } else if (fromIndex < toIndex) {
        // Moving page forward
        if (element.pageIndex > fromIndex && element.pageIndex <= toIndex) {
          element.pageIndex--;
        }
      } else {
        // Moving page backward
        if (element.pageIndex >= toIndex && element.pageIndex < fromIndex) {
          element.pageIndex++;
        }
      }
    });

    return true;
  }

  /**
   * Rotate page
   */
  async rotatePage(
    pageIndex: number,
    degrees: 90 | 180 | 270
  ): Promise<boolean> {
    if (!this.pdfDoc) {
      throw new Error("No PDF document loaded");
    }

    const pages = this.pdfDoc.getPages();
    if (pageIndex >= pages.length || pageIndex < 0) {
      return false;
    }

    const page = pages[pageIndex];
    const currentRotation = page.getRotation().angle;
    const newRotation = (currentRotation + degrees) % 360;

    page.setRotation(degrees as any);

    // Update text element positions if needed (rotation affects coordinate system)
    const pageElements = Array.from(this.textElements.values()).filter(
      (element) => element.pageIndex === pageIndex
    );

    if (pageElements.length > 0) {
      const { width, height } = page.getSize();

      pageElements.forEach((element) => {
        // Adjust coordinates based on rotation
        const { x, y } = this.rotateCoordinates(
          element.x,
          element.y,
          width,
          height,
          degrees
        );
        element.x = x;
        element.y = y;
      });

      // Redraw the page with updated elements
      await this.redrawPage(pageIndex);
    }

    return true;
  }

  /**
   * Generate unique element ID
   */
  private generateElementId(): string {
    return `element_${++this.currentElementId}_${Date.now()}`;
  }

  /**
   * Helper method to rotate coordinates
   */
  private rotateCoordinates(
    x: number,
    y: number,
    pageWidth: number,
    pageHeight: number,
    degrees: number
  ): { x: number; y: number } {
    switch (degrees) {
      case 90:
        return { x: y, y: pageWidth - x };
      case 180:
        return { x: pageWidth - x, y: pageHeight - y };
      case 270:
        return { x: pageHeight - y, y: x };
      default:
        return { x, y };
    }
  }

  /**
   * Duplicate page
   */
  async duplicatePage(pageIndex: number): Promise<number> {
    if (!this.pdfDoc) {
      throw new Error("No PDF document loaded");
    }

    const pages = this.pdfDoc.getPages();
    if (pageIndex >= pages.length || pageIndex < 0) {
      return -1;
    }

    const sourcePage = pages[pageIndex];
    const [copiedPage] = await this.pdfDoc.copyPages(this.pdfDoc, [pageIndex]);

    // Insert the copied page after the source page
    this.pdfDoc.insertPage(pageIndex + 1, copiedPage);

    // Duplicate text elements for the new page
    const elementsOnPage = Array.from(this.textElements.values()).filter(
      (element) => element.pageIndex === pageIndex
    );

    elementsOnPage.forEach((element) => {
      const duplicatedElement: TextElement = {
        ...element,
        id: this.generateElementId(),
        pageIndex: pageIndex + 1,
      };
      this.textElements.set(duplicatedElement.id, duplicatedElement);
    });

    // Update page indices for elements on pages after the insertion point
    this.textElements.forEach((element) => {
      if (element.pageIndex > pageIndex + 1) {
        element.pageIndex++;
      }
    });

    return pageIndex + 1;
  }

  /**
   * Update PDF metadata
   */
  updateMetadata(metadata: Partial<PDFMetadata>): void {
    if (!this.pdfDoc) {
      throw new Error("No PDF document loaded");
    }

    if (metadata.title) this.pdfDoc.setTitle(metadata.title);
    if (metadata.author) this.pdfDoc.setAuthor(metadata.author);
    if (metadata.subject) this.pdfDoc.setSubject(metadata.subject);
    if (metadata.keywords) this.pdfDoc.setKeywords(metadata.keywords);
    if (metadata.creator) this.pdfDoc.setCreator(metadata.creator);
    if (metadata.producer) this.pdfDoc.setProducer(metadata.producer);
    if (metadata.creationDate)
      this.pdfDoc.setCreationDate(metadata.creationDate);
    if (metadata.modificationDate)
      this.pdfDoc.setModificationDate(metadata.modificationDate);
  }

  /**
   * Get all text elements
   */
  getTextElements(): TextElement[] {
    return Array.from(this.textElements.values());
  }

  /**
   * Get metadata from the PDF document
   */
  getMetadata(): PDFMetadata {
    return this.extractMetadata();
  }

  /**
   * Get text elements for specific page
   */
  getTextElementsForPage(pageIndex: number): TextElement[] {
    return Array.from(this.textElements.values()).filter(
      (element) => element.pageIndex === pageIndex
    );
  }

  /**
   * Search text in PDF
   */
  searchText(query: string, caseSensitive = false): TextElement[] {
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    return Array.from(this.textElements.values()).filter((element) => {
      const content = caseSensitive
        ? element.content
        : element.content.toLowerCase();
      return content.includes(searchQuery);
    });
  }

  /**
   * Export PDF as buffer
   */
  async exportPDF(): Promise<PDFProcessingResult> {
    if (!this.pdfDoc) {
      return {
        success: false,
        error: "No PDF document loaded",
      };
    }

    try {
      // Update modification date
      this.pdfDoc.setModificationDate(new Date());

      const pdfBytes = await this.pdfDoc.save();

      return {
        success: true,
        data: pdfBytes,
        textElements: this.getTextElements(),
        metadata: this.extractMetadata(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to export PDF",
      };
    }
  }

  /**
   * Apply batch operations
   */
  async applyBatchOperations(operations: PDFEditOperation[]): Promise<boolean> {
    try {
      for (const operation of operations) {
        switch (operation.type) {
          case "add":
            if (operation.data) {
              await this.addTextElement(
                operation.data.content || "",
                operation.data.x || 0,
                operation.data.y || 0,
                operation.data.pageIndex || 0,
                {
                  fontSize: operation.data.fontSize,
                  fontFamily: operation.data.fontFamily,
                  color: operation.data.color,
                  bold: operation.data.bold,
                  italic: operation.data.italic,
                  underline: operation.data.underline,
                  alignment: operation.data.alignment,
                  lineHeight: operation.data.lineHeight,
                }
              );
            }
            break;
          case "edit":
            if (operation.data) {
              await this.editTextElement(operation.elementId, operation.data);
            }
            break;
          case "delete":
            await this.deleteTextElement(operation.elementId);
            break;
          case "move":
            if (operation.position) {
              await this.moveTextElement(
                operation.elementId,
                operation.position.x,
                operation.position.y
              );
            }
            break;
        }
      }
      return true;
    } catch (error) {
      console.error("Batch operations failed:", error);
      return false;
    }
  }
}

export default PDFProcessor;

// Utility functions
export const createPDFProcessor = () => new PDFProcessor();

export const validatePDFBuffer = (buffer: Uint8Array): boolean => {
  // Check PDF header
  const header = new TextDecoder().decode(buffer.slice(0, 5));
  return header === "%PDF-";
};

export const getDefaultFormattingOptions = (): FormattingOptions => ({
  fontSize: 12,
  fontFamily: "Helvetica",
  color: { r: 0, g: 0, b: 0 },
  bold: false,
  italic: false,
  underline: false,
  alignment: "left",
  lineHeight: 1.2,
});
