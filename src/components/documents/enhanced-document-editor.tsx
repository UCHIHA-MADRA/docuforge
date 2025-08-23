"use client";

import React, { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Install: npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-collaboration yjs y-websocket
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

interface DocumentEditorProps {
  documentId: string;
  userId: string;
  userName: string;
  readonly?: boolean;
}

export function DocumentEditor({
  documentId,
  userId,
  userName,
  readonly = false,
}: DocumentEditorProps) {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({
        document: new Y.Doc(), // Will be replaced with shared doc
      }),
      CollaborationCursor.configure({
        provider: null, // Will be set when provider is ready
        user: {
          name: userName,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Random color
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: "prose max-w-none p-4 focus:outline-none",
      },
    },
    editable: !readonly,
  });

  useEffect(() => {
    if (!editor) return;

    // Create Y.js document for real-time collaboration
    const ydoc = new Y.Doc();

    // WebSocket provider for real-time sync
    const websocketProvider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
      `document-${documentId}`,
      ydoc
    );

    websocketProvider.on("status", ({ status }: { status: string }) => {
      setIsConnected(status === "connected");
    });

    // Configure collaboration
    editor.extensionManager.extensions
      .find((ext) => ext.name === "collaboration")
      ?.configure({ document: ydoc });

    editor.extensionManager.extensions
      .find((ext) => ext.name === "collaborationCursor")
      ?.configure({ provider: websocketProvider });

    setProvider(websocketProvider);

    return () => {
      websocketProvider.destroy();
    };
  }, [editor, documentId]);

  if (!editor) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary rounded-full mx-auto mb-4" />
        <p>Loading editor...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`h-3 w-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-muted-foreground">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        {!readonly && (
          <div className="flex gap-2">
            <Button
              onClick={() => editor.chain().focus().toggleBold().run()}
              variant={editor.isActive("bold") ? "default" : "outline"}
              size="sm"
            >
              Bold
            </Button>
            <Button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              variant={editor.isActive("italic") ? "default" : "outline"}
              size="sm"
            >
              Italic
            </Button>
            <Button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              variant={
                editor.isActive("heading", { level: 1 }) ? "default" : "outline"
              }
              size="sm"
            >
              H1
            </Button>
          </div>
        )}
      </div>

      <Card>
        <EditorContent
          editor={editor}
          className="min-h-[600px] focus-within:ring-2 focus-within:ring-primary"
        />
      </Card>
    </div>
  );
}
