import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional().default(""),
  visibility: z.enum(["private", "public", "organization"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: { authorId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error listing documents:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, content, visibility } = parsed.data;

    const doc = await prisma.document.create({
      data: {
        title,
        content,
        visibility: visibility ?? "private",
        authorId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


