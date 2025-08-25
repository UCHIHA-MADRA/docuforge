import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { z } from "zod";
import crypto from "crypto";
import {
  storeEncryptedFile,
  validateFile,
  initializeStorage,
  FileMetadata,
} from "@/lib/encrypted-storage";
import { getUserWithRoles } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Initialize storage on startup
initializeStorage().catch(console.error);

const uploadSchema = z.object({
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  organizationId: z.string().optional(),
  visibility: z.enum(["private", "organization", "public"]).default("private"),
});

interface UploadResponse {
  success: boolean;
  fileId?: string;
  message?: string;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadResponse>> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user with roles for permission checking
    const userWithRoles = await getUserWithRoles(session.user.id);
    if (!userWithRoles) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metadataJson = formData.get("metadata") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Parse and validate metadata
    let metadata;
    try {
      const parsedMetadata = metadataJson ? JSON.parse(metadataJson) : {};
      metadata = uploadSchema.parse(parsedMetadata);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid metadata format" },
        { status: 400 }
      );
    }

    // Validate file
    try {
      validateFile({
        size: file.size,
        type: file.type,
        name: file.name,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "File validation failed",
        },
        { status: 400 }
      );
    }

    // Check organization access if specified
    if (metadata.organizationId) {
      const orgMember = userWithRoles.organizationRoles.find(
        (role) => role.organizationId === metadata.organizationId
      );

      if (!orgMember) {
        return NextResponse.json(
          { success: false, error: "Access denied to organization" },
          { status: 403 }
        );
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Generate file ID and create metadata
    const fileId = crypto.randomUUID();
    const fileMetadata: FileMetadata = {
      id: fileId,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      checksum: crypto.createHash("sha256").update(fileBuffer).digest("hex"),
      uploadedBy: session.user.id,
      uploadedAt: new Date(),
      tags: metadata.tags,
      description: metadata.description,
    };

    // Generate user encryption key (in production, this should be derived from user's master key)
    const userKey =
      process.env.USER_ENCRYPTION_KEY || "default-key-for-development";

    // Store encrypted file
    const encryptedFileRecord = await storeEncryptedFile(
      fileBuffer,
      fileMetadata,
      session.user.id,
      userKey
    );

    // Create document record if it's a document type
    if (
      file.type === "application/pdf" ||
      file.type.includes("word") ||
      file.type.includes("sheet") ||
      file.type.includes("presentation")
    ) {
      await prisma.document.create({
        data: {
          id: crypto.randomUUID(),
          title: file.name,
          content: "", // Will be populated by processing
          userId: session.user.id,
          fileId: fileId,
          organizationId: metadata.organizationId,
          visibility: metadata.visibility as 'PUBLIC' | 'PRIVATE' | 'ORGANIZATION',
          status: "DRAFT",
        },
      });
    }

    // Log the upload activity
    await prisma.analyticsEvent.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        event: "file_upload",
        category: "file", // Using category instead of resourceType
        metadata: JSON.stringify({
          resourceId: fileId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          organizationId: metadata.organizationId,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      fileId: encryptedFileRecord.id,
      message: "File uploaded and encrypted successfully",
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}

// Get upload limits and allowed file types
export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/csv",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ],
      supportedFormats: {
        documents: ["PDF", "Word", "Excel", "PowerPoint", "Text", "CSV"],
        images: ["JPEG", "PNG", "GIF", "WebP"],
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to get upload configuration" },
      { status: 500 }
    );
  }
}
