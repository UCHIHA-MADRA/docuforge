import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import os from "os";

const execAsync = promisify(exec);

// Configuration constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MIN_COMPRESSION_QUALITY = 0.1;
const MAX_COMPRESSION_QUALITY = 1.0;
const DEFAULT_COMPRESSION_QUALITY = 0.7;
const TEMP_DIR = process.env.TEMP_DIR || os.tmpdir();
const PDFCPU_TIMEOUT = 30000; // 30 seconds
const MAX_PARALLEL_JOBS = 3;

// Track active compression jobs to prevent overload
let activeJobs = 0;

interface CompressionResult {
  buffer: Uint8Array;
  originalSize: number;
  compressedSize: number;
  method: "pdf-lib" | "pdfcpu" | "pdf-lib-fallback";
  compressionRatio: number;
  savedPercentage: number;
  processingTime: number;
}

interface CompressionOptions {
  quality: number;
  removeMetadata: boolean;
  optimizeImages: boolean;
  useAdvancedCompression: boolean;
}

export async function GET() {
  const pdfcpuAvailable = await checkPdfcpuAvailability();

  return NextResponse.json({
    message: "Hybrid PDF compression endpoint using pdf-lib + pdfcpu",
    status: {
      pdfcpuAvailable,
      activeJobs: activeJobs,
      maxParallelJobs: MAX_PARALLEL_JOBS,
    },
    usage: {
      method: "POST",
      parameters: {
        file: "PDF file (required)",
        quality: `${MIN_COMPRESSION_QUALITY}-${MAX_COMPRESSION_QUALITY} (optional, default: ${DEFAULT_COMPRESSION_QUALITY})`,
        removeMetadata: "boolean (optional, default: true)",
        optimizeImages: "boolean (optional, default: true)",
        useAdvancedCompression:
          "boolean (optional, default: true - uses pdfcpu if available)",
      },
    },
    limits: {
      maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
      timeoutSeconds: PDFCPU_TIMEOUT / 1000,
      maxParallelJobs: MAX_PARALLEL_JOBS,
    },
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const tempFiles: string[] = [];

  try {
    // Check if we're at capacity
    if (activeJobs >= MAX_PARALLEL_JOBS) {
      return NextResponse.json(
        {
          error:
            "Server busy. Too many active compression jobs. Please try again later.",
        },
        { status: 429 }
      );
    }

    activeJobs++;

    // Parse form data and validate
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    const validation = await validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Parse options
    const options = parseCompressionOptions(formData);

    console.log(
      `Starting compression: ${file.name} (${(file.size / 1024 / 1024).toFixed(
        2
      )}MB)`
    );

    // Read file buffer
    const fileBuffer = await file.arrayBuffer();

    // Perform compression
    const result = await compressPDF(fileBuffer, options, tempFiles);

    const processingTime = Date.now() - startTime;
    result.processingTime = processingTime;

    console.log(
      `Compression completed: ${result.method}, ${result.savedPercentage}% saved, ${processingTime}ms`
    );

    // Create response
    const response = new NextResponse(Buffer.from(result.buffer));
    response.headers.set("Content-Type", "application/pdf");
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="compressed_${file.name}"`
    );
    response.headers.set("Content-Length", result.compressedSize.toString());

    // Compression metadata headers
    response.headers.set("X-Compression-Method", result.method);
    response.headers.set("X-Original-Size", result.originalSize.toString());
    response.headers.set("X-Compressed-Size", result.compressedSize.toString());
    response.headers.set(
      "X-Compression-Ratio",
      result.compressionRatio.toString()
    );
    response.headers.set(
      "X-Saved-Bytes",
      (result.originalSize - result.compressedSize).toString()
    );
    response.headers.set("X-Saved-Percentage", `${result.savedPercentage}%`);
    response.headers.set("X-Processing-Time", `${result.processingTime}ms`);

    return response;
  } catch (error) {
    console.error("PDF compression error:", error);

    const errorMessage = getErrorMessage(error);
    const statusCode = getErrorStatusCode(error);

    return NextResponse.json(
      {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  } finally {
    activeJobs--;
    // Clean up temp files
    await cleanupTempFiles(tempFiles);
  }
}

async function validateFile(
  file: File
): Promise<{ valid: boolean; error?: string }> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return { valid: false, error: "File must have a .pdf extension" };
  }

  if (
    file.type !== "application/pdf" &&
    file.type !== "application/octet-stream"
  ) {
    return {
      valid: false,
      error: "Invalid file type. Only PDF files are supported.",
    };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(
        2
      )}MB) exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  // Basic PDF header check
  const headerBuffer = await file.slice(0, 8).arrayBuffer();
  const header = new TextDecoder().decode(headerBuffer);
  if (!header.startsWith("%PDF-")) {
    return { valid: false, error: "File does not appear to be a valid PDF" };
  }

  return { valid: true };
}

function parseCompressionOptions(formData: FormData): CompressionOptions {
  const quality = Math.max(
    MIN_COMPRESSION_QUALITY,
    Math.min(
      MAX_COMPRESSION_QUALITY,
      parseFloat(
        formData.get("quality")?.toString() ||
          DEFAULT_COMPRESSION_QUALITY.toString()
      )
    )
  );

  return {
    quality,
    removeMetadata: formData.get("removeMetadata")?.toString() !== "false",
    optimizeImages: formData.get("optimizeImages")?.toString() !== "false",
    useAdvancedCompression:
      formData.get("useAdvancedCompression")?.toString() !== "false",
  };
}

async function compressPDF(
  inputBuffer: ArrayBuffer,
  options: CompressionOptions,
  tempFiles: string[]
): Promise<CompressionResult> {
  const originalSize = inputBuffer.byteLength;

  // Try advanced compression first (pdfcpu)
  if (options.useAdvancedCompression) {
    try {
      const pdfcpuResult = await compressWithPdfcpu(
        inputBuffer,
        options,
        tempFiles
      );
      if (pdfcpuResult) {
        return {
          ...pdfcpuResult,
          originalSize,
          method: "pdfcpu",
          processingTime: 0, // Will be set by caller
        };
      }
    } catch (error) {
      console.warn(
        "pdfcpu compression failed, falling back to pdf-lib:",
        error
      );
    }
  }

  // Fallback to pdf-lib compression
  const pdflibResult = await compressWithPdfLib(inputBuffer, options);
  return {
    ...pdflibResult,
    originalSize,
    method: options.useAdvancedCompression ? "pdf-lib-fallback" : "pdf-lib",
    processingTime: 0, // Will be set by caller
  };
}

async function compressWithPdfcpu(
  inputBuffer: ArrayBuffer,
  options: CompressionOptions,
  tempFiles: string[]
): Promise<Omit<
  CompressionResult,
  "originalSize" | "method" | "processingTime"
> | null> {
  // Check if pdfcpu is available
  if (!(await checkPdfcpuAvailability())) {
    return null;
  }

  const tempId = crypto.randomUUID();
  const inputPath = path.join(TEMP_DIR, `input-${tempId}.pdf`);
  const outputPath = path.join(TEMP_DIR, `output-${tempId}.pdf`);

  tempFiles.push(inputPath, outputPath);

  try {
    // Write input file
    await fs.writeFile(inputPath, new Uint8Array(inputBuffer));

    // Build pdfcpu command based on options
    let command = `pdfcpu optimize`;

    // Add quality/compression options
    if (options.quality < 0.5) {
      command += ` -q high`; // High compression for low quality setting
    } else if (options.quality < 0.8) {
      command += ` -q medium`;
    } else {
      command += ` -q low`; // Low compression for high quality setting
    }

    if (options.optimizeImages) {
      command += ` -i`;
    }

    command += ` "${inputPath}" "${outputPath}"`;

    // Execute with timeout
    console.log(`Executing: ${command}`);
    await execAsync(command, {
      timeout: PDFCPU_TIMEOUT,
      maxBuffer: MAX_FILE_SIZE * 2, // Allow buffer for large files
    });

    // Check if output file was created and has content
    const stats = await fs.stat(outputPath);
    if (stats.size === 0) {
      throw new Error("pdfcpu produced empty output file");
    }

    // Read compressed result
    const compressedBuffer = await fs.readFile(outputPath);
    const compressedSize = compressedBuffer.byteLength;

    // Calculate compression stats
    const compressionRatio = parseFloat(
      (inputBuffer.byteLength / compressedSize).toFixed(2)
    );
    const savedPercentage = parseFloat(
      (
        ((inputBuffer.byteLength - compressedSize) / inputBuffer.byteLength) *
        100
      ).toFixed(2)
    );

    return {
      buffer: compressedBuffer,
      compressedSize,
      compressionRatio,
      savedPercentage,
    };
  } catch (error) {
    console.error("pdfcpu compression error:", error);
    throw error;
  }
}

async function compressWithPdfLib(
  inputBuffer: ArrayBuffer,
  options: CompressionOptions
): Promise<
  Omit<CompressionResult, "originalSize" | "method" | "processingTime">
> {
  try {
    // Load PDF with error handling
    const pdfDoc = await PDFDocument.load(inputBuffer, {
      updateMetadata: false,
      capNumbers: false,
      throwOnInvalidObject: false,
      parseSpeed: 0, // Fastest parsing
    });

    // Apply optimizations
    if (options.removeMetadata) {
      await removeMetadata(pdfDoc);
    }

    // Save with compression options
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: Math.min(50, Math.floor(inputBuffer.byteLength / 100000)), // Scale based on file size
      updateFieldAppearances: false,
    });

    const compressedSize = compressedBytes.byteLength;
    const compressionRatio = parseFloat(
      (inputBuffer.byteLength / compressedSize).toFixed(2)
    );
    const savedPercentage = parseFloat(
      (
        ((inputBuffer.byteLength - compressedSize) / inputBuffer.byteLength) *
        100
      ).toFixed(2)
    );

    return {
      buffer: compressedBytes,
      compressedSize,
      compressionRatio,
      savedPercentage,
    };
  } catch (error) {
    console.error("pdf-lib compression error:", error);
    throw new Error(
      `PDF processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function removeMetadata(pdfDoc: PDFDocument): Promise<void> {
  try {
    pdfDoc.setTitle("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer("");
    pdfDoc.setCreator("");
    pdfDoc.setCreationDate(new Date(0));
    pdfDoc.setModificationDate(new Date(0));
  } catch (error) {
    console.warn("Failed to remove metadata:", error);
  }
}

async function checkPdfcpuAvailability(): Promise<boolean> {
  try {
    await execAsync("pdfcpu version", { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function cleanupTempFiles(tempFiles: string[]): Promise<void> {
  for (const file of tempFiles) {
    try {
      await fs.unlink(file);
    } catch (error) {
      console.warn(`Failed to delete temp file ${file}:`, error);
    }
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("timeout")) {
      return "Compression timeout - file too large or complex";
    }
    if (
      error.message.includes("Invalid PDF") ||
      error.message.includes("corrupted")
    ) {
      return "Invalid or corrupted PDF file";
    }
    if (error.message.includes("memory") || error.message.includes("ENOMEM")) {
      return "File too large to process - insufficient memory";
    }
    if (error.message.includes("ENOSPC")) {
      return "Insufficient disk space for processing";
    }
    if (error.message.includes("pdfcpu")) {
      return "Advanced compression failed - using basic compression";
    }
    return error.message;
  }
  return "Unknown compression error occurred";
}

function getErrorStatusCode(error: unknown): number {
  if (error instanceof Error) {
    if (error.message.includes("timeout")) return 408;
    if (
      error.message.includes("Invalid PDF") ||
      error.message.includes("corrupted")
    )
      return 400;
    if (error.message.includes("memory") || error.message.includes("ENOSPC"))
      return 413;
    if (error.message.includes("busy")) return 429;
  }
  return 500;
}
