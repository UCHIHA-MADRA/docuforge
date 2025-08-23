import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { hasPermission, getUserWithRoles } from '@/lib/permissions';
import { z } from 'zod';

// Validation schemas
const assignRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(['member', 'moderator', 'admin', 'owner']),
  organizationId: z.string().optional(),
  documentId: z.string().optional(),
});

const removeRoleSchema = z.object({
  userId: z.string(),
  organizationId: z.string().optional(),
  documentId: z.string().optional(),
});

// GET - List user roles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin permissions
    const currentUser = await getUserWithRoles(session.user.id);
    if (!currentUser || !hasPermission(currentUser, 'admin:user_management')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const organizationId = searchParams.get('organizationId');
    const documentId = searchParams.get('documentId');

    if (userId) {
      // Get roles for specific user
      const userWithRoles = await getUserWithRoles(userId);
      if (!userWithRoles) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        user: {
          id: userWithRoles.id,
          email: userWithRoles.email,
          name: userWithRoles.name,
        },
        organizationRoles: userWithRoles.organizationMembers?.map(member => ({
          organizationId: member.organizationId,
          role: member.role,
          organization: {
            id: member.organization.id,
            name: member.organization.name,
          },
        })) || [],
        documentRoles: userWithRoles.documentCollaborators?.map(collab => ({
          documentId: collab.documentId,
          role: collab.role,
          document: {
            id: collab.document.id,
            title: collab.document.title,
          },
        })) || [],
      });
    }

    // List all users with their roles (paginated)
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      skip,
      take: limit,
      include: {
        organizationMembers: {
          include: {
            organization: {
              select: { id: true, name: true },
            },
          },
        },
        documentCollaborators: {
          include: {
            document: {
              select: { id: true, title: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.user.count();

    return NextResponse.json({
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt,
        organizationRoles: user.organizationMembers.map(member => ({
          organizationId: member.organizationId,
          role: member.role,
          organization: member.organization,
        })),
        documentRoles: user.documentCollaborators.map(collab => ({
          documentId: collab.documentId,
          role: collab.role,
          document: collab.document,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Assign role to user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin permissions
    const currentUser = await getUserWithRoles(session.user.id);
    if (!currentUser || !hasPermission(currentUser, 'admin:user_management')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role, organizationId, documentId } = assignRoleSchema.parse(body);

    // Validate that user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (organizationId) {
      // Assign organization role
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }

      // Check if user is already a member
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });

      if (existingMember) {
        // Update existing role
        await prisma.organizationMember.update({
          where: {
            userId_organizationId: {
              userId,
              organizationId,
            },
          },
          data: { role },
        });
      } else {
        // Create new membership
        await prisma.organizationMember.create({
          data: {
            userId,
            organizationId,
            role,
          },
        });
      }

      return NextResponse.json({
        message: 'Organization role assigned successfully',
        userId,
        organizationId,
        role,
      });
    }

    if (documentId) {
      // Assign document role
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Check if user is already a collaborator
      const existingCollaborator = await prisma.documentCollaborator.findUnique({
        where: {
          userId_documentId: {
            userId,
            documentId,
          },
        },
      });

      if (existingCollaborator) {
        // Update existing role
        await prisma.documentCollaborator.update({
          where: {
            userId_documentId: {
              userId,
              documentId,
            },
          },
          data: { role },
        });
      } else {
        // Create new collaboration
        await prisma.documentCollaborator.create({
          data: {
            userId,
            documentId,
            role,
          },
        });
      }

      return NextResponse.json({
        message: 'Document role assigned successfully',
        userId,
        documentId,
        role,
      });
    }

    return NextResponse.json(
      { error: 'Either organizationId or documentId must be provided' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error assigning role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove role from user
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin permissions
    const currentUser = await getUserWithRoles(session.user.id);
    if (!currentUser || !hasPermission(currentUser, 'admin:user_management')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, organizationId, documentId } = removeRoleSchema.parse(body);

    if (organizationId) {
      // Remove organization role
      const deleted = await prisma.organizationMember.deleteMany({
        where: {
          userId,
          organizationId,
        },
      });

      if (deleted.count === 0) {
        return NextResponse.json(
          { error: 'Organization membership not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        message: 'Organization role removed successfully',
        userId,
        organizationId,
      });
    }

    if (documentId) {
      // Remove document role
      const deleted = await prisma.documentCollaborator.deleteMany({
        where: {
          userId,
          documentId,
        },
      });

      if (deleted.count === 0) {
        return NextResponse.json(
          { error: 'Document collaboration not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        message: 'Document role removed successfully',
        userId,
        documentId,
      });
    }

    return NextResponse.json(
      { error: 'Either organizationId or documentId must be provided' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error removing role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}