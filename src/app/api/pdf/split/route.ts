import { NextRequest, NextResponse } from "next/server";
// Lazy import pdf-lib to satisfy types

// Limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PAGES_TO_EXTRACT = 500; // safety cap

function parsePagesSpec(pagesSpec: string, totalPages: number): number[] {
  // pagesSpec format: "1-3,5,7-9" (1-based indices)
  const selected = new Set<number>();
  const parts = pagesSpec
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = Math.max(1, parseInt(startStr, 10));
      const end = Math.min(totalPages, parseInt(endStr, 10));
      if (Number.isFinite(start) && Number.isFinite(end) && start <= end) {
        for (let i = start; i <= end; i++) selected.add(i - 1);
      }
    } else {
      const idx = Math.min(totalPages, Math.max(1, parseInt(part, 10)));
      if (Number.isFinite(idx)) selected.add(idx - 1);
    }
  }
  return Array.from(selected.values()).sort((a, b) => a - b);
}

export async function GET() {
  return NextResponse.json(
    {
      message: "PDF split endpoint. Send POST with a PDF file and pages specification (e.g., '1-3,5,7-9').",
      limits: {
        maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
        maxPagesToExtract: MAX_PAGES_TO_EXTRACT,
      },
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const pagesSpec = (formData.get("pages") as string | null)?.trim() || "";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Only PDF is supported.` },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Invalid file size. Max ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const { PDFDocument }: any = await import("pdf-lib");
    const srcPdf = await PDFDocument.load(buffer);
    const totalPages = srcPdf.getPageCount();

    if (!pagesSpec) {
      return NextResponse.json(
        { error: "Missing 'pages' parameter (e.g., '1-3,5')" },
        { status: 400 }
      );
    }

    const indices = parsePagesSpec(pagesSpec, totalPages);
    if (indices.length === 0) {
      return NextResponse.json(
        { error: "No valid pages selected" },
        { status: 400 }
      );
    }
    if (indices.length > MAX_PAGES_TO_EXTRACT) {
      return NextResponse.json(
        { error: `Too many pages requested. Max ${MAX_PAGES_TO_EXTRACT}` },
        { status: 400 }
      );
    }

    const out = await PDFDocument.create();
    const pages = await out.copyPages(srcPdf, indices);
    pages.forEach((p: any) => out.addPage(p));
    const bytes = await out.save();

    const response = new NextResponse(new Blob([bytes]), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="extracted-pages.pdf"',
        // Content-Length optional
        "X-Extracted-Pages": indices.length.toString(),
      },
    });

    return response;
  } catch (error) {
    console.error("PDF split error:", error);
    return NextResponse.json(
      { error: "Failed to split PDF" },
      { status: 500 }
    );
  }
}


