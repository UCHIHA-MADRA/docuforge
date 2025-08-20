import { NextRequest, NextResponse } from "next/server";

// Constants for limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB total
const MAX_FILES = 20; // Maximum number of files to merge
const MAX_PAGES = 1000; // Maximum total pages

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    // Edge Case 1: No files provided
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // Edge Case 2: Single file (nothing to merge)
    if (files.length === 1) {
      return NextResponse.json(
        { error: "At least 2 PDF files are required to merge" },
        { status: 400 }
      );
    }

    // Edge Case 3: Too many files
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { 
          error: `Too many files. Maximum allowed: ${MAX_FILES}, received: ${files.length}` 
        },
        { status: 400 }
      );
    }

    // Edge Case 4: File validation and size checks
    let totalSize = 0;
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Check if file exists and has content
        if (!file || file.size === 0) {
          errors.push(`File ${file.name} is empty or corrupted`);
          continue;
        }

        // Check file type
        if (file.type !== "application/pdf") {
          errors.push(`File ${file.name} is not a PDF (type: ${file.type})`);
          continue;
        }

        // Check individual file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(
            `File ${file.name} is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB, max: ${MAX_FILE_SIZE / (1024 * 1024)}MB)`
          );
          continue;
        }

        // Check total size limit
        if (totalSize + file.size > MAX_TOTAL_SIZE) {
          errors.push(
            `Total file size would exceed limit (${MAX_TOTAL_SIZE / (1024 * 1024)}MB)`
          );
          break;
        }

        totalSize += file.size;
        validFiles.push(file);
      } catch (error) {
        errors.push(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Edge Case 5: No valid files after validation
    if (validFiles.length < 2) {
      return NextResponse.json(
        { 
          error: "No valid files to merge",
          details: errors,
          validFilesCount: validFiles.length
        },
        { status: 400 }
      );
    }

    // Edge Case 6: Memory and processing limits
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { 
          error: `Total file size (${(totalSize / (1024 * 1024)).toFixed(2)}MB) exceeds processing limit (${MAX_TOTAL_SIZE / (1024 * 1024)}MB)` 
        },
        { status: 400 }
      );
    }

    // Create a new PDF document
    const { PDFDocument }: any = await import("pdf-lib");
    const mergedPdf = await PDFDocument.create();
    let totalPages = 0;
    const processingErrors: string[] = [];

    // Process each PDF file with comprehensive error handling
    for (const file of validFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Edge Case 7: Check if arrayBuffer is valid
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          processingErrors.push(`File ${file.name} has no content`);
          continue;
        }

        const pdf = await PDFDocument.load(arrayBuffer);
        
        // Edge Case 8: Check page count limits
        const pageCount = pdf.getPageCount();
        if (totalPages + pageCount > MAX_PAGES) {
          processingErrors.push(
            `Total pages would exceed limit (${MAX_PAGES}). Current: ${totalPages}, adding: ${pageCount}`
          );
          continue;
        }

        // Copy all pages from the current PDF
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page: any) => mergedPdf.addPage(page));
        
        totalPages += pageCount;
      } catch (error) {
        // Edge Case 9: Detailed error handling for corrupted files
        let errorMessage = `Failed to process ${file.name}`;
        
        if (error instanceof Error) {
          if (error.message.includes("Invalid PDF")) {
            errorMessage = `File ${file.name} is not a valid PDF or is corrupted`;
          } else if (error.message.includes("Password")) {
            errorMessage = `File ${file.name} is password protected`;
          } else if (error.message.includes("memory")) {
            errorMessage = `File ${file.name} is too complex to process`;
          } else {
            errorMessage = `Error processing ${file.name}: ${error.message}`;
          }
        }
        
        processingErrors.push(errorMessage);
        console.error(`PDF processing error for ${file.name}:`, error);
      }
    }

    // Edge Case 10: No pages were successfully processed
    if (totalPages === 0) {
      return NextResponse.json(
        { 
          error: "No pages could be processed from the provided files",
          details: processingErrors
        },
        { status: 400 }
      );
    }

    // Edge Case 11: Check if we have enough pages to merge
    if (totalPages < 2) {
      return NextResponse.json(
        { 
          error: "At least 2 pages are required to create a merged PDF",
          details: processingErrors
        },
        { status: 400 }
      );
    }

    // Save the merged PDF with error handling
    let mergedPdfBytes: Uint8Array;
    try {
      mergedPdfBytes = await mergedPdf.save();
    } catch (error) {
      console.error("Error saving merged PDF:", error);
      return NextResponse.json(
        { 
          error: "Failed to create merged PDF",
          details: "Error occurred while saving the merged document"
        },
        { status: 500 }
      );
    }

    // Edge Case 12: Check if merged PDF is valid
    if (!mergedPdfBytes || mergedPdfBytes.length === 0) {
      return NextResponse.json(
        { error: "Generated PDF is empty or invalid" },
        { status: 500 }
      );
    }

    // Create response with merged PDF
    const response = new NextResponse(mergedPdfBytes as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="merged-document.pdf"',
        "X-Processed-Files": validFiles.length.toString(),
        "X-Total-Pages": totalPages.toString(),
        "X-Total-Size": totalSize.toString(),
      },
    });

    // Log success with warnings if there were processing errors
    if (processingErrors.length > 0) {
      console.warn("PDF merge completed with warnings:", processingErrors);
    }

    return response;
  } catch (error) {
    // Edge Case 13: Unexpected errors
    console.error("Unexpected PDF merge error:", error);
    
    let errorMessage = "Failed to merge PDF files";
    if (error instanceof Error) {
      if (error.message.includes("memory")) {
        errorMessage = "Insufficient memory to process files";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Processing timeout - files may be too complex";
      } else {
        errorMessage = `Unexpected error: ${error.message}`;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: "PDF merge endpoint. Send POST request with PDF files.",
      limits: {
        maxFiles: MAX_FILES,
        maxFileSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        maxTotalSize: `${MAX_TOTAL_SIZE / (1024 * 1024)}MB`,
        maxPages: MAX_PAGES
      }
    },
    { status: 200 }
  );
}
