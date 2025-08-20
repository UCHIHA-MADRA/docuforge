import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  visibility: z.enum(["private", "public", "organization"]).optional(),
  status: z.enum(["draft", "published", "archived", "deleted"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doc = await prisma.document.findFirst({
      where: { id: params.id, authorId: session.user.id },
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

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.document.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        // lightweight wordCount update if content provided
        ...(parsed.data.content
          ? { wordCount: parsed.data.content.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length }
          : {}),
        lastEditedBy: session.user.id,
        lastEditedAt: new Date(),
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

    return NextResponse.json({ document: updated });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.document.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


