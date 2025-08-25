export interface User {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}
import { prisma } from "@/lib/prisma";

// Permission types for different resources
export type Permission =
  | "document:create"
  | "document:read"
  | "document:update"
  | "document:edit"
  | "document:delete"
  | "document:share"
  | "document:collaborate"
  | "file:upload"
  | "file:download"
  | "file:delete"
  | "file:share"
  | "file:view"
  | "organization:create"
  | "organization:manage"
  | "organization:invite"
  | "organization:remove_member"
  | "admin:user_management"
  | "admin:file_management"
  | "admin:files"
  | "admin:system_settings"
  | "admin:audit_logs";

// Role definitions with their permissions
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // Document collaboration roles
  viewer: ["document:read", "file:download"],
  commenter: ["document:read", "document:collaborate", "file:download"],
  editor: [
    "document:read",
    "document:update",
    "document:collaborate",
    "file:upload",
    "file:download",
  ],

  // Organization roles
  member: [
    "document:create",
    "document:read",
    "document:update",
    "document:delete",
    "document:share",
    "document:collaborate",
    "file:upload",
    "file:download",
    "file:delete",
    "file:share",
  ],
  moderator: [
    "document:create",
    "document:read",
    "document:update",
    "document:delete",
    "document:share",
    "document:collaborate",
    "file:upload",
    "file:download",
    "file:delete",
    "file:share",
    "organization:invite",
  ],
  admin: [
    "document:create",
    "document:read",
    "document:update",
    "document:delete",
    "document:share",
    "document:collaborate",
    "file:upload",
    "file:download",
    "file:delete",
    "file:share",
    "organization:create",
    "organization:manage",
    "organization:invite",
    "organization:remove_member",
  ],
  owner: [
    "document:create",
    "document:read",
    "document:update",
    "document:delete",
    "document:share",
    "document:collaborate",
    "file:upload",
    "file:download",
    "file:delete",
    "file:share",
    "organization:create",
    "organization:manage",
    "organization:invite",
    "organization:remove_member",
    "admin:user_management",
    "admin:system_settings",
    "admin:audit_logs",
  ],
};

// User context with roles
export interface UserWithRoles extends User {
  organizationRoles: Array<{
    organizationId: string;
    role: string;
  }>;
  documentRoles: Array<{
    documentId: string;
    role: string;
  }>;
}

// Check if user has a specific permission
export function hasPermission(
  user: UserWithRoles | null,
  permission: Permission,
  context?: {
    organizationId?: string;
    documentId?: string;
  }
): boolean {
  if (!user) return false;

  // Check document-specific permissions
  if (context?.documentId) {
    const documentRole = user.documentRoles.find(
      (role) => role.documentId === context.documentId
    );
    if (
      documentRole &&
      ROLE_PERMISSIONS[documentRole.role]?.includes(permission)
    ) {
      return true;
    }
  }

  // Check organization-specific permissions
  if (context?.organizationId) {
    const orgRole = user.organizationRoles.find(
      (role) => role.organizationId === context.organizationId
    );
    if (orgRole && ROLE_PERMISSIONS[orgRole.role]?.includes(permission)) {
      return true;
    }
  }

  // Check if user has permission through any organization role
  for (const orgRole of user.organizationRoles) {
    if (ROLE_PERMISSIONS[orgRole.role]?.includes(permission)) {
      return true;
    }
  }

  return false;
}

// Check multiple permissions (user must have ALL)
export function hasAllPermissions(
  user: UserWithRoles | null,
  permissions: Permission[],
  context?: {
    organizationId?: string;
    documentId?: string;
  }
): boolean {
  return permissions.every((permission) =>
    hasPermission(user, permission, context)
  );
}

// Check multiple permissions (user must have ANY)
export function hasAnyPermission(
  user: UserWithRoles | null,
  permissions: Permission[],
  context?: {
    organizationId?: string;
    documentId?: string;
  }
): boolean {
  return permissions.some((permission) =>
    hasPermission(user, permission, context)
  );
}

// Fetch user with all roles from database
export async function getUserWithRoles(
  userId: string
): Promise<UserWithRoles | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        organizations: {
          select: {
            organizationId: true,
            role: true,
          },
        },
        documentCollaborations: {
          select: {
            documentId: true,
            role: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.avatar,
      organizationRoles: user.organizations.map((org) => ({
        organizationId: org.organizationId,
        role: org.role,
      })),
      documentRoles: user.documentCollaborations.map((doc) => ({
        documentId: doc.documentId,
        role: doc.role,
      })),
    };
  } catch (error) {
    console.error("Error fetching user with roles:", error);
    return null;
  }
}

// Check if user can access a specific document
export async function canAccessDocument(
  userId: string,
  documentId: string,
  requiredPermission: Permission = "document:read"
): Promise<boolean> {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        userId: true,
        visibility: true,
        organizationId: true,
        collaborators: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    if (!document) return false;

    // Document author has full access
    if (document.userId === userId) return true;

    // Public documents can be read by anyone
    if (
      document.visibility === "PUBLIC" &&
      requiredPermission === "document:read"
    ) {
      return true;
    }

    // Check direct collaboration permissions
    const collaboration = document.collaborators[0];
    if (
      collaboration &&
      ROLE_PERMISSIONS[collaboration.role]?.includes(requiredPermission)
    ) {
      return true;
    }

    // Check organization permissions
    if (document.organizationId) {
      const userWithRoles = await getUserWithRoles(userId);
      if (userWithRoles) {
        return hasPermission(userWithRoles, requiredPermission, {
          organizationId: document.organizationId,
          documentId,
        });
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking document access:", error);
    return false;
  }
}

// Check if user has a specific permission
export async function checkPermission(
  userId: string,
  requiredPermission: Permission,
  context?: { organizationId?: string; documentId?: string }
): Promise<boolean> {
  try {
    const userWithRoles = await getUserWithRoles(userId);
    if (!userWithRoles) return false;

    return hasPermission(userWithRoles, requiredPermission, context);
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

// Check if user can access a specific organization
export async function canAccessOrganization(
  userId: string,
  organizationId: string,
  requiredPermission: Permission
): Promise<boolean> {
  try {
    const userWithRoles = await getUserWithRoles(userId);
    if (!userWithRoles) return false;

    return hasPermission(userWithRoles, requiredPermission, {
      organizationId,
    });
  } catch (error) {
    console.error("Error checking organization access:", error);
    return false;
  }
}

// Audit logging for permission checks
export async function logPermissionCheck(
  userId: string,
  permission: Permission,
  resource: string,
  granted: boolean,
  context?: Record<string, string | number | boolean | null>
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        userId,
        event: "permission_check",
        category: "security",
        metadata: JSON.stringify({
          permission,
          resource,
          granted,
          context,
          timestamp: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    console.error("Error logging permission check:", error);
  }
}

// Role hierarchy helper
export function getRoleHierarchy(): Record<string, number> {
  return {
    viewer: 1,
    commenter: 2,
    editor: 3,
    member: 4,
    moderator: 5,
    admin: 6,
    owner: 7,
  };
}

// Check if role A has higher or equal privileges than role B
export function hasHigherOrEqualRole(roleA: string, roleB: string): boolean {
  const hierarchy = getRoleHierarchy();
  return (hierarchy[roleA] || 0) >= (hierarchy[roleB] || 0);
}

// Get effective permissions for a user in a specific context
export async function getEffectivePermissions(
  userId: string,
  context?: {
    organizationId?: string;
    documentId?: string;
  }
): Promise<Permission[]> {
  const userWithRoles = await getUserWithRoles(userId);
  if (!userWithRoles) return [];

  const permissions = new Set<Permission>();

  // Add permissions from document roles
  if (context?.documentId) {
    const documentRole = userWithRoles.documentRoles.find(
      (role) => role.documentId === context.documentId
    );
    if (documentRole) {
      ROLE_PERMISSIONS[documentRole.role]?.forEach((p) => permissions.add(p));
    }
  }

  // Add permissions from organization roles
  if (context?.organizationId) {
    const orgRole = userWithRoles.organizationRoles.find(
      (role) => role.organizationId === context.organizationId
    );
    if (orgRole) {
      ROLE_PERMISSIONS[orgRole.role]?.forEach((p) => permissions.add(p));
    }
  } else {
    // Add permissions from all organization roles if no specific org context
    userWithRoles.organizationRoles.forEach((orgRole) => {
      ROLE_PERMISSIONS[orgRole.role]?.forEach((p) => permissions.add(p));
    });
  }

  return Array.from(permissions);
}
