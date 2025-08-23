"use client";

import React, { useState } from "react";
import RichTextEditor from "@/components/editor/rich-text-editor";
import { Button } from "@/components/ui/button";
import { FileText, Save } from "lucide-react";
import DemoLayout from "../demo-layout";

export default function EditorDemoPage() {
  const [content, setContent] = useState(
    "<h1>Welcome to the Rich Text Editor</h1><p>This is a demonstration of the rich text editor component. Try out the formatting options in the toolbar above.</p>"
  );
  const [savedContent, setSavedContent] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setSavedContent(content);
    setIsSaved(true);
    
    // Reset the saved notification after 3 seconds
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  return (
    <DemoLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rich Text Editor Demo</h1>
              <p className="text-gray-600">Try out our powerful rich text editor with formatting options</p>
            </div>
            
            <Button onClick={handleSave} className="flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>Save Content</span>
            </Button>
          </div>
          
          {isSaved && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-600">Content saved successfully!</p>
              </div>
            </div>
          )}
          
          <div className="mb-8">
            <RichTextEditor 
              content={content} 
              onChange={setContent} 
              className="min-h-[400px]"
            />
          </div>
          
          {savedContent && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Saved Content Preview</h2>
              <div 
                className="prose max-w-none p-4 border border-gray-200 rounded-lg bg-gray-50"
                dangerouslySetInnerHTML={{ __html: savedContent }}
              />
            </div>
          )}
        </div>
      </div>
    </DemoLayout>
  );
}