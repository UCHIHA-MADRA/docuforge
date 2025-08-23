import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { z } from 'zod';
import {
  listUserFiles,
  deleteEncryptedFile,
  getStorageStats,
} from '@/lib/encrypted-storage';
import { getUserWithRoles, hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const listFilesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  mimeType: z.string().optional(),
  search: z.string().optional(),
  organizationId: z.string().optional(),
  sortBy: z.enum(['name', 'size', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const deleteFileSchema = z.object({
  fileId: z.string().uuid(),
  reason: z.string().optional(),
});

// List user's files with filtering and pagination
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userWithRoles = await getUserWithRoles(session.user.id);
    if (!userWithRoles) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    let params;
    try {
      params = listFilesSchema.parse(queryParams);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    // Build database query
    const where: any = {
      userId: session.user.id,
    };

    if (params.mimeType) {
      where.mimeType = params.mimeType;
    }

    if (params.search) {
      where.OR = [
        {
          filename: {
            contains: params.search,
            mode: 'insensitive',
          },
        },
        {
          originalName: {
            contains: params.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Add organization filter if specified and user has access
    if (params.organizationId) {
      const hasOrgAccess = userWithRoles.organizationRoles.some(
        role => role.organizationId === params.organizationId
      );
      
      if (!hasOrgAccess) {
        return NextResponse.json(
          { error: 'Access denied to organization' },
          { status: 403 }
        );
      }

      where.documents = {
        some: {
          organizationId: params.organizationId,
        },
      };
    }

    // Execute query with pagination
    const skip = (params.page - 1) * params.limit;
    const orderBy: any = {};
    orderBy[params.sortBy] = params.sortOrder;

    const [files, totalCount] = await Promise.all([
      prisma.file.findMany({
        where,
        skip,
        take: params.limit,
        orderBy,
        include: {
          Document: {
            select: {
              id: true,
              title: true,
              organizationId: true,
              visibility: true,
            },
          },
        },
      }),
      prisma.file.count({ where }),
    ]);

    // Format response
    const formattedFiles = files.map(file => ({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      checksum: file.checksum,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      lastAccessedAt: file.lastAccessedAt,
      processingStatus: file.processingStatus,
      documents: file.documents,
    }));

    // Get storage statistics
    const stats = await getStorageStats(session.user.id);

    return NextResponse.json({
      files: formattedFiles,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / params.limit),
      },
      stats,
    });

  } catch (error) {
    console.error('List files error:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}

// Delete a file
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userWithRoles = await getUserWithRoles(session.user.id);
    if (!userWithRoles) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    let body;
    try {
      const requestBody = await request.json();
      body = deleteFileSchema.parse(requestBody);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Get file record to check permissions
    const fileRecord = await prisma.file.findUnique({
      where: { id: body.fileId },
      include: {
        documents: {
          include: {
            collaborators: true,
          },
        },
      },
    });

    if (!fileRecord) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Check permissions
    let canDelete = false;

    // 1. File owner can delete
    if (fileRecord.userId === session.user.id) {
      canDelete = true;
    }

    // 2. Check document-level permissions
    if (!canDelete && fileRecord.documents.length > 0) {
      for (const document of fileRecord.documents) {
        const collaboration = document.collaborators.find(
          collab => collab.userId === session.user.id
        );
        
        if (collaboration) {
          const canDeleteDoc = hasPermission(
            userWithRoles,
            'document:delete',
            { documentId: document.id, collaborationRole: collaboration.role }
          );
          
          if (canDeleteDoc) {
            canDelete = true;
            break;
          }
        }
      }
    }

    // 3. Admin can delete any file
    if (!canDelete) {
      const isAdmin = hasPermission(userWithRoles, 'admin:file_management');
      if (isAdmin) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Delete associated documents first
    if (fileRecord.documents.length > 0) {
      await prisma.document.deleteMany({
        where: {
          fileId: body.fileId,
        },
      });
    }

    // Delete the encrypted file
    await deleteEncryptedFile(body.fileId, fileRecord.userId);

    // Log the deletion activity
    await prisma.analyticsEvent.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        eventType: 'file_delete',
        resourceType: 'file',
        resourceId: body.fileId,
        metadata: {
          fileName: fileRecord.filename,
          fileSize: fileRecord.size,
          mimeType: fileRecord.mimeType,
          deletedBy: session.user.id,
          fileOwner: fileRecord.userId,
          reason: body.reason,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });

  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

// Update file metadata
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const updateSchema = z.object({
      fileId: z.string().uuid(),
      filename: z.string().min(1).max(255).optional(),
      tags: z.array(z.string()).optional(),
      description: z.string().optional(),
    });

    let body;
    try {
      const requestBody = await request.json();
      body = updateSchema.parse(requestBody);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Get file record to check permissions
    const fileRecord = await prisma.file.findUnique({
      where: { id: body.fileId },
    });

    if (!fileRecord) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Check if user owns the file or is admin
    const userWithRoles = await getUserWithRoles(session.user.id);
    const isOwner = fileRecord.userId === session.user.id;
    const isAdmin = userWithRoles ? hasPermission(userWithRoles, 'admin:file_management') : false;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Update file metadata
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.filename) {
      updateData.filename = body.filename;
    }

    const updatedFile = await prisma.file.update({
      where: { id: body.fileId },
      data: updateData,
    });

    // Log the update activity
    await prisma.analyticsEvent.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        eventType: 'file_update',
        resourceType: 'file',
        resourceId: body.fileId,
        metadata: {
          fileName: updatedFile.filename,
          changes: Object.keys(updateData),
          updatedBy: session.user.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        id: updatedFile.id,
        filename: updatedFile.filename,
        originalName: updatedFile.originalName,
        mimeType: updatedFile.mimeType,
        size: updatedFile.size,
        updatedAt: updatedFile.updatedAt,
      },
    });

  } catch (error) {
    console.error('Update file error:', error);
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    );
  }
}


