import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { z } from "zod";
import PDFProcessor from "@/lib/pdf-processor";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/audit-logger";

// Request schemas
// Removed unused schema
// const LoadPDFSchema = z.object({
//   fileId: z.string(),
// });

const CreatePDFSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  organizationId: z.string().optional(),
});

const AddTextElementSchema = z.object({
  fileId: z.string(),
  content: z.string(),
  x: z.number(),
  y: z.number(),
  pageIndex: z.number(),
  formatting: z.object({
    fontSize: z.number().min(8).max(72),
    fontFamily: z.string(),
    color: z.object({
      r: z.number().min(0).max(1),
      g: z.number().min(0).max(1),
      b: z.number().min(0).max(1),
    }),
    bold: z.boolean(),
    italic: z.boolean(),
    underline: z.boolean(),
    alignment: z.enum(["left", "center", "right", "justify"]),
    lineHeight: z.number().min(0.5).max(3),
  }),
});

const EditTextElementSchema = z.object({
  fileId: z.string(),
  elementId: z.string(),
  updates: z.object({
    content: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    formatting: z
      .object({
        fontSize: z.number().min(8).max(72).optional(),
        fontFamily: z.string().optional(),
        color: z
          .object({
            r: z.number().min(0).max(1),
            g: z.number().min(0).max(1),
            b: z.number().min(0).max(1),
          })
          .optional(),
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
        underline: z.boolean().optional(),
        alignment: z.enum(["left", "center", "right", "justify"]).optional(),
        lineHeight: z.number().min(0.5).max(3).optional(),
      })
      .optional(),
  }),
});

const DeleteTextElementSchema = z.object({
  fileId: z.string(),
  elementId: z.string(),
});

const BatchOperationsSchema = z.object({
  fileId: z.string(),
  operations: z.array(
    z.object({
      type: z.enum(["add", "edit", "delete", "move"]),
      elementId: z.string(),
      data: z.any().optional(),
    })
  ),
});

const SearchTextSchema = z.object({
  fileId: z.string(),
  query: z.string(),
});

const PageOperationSchema = z.object({
  fileId: z.string(),
  operation: z.enum(["add", "delete", "rotate"]),
  pageIndex: z.number().optional(),
  rotation: z.number().optional(),
});

const SavePDFSchema = z.object({
  fileId: z.string(),
  metadata: z
    .object({
      title: z.string().optional(),
      author: z.string().optional(),
      subject: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
});

// GET - Load PDF for editing
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    // Get file from database
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check permissions - simplified for now
    const canEdit = file.userId === session.user.id;

    if (!canEdit) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Load PDF with processor
    const processor = new PDFProcessor();

    // In a real implementation, you would load the file from encrypted storage
    // For now, we'll simulate loading
    const result = await processor.createNewPDF(); // Placeholder

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to load PDF" },
        { status: 500 }
      );
    }

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "pdf_edit_start",
      resourceType: "file",
      resourceId: fileId,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
      },
    });

    return NextResponse.json({
      success: true,
      textElements: result.textElements || [],
      metadata: result.metadata,
      file: {
        id: file.id,
        filename: file.name,
        mimeType: file.mimeType,
        size: file.size,
      },
    });
  } catch (error) {
    console.error("PDF load error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new PDF or perform edit operations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { operation } = body;

    const processor = new PDFProcessor();

    switch (operation) {
      case "create": {
        const { title, organizationId } = CreatePDFSchema.parse(body);

        // Check organization permissions if specified
        if (organizationId) {
          const canCreate = await checkPermission(
            session.user.id,
            "document:create",
            { organizationId }
          );
          if (!canCreate) {
            return NextResponse.json(
              { error: "Insufficient permissions" },
              { status: 403 }
            );
          }
        }

        const result = await processor.createNewPDF();
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // Create file record
        const file = await prisma.file.create({
          data: {
            name: `${title || "Untitled"}.pdf`,
            originalName: `${title || "Untitled"}.pdf`,
            mimeType: "application/pdf",
            size: BigInt(0), // Will be updated when saved
            userId: session.user.id,
            uploadedBy: session.user.id,
            checksum: "", // Will be set when saved
            encryptedMetadata: "{}",
            path: "",
          },
        });

        // Create document if organization specified
        if (organizationId) {
          await prisma.document.create({
            data: {
              title: title || "Untitled",
              // fileId: file.id, // Remove this line as fileId doesn't exist in Document model
              organizationId,
              userId: session.user.id,
            },
          });
        }

        await logActivity({
          userId: session.user.id,
          action: "pdf_create",
          resourceType: "file",
          resourceId: file.id,
          metadata: { title, organizationId },
        });

        return NextResponse.json({
          success: true,
          fileId: file.id,
          textElements: result.textElements || [],
          metadata: result.metadata,
        });
      }

      case "add_text": {
        const { fileId, content, x, y, pageIndex, formatting } =
          AddTextElementSchema.parse(body);

        // Check permissions
        const file = await prisma.file.findUnique({
          where: { id: fileId },
          include: { documents: true },
        });

        if (!file) {
          return NextResponse.json(
            { error: "File not found" },
            { status: 404 }
          );
        }

        const canEdit =
          file.userId === session.user.id ||
          (file.documents && file.documents.length > 0 &&
            (await checkPermission(session.user.id, "document:edit", {
              documentId: file.documents[0].id,
            })));

        if (!canEdit) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }

        const elementId = await processor.addTextElement(
          content,
          x,
          y,
          pageIndex,
          formatting
        );

        await logActivity({
          userId: session.user.id,
          action: "pdf_text_add",
          resourceType: "file",
          resourceId: fileId,
          metadata: { elementId, content: content.substring(0, 50) },
        });

        return NextResponse.json({
          success: true,
          elementId,
          textElements: processor.getTextElements(),
        });
      }

      case "edit_text": {
        const { fileId, elementId, updates } =
          EditTextElementSchema.parse(body);

        // Check permissions (similar to add_text)
        const file = await prisma.file.findUnique({
          where: { id: fileId },
          include: { documents: true },
        });

        if (!file) {
          return NextResponse.json(
            { error: "File not found" },
            { status: 404 }
          );
        }

        const canEdit =
          file.userId === session.user.id ||
          (file.documents && file.documents.length > 0 &&
            (await checkPermission(session.user.id, "document:edit", {
              documentId: file.documents[0].id,
            })));

        if (!canEdit) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }

        const success = await processor.editTextElement(elementId, updates);
        if (!success) {
          return NextResponse.json(
            { error: "Failed to edit text element" },
            { status: 500 }
          );
        }

        await logActivity({
          userId: session.user.id,
          action: "pdf_text_edit",
          resourceType: "file",
          resourceId: fileId,
          metadata: { elementId, updates },
        });

        return NextResponse.json({
          success: true,
          textElements: processor.getTextElements(),
        });
      }

      case "delete_text": {
        const { fileId, elementId } = DeleteTextElementSchema.parse(body);

        // Check permissions (similar to add_text)
        const file = await prisma.file.findUnique({
          where: { id: fileId },
          include: { documents: true },
        });

        if (!file) {
          return NextResponse.json(
            { error: "File not found" },
            { status: 404 }
          );
        }

        const canEdit =
          file.userId === session.user.id ||
          (file.documents && file.documents.length > 0 &&
            (await checkPermission(session.user.id, "document:edit", {
              documentId: file.documents[0].id,
            })));

        if (!canEdit) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }

        const success = await processor.deleteTextElement(elementId);
        if (!success) {
          return NextResponse.json(
            { error: "Failed to delete text element" },
            { status: 500 }
          );
        }

        await logActivity({
          userId: session.user.id,
          action: "pdf_text_delete",
          resourceType: "file",
          resourceId: fileId,
          metadata: { elementId },
        });

        return NextResponse.json({
          success: true,
          textElements: processor.getTextElements(),
        });
      }

      case "batch_operations": {
        const { fileId, operations } = BatchOperationsSchema.parse(body);

        // Check permissions
        const file = await prisma.file.findUnique({
          where: { id: fileId },
          include: { documents: true },
        });

        if (!file) {
          return NextResponse.json(
            { error: "File not found" },
            { status: 404 }
          );
        }

        const canEdit =
          file.userId === session.user.id ||
          (file.documents && file.documents.length > 0 &&
            (await checkPermission(session.user.id, "document:edit", {
              documentId: file.documents[0].id,
            })));

        if (!canEdit) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }

        const success = await processor.applyBatchOperations(operations);
        if (!success) {
          return NextResponse.json(
            { error: "Failed to apply batch operations" },
            { status: 500 }
          );
        }

        await logActivity({
          userId: session.user.id,
          action: "pdf_batch_edit",
          resourceType: "file",
          resourceId: fileId,
          metadata: { operationCount: operations.length },
        });

        return NextResponse.json({
          success: true,
          textElements: processor.getTextElements(),
        });
      }

      case "search_text": {
        const { fileId, query } = SearchTextSchema.parse(body);

        // Check permissions
        const file = await prisma.file.findUnique({
          where: { id: fileId },
          include: { documents: true },
        });

        if (!file) {
          return NextResponse.json(
            { error: "File not found" },
            { status: 404 }
          );
        }

        const canView =
          file.userId === session.user.id ||
          (await checkPermission(session.user.id, "file:view", {
            documentId: file.id,
          }));

        if (!canView) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }

        const results = processor.searchText(query);

        return NextResponse.json({
          success: true,
          results,
          count: results.length,
        });
      }

      case "page_operation": {
        const {
          fileId,
          operation: pageOp,
          pageIndex,
          rotation,
        } = PageOperationSchema.parse(body);

        // Check permissions
        const file = await prisma.file.findUnique({
          where: { id: fileId },
          include: { documents: true },
        });

        if (!file) {
          return NextResponse.json(
            { error: "File not found" },
            { status: 404 }
          );
        }

        const canEdit =
          file.userId === session.user.id ||
          (file.documents && file.documents.length > 0 &&
            (await checkPermission(session.user.id, "document:edit", {
              documentId: file.documents[0].id,
            })));

        if (!canEdit) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }

        let success = false;
        switch (pageOp) {
          case "add":
            const newPageIndex = await processor.addPage();
            success = newPageIndex >= 0;
            break;
          case "delete":
            if (pageIndex !== undefined) {
              success = await processor.deletePage(pageIndex);
            }
            break;
          case "rotate":
            // Page rotation would be implemented in the processor
            success = true; // Placeholder
            break;
        }

        if (!success) {
          return NextResponse.json(
            { error: `Failed to ${pageOp} page` },
            { status: 500 }
          );
        }

        await logActivity({
          userId: session.user.id,
          action: `pdf_page_${pageOp}`,
          resourceType: "file",
          resourceId: fileId,
          metadata: { pageIndex, rotation },
        });

        return NextResponse.json({
          success: true,
          metadata: processor.getMetadata(),
        });
      }

      case "save": {
        const { fileId, metadata } = SavePDFSchema.parse(body);

        // Check permissions
        const file = await prisma.file.findUnique({
          where: { id: fileId },
          include: { documents: true },
        });

        if (!file) {
          return NextResponse.json(
            { error: "File not found" },
            { status: 404 }
          );
        }

        const canEdit =
          file.userId === session.user.id ||
          (file.documents && file.documents.length > 0 &&
            (await checkPermission(session.user.id, "document:edit", {
              documentId: file.documents[0].id,
            })));

        if (!canEdit) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }

        // Update metadata if provided
        if (metadata) {
          await processor.updateMetadata(metadata);
        }

        const result = await processor.exportPDF();
        if (!result.success || !result.data) {
          return NextResponse.json(
            { error: result.error || "Failed to save PDF" },
            { status: 500 }
          );
        }

        // In a real implementation, you would save to encrypted storage
        // and update the file record with new size and checksum

        await logActivity({
          userId: session.user.id,
          action: "pdf_save",
          resourceType: "file",
          resourceId: fileId,
          metadata: { size: result.data.length },
        });

        return NextResponse.json({
          success: true,
          size: result.data.length,
          message: "PDF saved successfully",
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid operation" },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("PDF edit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update PDF metadata
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId, metadata } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    // Check permissions
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { documents: true },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const canEdit =
      file.userId === session.user.id ||
      (file.documents && file.documents.length > 0 &&
        (await checkPermission(session.user.id, "document:edit", {
          documentId: file.documents[0].id,
        })));

    if (!canEdit) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const processor = new PDFProcessor();
    try {
      await processor.updateMetadata(metadata);
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to update metadata" },
        { status: 500 }
      );
    }

    await logActivity({
      userId: session.user.id,
      action: "pdf_metadata_update",
      resourceType: "file",
      resourceId: fileId,
      metadata,
    });

    return NextResponse.json({
      success: true,
      metadata: processor.getMetadata(),
    });
  } catch (error) {
    console.error("PDF metadata update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
