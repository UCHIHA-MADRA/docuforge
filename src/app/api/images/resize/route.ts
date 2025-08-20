import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const SUPPORTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function GET() {
  return NextResponse.json(
    {
      message: "Image resize endpoint. Send POST with image file and width/height.",
      limits: {
        maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
        supportedTypes: Array.from(SUPPORTED_TYPES),
      },
      params: {
        width: "number (optional)",
        height: "number (optional)",
        fit: "cover|contain|fill|inside|outside (optional, default inside)",
        format: "jpeg|png|webp|avif (optional, default keep)",
        quality: "1-100 (optional for lossy formats)",
      },
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const width = formData.get("width") as string | null;
    const height = formData.get("height") as string | null;
    const fit = (formData.get("fit") as string | null) || "inside";
    const format = (formData.get("format") as string | null) || "";
    const qualityStr = formData.get("quality") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!SUPPORTED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Invalid file size. Max ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    const widthNum = width ? parseInt(width, 10) : undefined;
    const heightNum = height ? parseInt(height, 10) : undefined;
    if (!widthNum && !heightNum) {
      return NextResponse.json(
        { error: "Provide width or height for resizing" },
        { status: 400 }
      );
    }

    const quality = qualityStr ? Math.max(1, Math.min(100, parseInt(qualityStr, 10))) : 80;

    const input = Buffer.from(await file.arrayBuffer());
    let pipeline = sharp(input).resize({ width: widthNum, height: heightNum, fit: fit as any, withoutEnlargement: true });

    let outType = file.type;
    switch (format) {
      case "jpeg":
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        outType = "image/jpeg";
        break;
      case "png":
        pipeline = pipeline.png({ compressionLevel: 9 });
        outType = "image/png";
        break;
      case "webp":
        pipeline = pipeline.webp({ quality });
        outType = "image/webp";
        break;
      case "avif":
        pipeline = pipeline.avif({ quality });
        outType = "image/avif";
        break;
      default:
        // keep input format
        break;
    }

    const output = await pipeline.toBuffer();

    return new NextResponse(output as any, {
      status: 200,
      headers: {
        "Content-Type": outType,
        "Content-Disposition": `attachment; filename="resized.${format || file.type.split("/")[1]}"`,
        // Content-Length optional in edge/runtime
      },
    });
  } catch (error) {
    console.error("Image resize error:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}


