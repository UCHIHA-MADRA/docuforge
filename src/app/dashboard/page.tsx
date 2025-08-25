"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  FolderPlus,
  File,
  Users,
  Download,
  Edit,
  Trash,
  Eye,
  Lock,
} from "lucide-react";
import ClientEnhancedThemeToggle from "@/components/theme/ClientEnhancedThemeToggle";

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

// Define proper types for API responses
interface ApiDocument {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
}

interface ApiFile {
  id: string;
  name: string;
  originalName?: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

interface DocumentsResponse {
  documents: ApiDocument[];
}

interface FilesResponse {
  files: ApiFile[];
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("documents");
  const [viewMode, setViewMode] = useState("grid");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        // Load documents
        const dres = await fetch("/api/documents");
        if (dres.ok) {
          const d: DocumentsResponse = await dres.json();
          setDocuments(
            (d.documents || []).map((doc: ApiDocument) => ({
              id: doc.id,
              title: doc.title,
              status: doc.status,
              updatedAt: new Date(doc.updatedAt).toLocaleDateString(),
              author: "You", // Placeholder, would come from API
            }))
          );
        }

        // Load files
        const fres = await fetch("/api/files");
        if (fres.ok) {
          const d: FilesResponse = await fres.json();
          setFiles(
            (d.files || []).map((f: ApiFile) => ({
              id: f.id,
              name: f.originalName || f.name,
              size: f.size,
              type: f.mimeType,
              uploadedAt: new Date(f.uploadedAt).toLocaleDateString(),
            }))
          );
        }
      } catch (error) {
        // Log error for debugging but don't break the UI
        console.error("Error loading dashboard data:", error);
      }
    };

    if (user) {
      load();
    }
  }, [user]);

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">DocuForge</h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search - Only for authenticated users */}
              {user && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              )}
          </div>

              {/* Upload Button - Only for authenticated users */}
              {user && (
                <Button
                  variant="outline"
                  className="flex items-center space-x-2"
                  onClick={() => setActiveTab("files")}
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload</span>
                </Button>
              )}

              {/* Theme Toggle */}
              <ClientEnhancedThemeToggle />

              {/* User Info or Sign In */}
              <div className="flex items-center space-x-3">
                {user ? (
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      {user.name?.charAt(0) || "U"}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {user.name || "User"}
                    </span>
                  </div>
                ) : (
                  <Button asChild>
                    <Link href="/auth/signin">Sign In</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation Tabs */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 border-b border-gray-200">
            {user && (
              <>
                <button
                  onClick={() => setActiveTab("documents")}
                  className={`px-4 py-3 font-medium text-sm ${activeTab === "documents" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Documents
                </button>
                <button
                  onClick={() => setActiveTab("files")}
                  className={`px-4 py-3 font-medium text-sm ${activeTab === "files" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <File className="h-4 w-4 inline mr-2" />
                  Files
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab("tools")}
              className={`px-4 py-3 font-medium text-sm ${activeTab === "tools" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 inline mr-2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
              Tools
            </button>
            {user ? (
              <button
                onClick={() => setActiveTab("editor")}
                className={`px-4 py-3 font-medium text-sm ${activeTab === "editor" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 inline mr-2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                Text Editor
              </button>
            ) : (
              <Link
                href="/auth/signin"
                className="px-4 py-3 font-medium text-sm text-blue-600 hover:text-blue-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 inline mr-2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                  <polyline points="10 17 15 12 10 7"></polyline>
                  <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                Sign In for Editor
              </Link>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === "documents" && "Documents"}
              {activeTab === "files" && "Files"}
              {activeTab === "tools" && "Tools"}
              {activeTab === "editor" && "Text Editor"}
              {!user && activeTab === "tools" && " - Guest Access"}
            </h1>
            <div className="flex items-center space-x-4">
              {(activeTab === "documents" || activeTab === "files") && user && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setViewMode("grid")}
                    className={viewMode === "grid" ? "bg-blue-50" : ""}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </>
              )}
              {(activeTab === "documents" || activeTab === "files") && user && (
                <Button
                  variant="outline"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-blue-50" : ""}
                >
                  <List className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Content based on active tab and authentication status */}
          {activeTab === "documents" && user && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/documents", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ title: "Untitled Document" }),
                    });

                    if (res.ok) {
                      const data = await res.json();
                      router.push(`/document/${data.id}`);
                    }
                  } catch (error) {
                    console.error("Error creating document:", error);
                  }
                }}
              >
                <Plus className="h-8 w-8 text-gray-400" />
                <span className="text-gray-600">New Document</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.multiple = true;
                  input.accept = ".pdf,.doc,.docx,.txt";
                  input.onchange = async (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (!files || files.length === 0) return;

                    const formData = new FormData();
                    for (let i = 0; i < files.length; i++) {
                      formData.append("files", files[i]);
                    }

                    try {
                      const res = await fetch("/api/files/upload", {
                        method: "POST",
                        body: formData,
                      });

                      if (res.ok) {
                        window.location.reload();
                      }
                    } catch (error) {
                      console.error("Error uploading files:", error);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-gray-600">Upload Files</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                onClick={() => {
                  const folderName = prompt("Enter folder name:");
                  if (!folderName) return;

                  fetch("/api/folders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: folderName }),
                  })
                    .then((res) => {
                      if (res.ok) {
                        window.location.reload();
                      }
                    })
                    .catch((error) => {
                      console.error("Error creating folder:", error);
                    });
                }}
              >
                <FolderPlus className="h-8 w-8 text-gray-400" />
                <span className="text-gray-600">Create Folder</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                onClick={() => router.push("/collaborate")}
              >
                <Users className="h-8 w-8 text-gray-400" />
                <span className="text-gray-600">Collaborate</span>
              </Button>
            </div>
          )}

          {activeTab === "files" && user && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.multiple = true;
                  input.onchange = async (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (!files || files.length === 0) return;

                    const formData = new FormData();
                    for (let i = 0; i < files.length; i++) {
                      formData.append("files", files[i]);
                    }

                    try {
                      const res = await fetch("/api/files/upload", {
                        method: "POST",
                        body: formData,
                      });

                      if (res.ok) {
                        window.location.reload();
                      }
                    } catch (error) {
                      console.error("Error uploading files:", error);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-gray-600">Upload Files</span>
              </Button>
            </div>
          )}

          {activeTab === "tools" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                onClick={() => router.push('/tools/pdf-converter')}
              >
                <FileText className="h-8 w-8 text-gray-400" />
                <span className="text-gray-600">PDF Converter</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                onClick={() => router.push('/tools/ocr')}
              >
                <Eye className="h-8 w-8 text-gray-400" />
                <span className="text-gray-600">OCR Text Extraction</span>
              </Button>
            </div>
          )}

          {activeTab === "editor" && user && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 h-96 flex items-center justify-center">
              <div className="text-center">
                <Edit className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Text Editor</h3>
                <p className="text-gray-500 mb-4">Create and edit documents with our powerful text editor</p>
                <Button onClick={() => router.push('/editor')}>Open Editor</Button>
              </div>
            </div>
          )}

          {activeTab === "editor" && !user && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 h-96 flex items-center justify-center">
              <div className="text-center">
                <Lock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Text Editor</h3>
                <p className="text-gray-500 mb-4">Sign in to access our powerful text editor</p>
                <Button onClick={() => router.push('/auth/signin')}>Sign In</Button>
              </div>
            </div>
          )}
        </div>

        {/* Content based on active tab */}
        {activeTab === "documents" && user && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Documents
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {documents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>
                    No documents found. Create your first document to get started!
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/document/${doc.id}`)}
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Document
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Author
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Updated
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documents.map((doc) => (
                      <tr
                        key={doc.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/document/${doc.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {doc.title}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
              )}
            </div>
          </div>
        )}

        {activeTab === "files" && user && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Your Files
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {files.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <File className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No files found. Upload your first file to get started!</p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <File className="h-8 w-8 text-blue-600" />
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1 truncate">
                        {file.name}
                      </h3>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{file.uploadedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Size
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Uploaded
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {files.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <File className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {file.name}
                              </div>
                            </div>
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
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
