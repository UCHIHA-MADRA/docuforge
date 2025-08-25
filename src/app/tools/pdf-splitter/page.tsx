"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PDFSplitter from "@/components/tools/PDFSplitter";


const PDFSplitterPage: React.FC = () => {
  const router = useRouter();

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">PDF Splitter</h1>
        <p className="text-gray-500 mt-2">
          Extract specific pages from your PDF documents with visual page preview
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <PDFSplitter />
      </div>
    </div>
  );
};

export default PDFSplitterPage;