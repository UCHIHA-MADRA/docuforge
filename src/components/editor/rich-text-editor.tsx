"use client";

import React, { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import EditorToolbar from "./editor-toolbar";
import EditorMenu from "./editor-menu";

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  autofocus?: boolean;
  className?: string;
}

export default function RichTextEditor({
  content = "",
  onChange,
  readOnly = false,
  placeholder = "Start writing...",
  autofocus = false,
  className = "",
}: RichTextEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);
  
  // Initialize the editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable: !readOnly,
    autofocus,
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-[200px] p-4",
        placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
  });

  // Store editor reference
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  // Handle content updates from props
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Client-side only
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-[200px] bg-gray-50 animate-pulse rounded-md"></div>
    );
  }

  return (
    <div className={`rich-text-editor ${className}`}>
      <div className="flex items-center justify-between bg-white border-b border-gray-200 p-2">
        {!readOnly && <EditorToolbar editor={editor} />}
        <div className="ml-auto">
          <EditorMenu 
            editor={editor} 
            onCopy={() => {
              if (editor) {
                navigator.clipboard.writeText(editor.getHTML());
              }
            }}
            onPrint={() => {
              if (editor) {
                const content = editor.getHTML();
                const printWindow = window.open("", "_blank");
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Print Document</title>
                        <style>
                          body { font-family: system-ui, sans-serif; margin: 2rem; }
                          .content { max-width: 800px; margin: 0 auto; }
                        </style>
                      </head>
                      <body>
                        <div class="content">${content}</div>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                  printWindow.close();
                }
              }
            }}
          />
        </div>
      </div>
      
      <EditorContent editor={editor} className="bg-white" />
    </div>
  );
}