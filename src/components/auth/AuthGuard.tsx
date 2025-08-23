'use client';

import { ReactNode } from 'react';
import { useAuth, usePermission, useRole } from '@/lib/auth-context';
import { Permission } from '@/lib/permissions';
import { Loader2, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signIn } from 'next-auth/react';

interface AuthGuardProps {
  children: ReactNode;
  // Permission-based access
  requirePermission?: Permission;
  requireAllPermissions?: Permission[];
  requireAnyPermissions?: Permission[];
  // Role-based access
  requireRole?: string;
  requireAnyRoles?: string[];
  // Context for permission checks
  context?: {
    documentId?: string;
    organizationId?: string;
  };
  // UI customization
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
  unauthorizedComponent?: ReactNode;
  // Behavior options
  redirectToSignIn?: boolean;
  showFallbackOnUnauthorized?: boolean;
}

export function AuthGuard({
  children,
  requirePermission,
  requireAllPermissions,
  requireAnyPermissions,
  requireRole,
  requireAnyRoles,
  context,
  fallback,
  loadingComponent,
  unauthorizedComponent,
  redirectToSignIn = false,
  showFallbackOnUnauthorized = true,
}: AuthGuardProps) {
  const { user, loading, isAuthenticated, hasPermission, hasAllPermissions, hasAnyPermission, hasRole } = useAuth();

  // Show loading state
  if (loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated) {
    if (redirectToSignIn) {
      signIn();
      return null;
    }
    
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>;
    }
    
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Lock className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>
            You need to sign in to access this content.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => signIn()} className="w-full">
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Check permissions
  let hasAccess = true;
  let accessReason = '';

  if (requirePermission) {
    hasAccess = hasPermission(requirePermission, context);
    if (!hasAccess) accessReason = `Missing permission: ${requirePermission}`;
  }

  if (hasAccess && requireAllPermissions) {
    hasAccess = hasAllPermissions(requireAllPermissions, context);
    if (!hasAccess) accessReason = `Missing required permissions: ${requireAllPermissions.join(', ')}`;
  }

  if (hasAccess && requireAnyPermissions) {
    hasAccess = hasAnyPermission(requireAnyPermissions, context);
    if (!hasAccess) accessReason = `Missing any of required permissions: ${requireAnyPermissions.join(', ')}`;
  }

  if (hasAccess && requireRole) {
    hasAccess = hasRole(requireRole, context);
    if (!hasAccess) accessReason = `Missing required role: ${requireRole}`;
  }

  if (hasAccess && requireAnyRoles) {
    hasAccess = requireAnyRoles.some(role => hasRole(role, context));
    if (!hasAccess) accessReason = `Missing any of required roles: ${requireAnyRoles.join(', ')}`;
  }

  // Handle unauthorized access
  if (!hasAccess) {
    if (!showFallbackOnUnauthorized) {
      return null;
    }
    
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>;
    }
    
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don&apos;t have permission to access this content.
          </CardDescription>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-muted-foreground mt-2">
              Debug: {accessReason}
            </p>
          )}
        </CardHeader>
      </Card>
    );
  }

  // User has access, render children
  return <>{children}</>;
}

// Convenience components for common use cases
export function RequireAuth({ children, ...props }: Omit<AuthGuardProps, 'requirePermission' | 'requireRole'>) {
  return (
    <AuthGuard {...props}>
      {children}
    </AuthGuard>
  );
}

export function RequirePermission({ 
  permission, 
  children, 
  ...props 
}: Omit<AuthGuardProps, 'requirePermission'> & { permission: Permission }) {
  return (
    <AuthGuard requirePermission={permission} {...props}>
      {children}
    </AuthGuard>
  );
}

export function RequireRole({ 
  role, 
  children, 
  ...props 
}: Omit<AuthGuardProps, 'requireRole'> & { role: string }) {
  return (
    <AuthGuard requireRole={role} {...props}>
      {children}
    </AuthGuard>
  );
}

export function RequireAdmin({ children, ...props }: Omit<AuthGuardProps, 'requireAnyRoles'>) {
  return (
    <AuthGuard requireAnyRoles={['admin', 'owner']} {...props}>
      {children}
    </AuthGuard>
  );
}

// Hook for conditional rendering based on permissions
export function useCanAccess({
  requirePermission,
  requireAllPermissions,
  requireAnyPermissions,
  requireRole,
  requireAnyRoles,
  context,
}: Omit<AuthGuardProps, 'children' | 'fallback' | 'loadingComponent' | 'unauthorizedComponent' | 'redirectToSignIn' | 'showFallbackOnUnauthorized'>) {
  const { isAuthenticated, hasPermission, hasAllPermissions, hasAnyPermission, hasRole } = useAuth();

  if (!isAuthenticated) {
    return false;
  }

  if (requirePermission && !hasPermission(requirePermission, context)) {
    return false;
  }

  if (requireAllPermissions && !hasAllPermissions(requireAllPermissions, context)) {
    return false;
  }

  if (requireAnyPermissions && !hasAnyPermission(requireAnyPermissions, context)) {
    return false;
  }

  if (requireRole && !hasRole(requireRole, context)) {
    return false;
  }

  if (requireAnyRoles && !requireAnyRoles.some(role => hasRole(role, context))) {
    return false;
  }

  return true;
}