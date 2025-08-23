"use client";

import React from "react";
import { Editor } from "@tiptap/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Copy,
  Trash,
  FileText,
  Download,
  Share,
  MoreVertical,
  Printer,
} from "lucide-react";

interface EditorMenuProps {
  editor: Editor | null;
  onCopy?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
}

export default function EditorMenu({
  editor,
  onCopy,
  onDelete,
  onDownload,
  onShare,
  onPrint,
}: EditorMenuProps) {
  if (!editor) {
    return null;
  }

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
    } else {
      // Default copy behavior
      const content = editor.getHTML();
      navigator.clipboard.writeText(content).catch(err => {
        console.error("Failed to copy content: ", err);
      });
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      // Default print behavior
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
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Document Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleCopy} disabled={!editor.can().chain().focus().run()}>
          <Copy className="h-4 w-4 mr-2" />
          <span>Copy Content</span>
        </DropdownMenuItem>
        
        {onShare && (
          <DropdownMenuItem onClick={onShare}>
            <Share className="h-4 w-4 mr-2" />
            <span>Share Document</span>
          </DropdownMenuItem>
        )}
        
        {onDownload && (
          <DropdownMenuItem onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            <span>Download</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          <span>Print</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {onDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
            <Trash className="h-4 w-4 mr-2" />
            <span>Delete</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}