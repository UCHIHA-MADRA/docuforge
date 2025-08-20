"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Upload,
  Plus,
  Search,
  Grid,
  List,
  MoreVertical,
  Folder,
  File,
  Clock,
  User,
  Users,
} from "lucide-react";

interface DocumentItem {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  author: string;
}

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/documents', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const mapped: DocumentItem[] = (data.documents || []).map((d: any) => ({
            id: d.id,
            title: d.title,
            status: d.status,
            updatedAt: new Date(d.updatedAt).toLocaleDateString(),
            author: user?.name || user?.email || 'You',
          }));
          setDocuments(mapped);
        }
        const fres = await fetch('/api/files', { cache: 'no-store' });
        if (fres.ok) {
          const d = await fres.json();
          setFiles((d.files || []).map((f: any) => ({
            id: f.id,
            name: f.originalName || f.name,
            size: f.size,
            type: f.mimeType,
            uploadedAt: new Date(f.uploadedAt).toLocaleDateString(),
          })));
        }
      } catch (e) {
        // ignore for now
      }
    };
    load();

  }, [user]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <FileText className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">DocuForge</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents and files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>

              <div className="flex items-center space-x-2">
                <img
                  src={user.image || "/default-avatar.png"}
                  alt={user.name || "User"}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">
                  {user.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setViewMode("grid")}>
                <Grid className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setViewMode("list")}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Button className="h-24 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50">
              <Plus className="h-8 w-8 text-gray-400" />
              <span className="text-gray-600">New Document</span>
            </Button>

            <Button className="h-24 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50">
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-gray-600">Upload Files</span>
            </Button>

            <Button className="h-24 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50">
              <Folder className="h-8 w-8 text-gray-400" />
              <span className="text-gray-600">Create Folder</span>
            </Button>

            <Button 
              className="h-24 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50"
              onClick={() => router.push('/collaborate')}
            >
              <Users className="h-8 w-8 text-gray-400" />
              <span className="text-gray-600">Collaborate</span>
            </Button>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Documents
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      {doc.title}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          doc.status === "published"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {doc.status}
                      </span>
                      <span>{doc.updatedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Author
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Updated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-blue-600 mr-3" />
                            <span className="text-sm font-medium text-gray-900">
                              {doc.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              doc.status === "published"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {doc.author}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {doc.updatedAt}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Files */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Files
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <File className="h-5 w-5 text-gray-600 mr-3" />
                          <span className="text-sm font-medium text-gray-900">
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {file.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {file.uploadedAt}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
