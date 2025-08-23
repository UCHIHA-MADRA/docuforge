import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import {
  retrieveEncryptedFile,
  FileMetadata,
} from '@/lib/encrypted-storage';
import { getUserWithRoles, hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

interface DownloadParams {
  fileId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: DownloadParams }
): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { fileId } = params;
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get user with roles for permission checking
    const userWithRoles = await getUserWithRoles(session.user.id);
    if (!userWithRoles) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get file record from database to check permissions
    const fileRecord = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        user: true,
        documents: {
          include: {
            organization: true,
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

    // Check if user has permission to access this file
    let hasAccess = false;

    // 1. Check if user owns the file
    if (fileRecord.userId === session.user.id) {
      hasAccess = true;
    }

    // 2. Check document-level permissions if file is associated with documents
    if (!hasAccess && fileRecord.documents.length > 0) {
      for (const document of fileRecord.documents) {
        // Check if user is a collaborator
        const collaboration = document.collaborators.find(
          (collab: { userId: string }) => collab.userId === session.user.id
        );
        
        if (collaboration) {
          const canView = hasPermission(
            userWithRoles,
            'document:view',
            { documentId: document.id, collaborationRole: collaboration.role }
          );
          
          if (canView) {
            hasAccess = true;
            break;
          }
        }

        // Check organization access
        if (!hasAccess && document.organization) {
          const orgRole = userWithRoles.organizationRoles.find(
            role => role.organizationId === document.organizationId
          );
          
          if (orgRole) {
            const canViewOrgFiles = hasPermission(
              userWithRoles,
              'file:view',
              { organizationId: document.organizationId, organizationRole: orgRole.role }
            );
            
            if (canViewOrgFiles) {
              hasAccess = true;
              break;
            }
          }
        }
      }
    }

    // 3. Check admin permissions
    if (!hasAccess) {
      const isAdmin = hasPermission(userWithRoles, 'admin:files');
      if (isAdmin) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Generate user encryption key (same as used in upload)
    const userKey = process.env.USER_ENCRYPTION_KEY || 'default-key-for-development';

    // Retrieve and decrypt file
    const { buffer, metadata } = await retrieveEncryptedFile(
      fileId,
      fileRecord.userId, // Use file owner's ID for decryption
      userKey
    );

    // Log the download activity
    await prisma.analyticsEvent.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        eventType: 'file_download',
        resourceType: 'file',
        resourceId: fileId,
        metadata: JSON.stringify({
          fileName: metadata.originalName,
          fileSize: metadata.size,
          mimeType: metadata.mimeType,
          downloadedBy: session.user.id,
          fileOwner: fileRecord.userId,
        },
      },
    });

    // Update last accessed timestamp
    await prisma.file.update({
      where: { id: fileId },
      data: {
        lastAccessedAt: new Date(),
      },
    });

    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set('Content-Type', metadata.mimeType);
    headers.set('Content-Length', buffer.length.toString());
    headers.set('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
    
    // Security headers
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    
    // Cache control for sensitive files
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('File download error:', error);
    
    // Don't expose internal error details
    if (error instanceof Error && error.message.includes('integrity check failed')) {
      return NextResponse.json(
        { error: 'File integrity verification failed' },
        { status: 422 }
      );
    }
    
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}

// Get file metadata without downloading the actual file
export async function HEAD(
  request: NextRequest,
  { params }: { params: DownloadParams }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const { fileId } = params;
    if (!fileId) {
      return new NextResponse(null, { status: 400 });
    }

    // Get file record from database
    const fileRecord = await prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        userId: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!fileRecord) {
      return new NextResponse(null, { status: 404 });
    }

    // Basic permission check (file owner or admin)
    const userWithRoles = await getUserWithRoles(session.user.id);
    const isOwner = fileRecord.userId === session.user.id;
    const isAdmin = userWithRoles ? hasPermission(userWithRoles, 'admin:file_management') : false;

    if (!isOwner && !isAdmin) {
      return new NextResponse(null, { status: 403 });
    }

    // Return file metadata in headers
    const headers = new Headers();
    headers.set('Content-Type', fileRecord.mimeType);
    headers.set('Content-Length', fileRecord.size.toString());
headers.set('Last-Modified', fileRecord.lastAccessed?.toUTCString() || new Date().toUTCString());
    headers.set('X-File-Name', fileRecord.name);
    headers.set('X-File-ID', fileRecord.id);

    return new NextResponse(null, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('File HEAD request error:', error);
    return new NextResponse(null, { status: 500 });
  }
}