'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthGuard } from '@/components/auth/AuthGuard';
import PDFEditor from '@/components/pdf/PDFEditor';

interface FileData {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface PDFEditPageProps {}

const PDFEditPage: React.FC<PDFEditPageProps> = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [pdfBuffer, setPdfBuffer] = useState<Uint8Array | null>(null);
  const [saving, setSaving] = useState(false);

  const fileId = params.fileId as string;

  useEffect(() => {
    if (fileId && session) {
      loadPDFForEditing();
    }
  }, [fileId, session]);

  const loadPDFForEditing = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/pdf/edit?fileId=${fileId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load PDF');
      }

      if (data.success) {
        setFileData(data.file);
        // In a real implementation, you would load the actual PDF buffer
        // For now, we'll let the PDFEditor create a new PDF
        setPdfBuffer(null);
      } else {
        throw new Error(data.error || 'Failed to load PDF');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (pdfBuffer: Uint8Array) => {
    try {
      setSaving(true);

      const response = await fetch('/api/pdf/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'save',
          fileId,
          metadata: {
            title: fileData?.filename?.replace('.pdf', '') || 'Untitled',
            author: session?.user?.name || 'Unknown',
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save PDF');
      }

      if (data.success) {
        toast.success('PDF saved successfully');
      } else {
        throw new Error(data.error || 'Failed to save PDF');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save PDF';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleError = (error: string) => {
    setError(error);
    toast.error(error);
  };

  const goBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading PDF editor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !fileData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button onClick={goBack} variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                PDF Editor Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="mt-4 flex gap-2">
                <Button onClick={loadPDFForEditing} variant="outline">
                  Try Again
                </Button>
                <Button onClick={goBack}>
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requireAuth>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button onClick={goBack} variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <div>
                    <h1 className="font-semibold">
                      {fileData?.filename || 'PDF Editor'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {fileData?.size ? `${Math.round(fileData.size / 1024)} KB` : 'New document'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {saving && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PDF Editor */}
        <div className="h-[calc(100vh-80px)]">
          <PDFEditor
            pdfBuffer={pdfBuffer || undefined}
            onSave={handleSave}
            onError={handleError}
            className="h-full"
          />
        </div>
      </div>
    </AuthGuard>
  );
};

export default PDFEditPage;