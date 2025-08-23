'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Permission, hasPermission, hasAllPermissions, hasAnyPermission } from './permissions';

interface UserWithRoles {
  id: string;
  email: string;
  name?: string;
  image?: string;
  organizationRoles?: Array<{
    organizationId: string;
    role: string;
  }>;
  documentRoles?: Array<{
    documentId: string;
    role: string;
  }>;
}

interface AuthContextType {
  user: UserWithRoles | null;
  loading: boolean;
  isAuthenticated: boolean;
  // Permission checking functions
  hasPermission: (permission: Permission, context?: { documentId?: string; organizationId?: string }) => boolean;
  hasAllPermissions: (permissions: Permission[], context?: { documentId?: string; organizationId?: string }) => boolean;
  hasAnyPermission: (permissions: Permission[], context?: { documentId?: string; organizationId?: string }) => boolean;
  // Role checking functions
  hasRole: (role: string, context?: { documentId?: string; organizationId?: string }) => boolean;
  isAdmin: () => boolean;
  isOwner: (context?: { documentId?: string; organizationId?: string }) => boolean;
  // Utility functions
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [userWithRoles, setUserWithRoles] = useState<UserWithRoles | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data with roles when session changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/auth/user-data');
          if (response.ok) {
            const userData = await response.json();
            setUserWithRoles(userData);
          } else {
            // Fallback to session data
            setUserWithRoles({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.name || undefined,
              image: session.user.image || undefined,
              organizationRoles: [],
              documentRoles: [],
            });
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          // Fallback to session data
          setUserWithRoles({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.name || undefined,
            image: session.user.image || undefined,
            organizationRoles: [],
            documentRoles: [],
          });
        }
      } else {
        setUserWithRoles(null);
      }
      setLoading(false);
    };

    if (status !== 'loading') {
      fetchUserData();
    }
  }, [session, status]);

  const refreshUserData = async () => {
    if (session?.user?.id) {
      setLoading(true);
      try {
        const response = await fetch('/api/auth/user-data');
        if (response.ok) {
          const userData = await response.json();
          setUserWithRoles(userData);
        }
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
      setLoading(false);
    }
  };

  const checkPermission = (permission: Permission, context?: { documentId?: string; organizationId?: string }) => {
    if (!userWithRoles) return false;
    return hasPermission({
      ...userWithRoles,
      name: userWithRoles.name || null,
      image: userWithRoles.image || null,
      organizationRoles: userWithRoles.organizationRoles || [],
      documentRoles: userWithRoles.documentRoles || []
    }, permission, context);
  };

  const checkAllPermissions = (permissions: Permission[], context?: { documentId?: string; organizationId?: string }) => {
    if (!userWithRoles) return false;
    return hasAllPermissions({
      ...userWithRoles,
      name: userWithRoles.name || null,
      image: userWithRoles.image || null,
      organizationRoles: userWithRoles.organizationRoles || [],
      documentRoles: userWithRoles.documentRoles || []
    }, permissions, context);
  };

  const checkAnyPermission = (permissions: Permission[], context?: { documentId?: string; organizationId?: string }) => {
    if (!userWithRoles) return false;
    return hasAnyPermission({
      ...userWithRoles,
      name: userWithRoles.name || null,
      image: userWithRoles.image || null,
      organizationRoles: userWithRoles.organizationRoles || [],
      documentRoles: userWithRoles.documentRoles || []
    }, permissions, context);
  };

  const checkRole = (role: string, context?: { documentId?: string; organizationId?: string }) => {
    if (!userWithRoles) return false;
    
    if (context?.documentId) {
      return userWithRoles.documentRoles?.some(
        dr => dr.documentId === context.documentId && dr.role === role
      ) || false;
    }
    
    if (context?.organizationId) {
      return userWithRoles.organizationRoles?.some(
        or => or.organizationId === context.organizationId && or.role === role
      ) || false;
    }
    
    // Check if user has this role in any context
    return (
      userWithRoles.organizationRoles?.some(or => or.role === role) ||
      userWithRoles.documentRoles?.some(dr => dr.role === role)
    ) || false;
  };

  const checkIsAdmin = () => {
    if (!userWithRoles) return false;
    return userWithRoles.organizationRoles?.some(or => or.role === 'admin' || or.role === 'owner') || false;
  };

  const checkIsOwner = (context?: { documentId?: string; organizationId?: string }) => {
    if (!userWithRoles) return false;
    
    if (context?.documentId) {
      return userWithRoles.documentRoles?.some(
        dr => dr.documentId === context.documentId && dr.role === 'owner'
      ) || false;
    }
    
    if (context?.organizationId) {
      return userWithRoles.organizationRoles?.some(
        or => or.organizationId === context.organizationId && or.role === 'owner'
      ) || false;
    }
    
    return userWithRoles.organizationRoles?.some(or => or.role === 'owner') || false;
  };

  const value: AuthContextType = {
    user: userWithRoles,
    loading: loading || status === 'loading',
    isAuthenticated: !!userWithRoles,
    hasPermission: checkPermission,
    hasAllPermissions: checkAllPermissions,
    hasAnyPermission: checkAnyPermission,
    hasRole: checkRole,
    isAdmin: checkIsAdmin,
    isOwner: checkIsOwner,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Convenience hooks for common permission checks
export function usePermission(permission: Permission, context?: { documentId?: string; organizationId?: string }) {
  const { hasPermission } = useAuth();
  return hasPermission(permission, context);
}

export function useRole(role: string, context?: { documentId?: string; organizationId?: string }) {
  const { hasRole } = useAuth();
  return hasRole(role, context);
}

export function useIsAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin();
}

export function useIsOwner(context?: { documentId?: string; organizationId?: string }) {
  const { isOwner } = useAuth();
  return isOwner(context);
}
