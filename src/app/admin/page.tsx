'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { RequireAdmin } from '@/components/auth/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Users, Shield, Settings, Activity, Plus, Trash2, Edit } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: string;
  organizationRoles: Array<{
    organizationId: string;
    role: string;
    organization: {
      id: string;
      name: string;
    };
  }>;
  documentRoles: Array<{
    documentId: string;
    role: string;
    document: {
      id: string;
      title: string;
    };
  }>;
}

interface RoleAssignment {
  userId: string;
  role: string;
  organizationId?: string;
  documentId?: string;
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleAssignment, setRoleAssignment] = useState<RoleAssignment>({
    userId: '',
    role: 'member',
  });
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);

  // Fetch users and their roles
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/roles');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Assign role to user
  const assignRole = async () => {
    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleAssignment),
      });

      if (response.ok) {
        toast.success('Role assigned successfully');
        setIsAssignRoleOpen(false);
        setRoleAssignment({ userId: '', role: 'member' });
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to assign role');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Error assigning role');
    }
  };

  // Remove role from user
  const removeRole = async (userId: string, organizationId?: string, documentId?: string) => {
    try {
      const response = await fetch('/api/admin/roles', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, organizationId, documentId }),
      });

      if (response.ok) {
        toast.success('Role removed successfully');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove role');
      }
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Error removing role');
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'moderator':
        return 'secondary';
      case 'editor':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <RequireAdmin>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and system settings
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      View and manage user accounts and their permissions
                    </CardDescription>
                  </div>
                  <Dialog open={isAssignRoleOpen} onOpenChange={setIsAssignRoleOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Assign Role
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Role to User</DialogTitle>
                        <DialogDescription>
                          Grant permissions to a user for an organization or document
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="user-select">User</Label>
                          <Select
                            value={roleAssignment.userId}
                            onValueChange={(value: string) =>
                              setRoleAssignment(prev => ({ ...prev, userId: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name || user.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="role-select">Role</Label>
                          <Select
                            value={roleAssignment.role}
                            onValueChange={(value: string) =>
                              setRoleAssignment(prev => ({ ...prev, role: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="owner">Owner</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="org-id">Organization ID (optional)</Label>
                          <Input
                            id="org-id"
                            placeholder="Enter organization ID"
                            value={roleAssignment.organizationId || ''}
                            onChange={(e) => 
                              setRoleAssignment(prev => ({ 
                                ...prev, 
                                organizationId: e.target.value || undefined 
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="doc-id">Document ID (optional)</Label>
                          <Input
                            id="doc-id"
                            placeholder="Enter document ID"
                            value={roleAssignment.documentId || ''}
                            onChange={(e) => 
                              setRoleAssignment(prev => ({ 
                                ...prev, 
                                documentId: e.target.value || undefined 
                              }))
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignRoleOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={assignRole}>
                          Assign Role
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading users...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Organization Roles</TableHead>
                        <TableHead>Document Roles</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {user.image && (
                                <img
                                  src={user.image}
                                  alt={user.name || user.email}
                                  className="h-8 w-8 rounded-full"
                                />
                              )}
                              <span className="font-medium">
                                {user.name || 'Unnamed User'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.organizationRoles.map((orgRole) => (
                                <div key={`${orgRole.organizationId}-${orgRole.role}`} className="flex items-center gap-1">
                                  <Badge variant={getRoleBadgeVariant(orgRole.role)}>
                                    {orgRole.role} @ {orgRole.organization.name}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeRole(user.id, orgRole.organizationId)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.documentRoles.map((docRole) => (
                                <div key={`${docRole.documentId}-${docRole.role}`} className="flex items-center gap-1">
                                  <Badge variant={getRoleBadgeVariant(docRole.role)}>
                                    {docRole.role} @ {docRole.document.title}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeRole(user.id, undefined, docRole.documentId)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle>Role Management</CardTitle>
                <CardDescription>
                  Configure role permissions and hierarchies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Role management features will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  System settings will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>
                  View system activity and audit logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Activity logging will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RequireAdmin>
  );
}