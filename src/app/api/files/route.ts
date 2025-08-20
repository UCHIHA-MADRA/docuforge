import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const files = await prisma.file.findMany({
      where: { userId: session.user.id },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        name: true,
        originalName: true,
        mimeType: true,
        size: true,
        url: true,
        uploadedAt: true,
      },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error listing files:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


