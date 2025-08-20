import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Invalid file size. Max ${MAX_FILE_SIZE / (1024 * 1024)}MB` }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const record = await prisma.file.create({
      data: {
        id,
        userId: session.user.id,
        name: `${id}-${file.name}`,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        path: `in-memory`,
        url: null,
        uploadedBy: session.user.id,
      },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        size: true,
        uploadedAt: true,
      }
    });

    // NOTE: Demo only - not persisting binary. Integrate S3/Supabase for real storage.
    return NextResponse.json({ file: record }, { status: 201 });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json({ error: "Failed to upload" }, { status: 500 });
  }
}


