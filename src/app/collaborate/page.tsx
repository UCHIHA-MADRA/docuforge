"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { CollaborativeEditor } from "@/components/CollaborativeEditor";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  Plus,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  AlertCircle,
  Share2,
  Settings,
} from "lucide-react";
import { auditHooks } from "@/middleware/audit";

interface DocumentItem {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  collaborators: number;
}

interface ApiDocumentItem {
  id: string;
  title: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
  visibility: string;
}

export default function CollaboratePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(
    null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDocumentTitle, setNewDocumentTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Load documents from API
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const res = await fetch("/api/documents", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load documents");
        const data = await res.json();
        const items: DocumentItem[] = (data.documents || []).map((d: ApiDocumentItem) => ({
          id: d.id,
          title: d.title,
          content: d.content || "",
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt),
          isPublic: d.visibility === "public",
          collaborators: 1,
        }));
        setDocuments(items);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  const createDocument = async () => {
    if (!newDocumentTitle.trim()) {
      setError("Document title is required");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDocumentTitle,
          content: `<h1>${newDocumentTitle}</h1><p>Start collaborating on this document!</p>`,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const d = data.document;
      if (user) {
        await auditHooks.logDocumentCreation(user.id, d.id, d.title);
      }
      const newDoc: DocumentItem = {
        id: d.id,
        title: d.title,
        content: d.content || "",
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt),
        isPublic: d.visibility === "public",
        collaborators: 1,
      };
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedDocument(newDoc);
      setNewDocumentTitle("");
      setShowCreateForm(false);
    } catch (_unused) {
      setError("Failed to create document");
    } finally {
      setIsCreating(false);
    }
  };

  const copyDocumentId = async (docId: string) => {
    try {
      await navigator.clipboard.writeText(docId);
      setCopiedId(docId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy document ID:", error);
    }
  };

  const toggleDocumentVisibility = (docId: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, isPublic: !doc.isPublic } : doc
      )
    );
  };

  const handleSave = async (content: string) => {
    if (!selectedDocument) return;

    try {
      const res = await fetch(`/api/documents/${selectedDocument.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      if (user) {
        await auditHooks.logDocumentEdit(
          user.id,
          selectedDocument.id,
          selectedDocument.title,
          { content_length: content.length }
        );
      }
      const updatedAt = new Date();
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === selectedDocument.id ? { ...doc, content, updatedAt } : doc
        )
      );
      setSelectedDocument((prev) =>
        prev ? { ...prev, content, updatedAt } : null
      );
    } catch (error) {
      console.error("Failed to save document:", error);
    }
  };

  // Keeping this function for future implementation
  // This function is for future implementation
  const _deleteDocument = async (_documentId: string) => {
    try {
      const res = await fetch(`/api/documents/${_documentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      if (user) {
        await auditHooks.logDocumentDelete(user.id, _documentId);
      }
      setDocuments((prev) => prev.filter((doc) => doc.id !== _documentId));
      if (selectedDocument && selectedDocument.id === _documentId) {
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <Users className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                Collaborate
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.name || user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard")}
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedDocument ? (
          // Document List View
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Collaborative Documents
                </h1>
                <p className="text-lg text-gray-600">
                  Create and collaborate on documents in real-time with your
                  team
                </p>
              </div>

              <Button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Document</span>
              </Button>
            </div>

            {/* Create Document Form */}
            {showCreateForm && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Create New Document
                </h3>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="title"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Document Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={newDocumentTitle}
                      onChange={(e) => setNewDocumentTitle(e.target.value)}
                      placeholder="Enter document title..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === "Enter" && createDocument()}
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-600">{error}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={createDocument}
                      disabled={isCreating || !newDocumentTitle.trim()}
                    >
                      {isCreating ? "Creating..." : "Create Document"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewDocumentTitle("");
                        setError("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setSelectedDocument(doc)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDocumentVisibility(doc.id);
                        }}
                        className="p-1"
                      >
                        {doc.isPublic ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-600" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyDocumentId(doc.id);
                        }}
                        className="p-1"
                      >
                        {copiedId === doc.id ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-600" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {doc.title}
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Created: {doc.createdAt.toLocaleDateString()}</span>
                      <span>Updated: {doc.updatedAt.toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-600">
                          {doc.collaborators} collaborator
                          {doc.collaborators !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            doc.isPublic ? "bg-green-500" : "bg-gray-400"
                          }`}
                        ></div>
                        <span className="text-xs text-gray-500">
                          {doc.isPublic ? "Public" : "Private"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocument(doc);
                      }}
                    >
                      Open Document
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {documents.length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No documents yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first collaborative document to get started
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  Create Document
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Document Editor View
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedDocument(null)}
                  className="flex items-center space-x-2"
                >
                  ← Back to Documents
                </Button>

                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {selectedDocument.title}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Last updated: {selectedDocument.updatedAt.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>

                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>

            {/* Collaborative Editor */}
            <CollaborativeEditor
              documentId={selectedDocument.id}
              userId={user.id || user.email || "anonymous"}
              userName={user.name || user.email || "Anonymous User"}
              initialContent={selectedDocument.content}
              onSave={handleSave}
            />
          </div>
        )}
      </div>
    </div>
  );
}
