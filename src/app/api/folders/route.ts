import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const folderSchema = z.object({
  name: z.string().min(1, "Folder name is required").max(100),
  parentId: z.string().optional(),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = folderSchema.parse(body);

    // Create folder in database
    const folder = await prisma.folder.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        parentId: validatedData.parentId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, folder }, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);

    // Log the actual error to help debug
    if (error && typeof error === "object" && "message" in error) {
      console.error("Detailed error:", error.message);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create folder" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");

    // Fetch folders
    const folders = await prisma.folder.findMany({
      where: {
        userId: session.user.id,
        parentId: parentId || null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, folders });
  } catch (error) {
    console.error("Error fetching folders:", error);

    // Log the actual error to help debug
    if (error && typeof error === "object" && "message" in error) {
      console.error("Detailed error:", error.message);
    }

    return NextResponse.json(
      { success: false, error: "Failed to fetch folders" },
      { status: 500 }
    );
  }
}
