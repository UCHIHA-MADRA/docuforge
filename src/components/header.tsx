"use client";

import React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Navigation } from "./navigation";

export function Header() {
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">DocuForge</span>
            </Link>
            <div className="ml-8">
              <Navigation />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}