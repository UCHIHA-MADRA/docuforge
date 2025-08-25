import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import * as pdfjsLib from "pdfjs-dist";
import { renderPdfPageToImage } from "@/lib/document-converter";

// Configure PDF.js worker for different environments
const configurePdfWorker = async () => {
  if (typeof window === "undefined") {
    // In Node.js environment
    try {
      // Use dynamic import for Node.js worker
      const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.entry");

      pdfjsLib.GlobalWorkerOptions.workerSrc = (
        pdfjsWorker as { default: string }
      ).default;
    } catch (error) {
      // Fallback: use the standard worker path
      console.warn("Failed to load pdf.worker.entry dynamically:", error);
      pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve(
        "pdfjs-dist/legacy/build/pdf.worker.js"
      );
    }
  } else {
    // In browser environment
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
};

// Initialize worker configuration
configurePdfWorker();

// Constants for limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PAGES = 100; // Maximum pages to convert
const DEFAULT_DPI = 300; // Default DPI for conversion
const MAX_DPI = 600; // Maximum allowed DPI
const SUPPORTED_FORMATS = ["png", "jpg", "webp", "tiff"]; // Supported output formats
const DEFAULT_FORMAT = "png"; // Default output format

export async function GET() {
  return NextResponse.json(
    {
      message:
        "PDF conversion endpoint. Send POST with a PDF file and optional parameters.",
      limits: {
        maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
        maxPages: MAX_PAGES,
        defaultDPI: DEFAULT_DPI,
        maxDPI: MAX_DPI,
        supportedFormats: SUPPORTED_FORMATS,
        defaultFormat: DEFAULT_FORMAT,
      },
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Ensure worker is configured
    await configurePdfWorker();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    // Get conversion parameters
    const format = (
      formData.get("format")?.toString() || DEFAULT_FORMAT
    ).toLowerCase();
    const dpiParam = formData.get("dpi")?.toString() || DEFAULT_DPI.toString();
    const dpi = Math.min(
      MAX_DPI,
      Math.max(72, parseInt(dpiParam, 10) || DEFAULT_DPI)
    );
    const pageParam = formData.get("page")?.toString() || "1";
    const page = Math.max(1, parseInt(pageParam, 10) || 1);

    // Validate file
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds the maximum limit of ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
        },
        { status: 400 }
      );
    }

    // Check file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF files are supported." },
        { status: 400 }
      );
    }

    // Validate format
    if (!SUPPORTED_FORMATS.includes(format)) {
      return NextResponse.json(
        {
          error: `Unsupported output format. Supported formats: ${SUPPORTED_FORMATS.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Read the file
    const fileBuffer = await file.arrayBuffer();

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(fileBuffer);

    // Check if page exists
    const pageCount = pdfDoc.getPageCount();
    if (page > pageCount) {
      return NextResponse.json(
        {
          error: `Page ${page} does not exist. Document has ${pageCount} pages.`,
        },
        { status: 400 }
      );
    }

    // Extract the specified page
    const newPdfDoc = await PDFDocument.create();
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [page - 1]);
    newPdfDoc.addPage(copiedPage);

    // Render PDF page to image using pdf.js and canvas
    const imageBuffer = await renderPdfPageToImage(
      new Uint8Array(fileBuffer),
      page - 1,
      dpi
    );

    // Process with sharp for format conversion
    let sharpInstance = sharp(imageBuffer);

    // Set format-specific options
    switch (format) {
      case "jpg":
        sharpInstance = sharpInstance.jpeg({ quality: 90 });
        break;
      case "png":
        sharpInstance = sharpInstance.png({ compressionLevel: 9 });
        break;
      case "webp":
        sharpInstance = sharpInstance.webp({ quality: 90 });
        break;
      case "tiff":
        sharpInstance = sharpInstance.tiff({ compression: "lzw" });
        break;
    }

    // Convert to buffer
    const outputBuffer = await sharpInstance.toBuffer();

    // Create response with converted image
    const response = new NextResponse(outputBuffer);

    // Set appropriate headers
    response.headers.set("Content-Type", `image/${format}`);
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="page_${page}.${format}"`
    );
    response.headers.set("Content-Length", outputBuffer.byteLength.toString());

    return response;
  } catch (error) {
    console.error("PDF conversion error:", error);
    return NextResponse.json(
      { error: `Failed to convert PDF: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
