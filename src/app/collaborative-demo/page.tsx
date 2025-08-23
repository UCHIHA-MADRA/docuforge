"use client";

import React, { useState, useEffect } from "react";
// Need to install uuid package
import { v4 as uuidv4 } from "uuid";

import { CollaborativeEditor } from "@/components/CollaborativeEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Users, Link as LinkIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DemoLayout from "../demo-layout";

export default function CollaborativeDemoPage() {
  const [documentId, setDocumentId] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // Generate a random user ID and document ID on component mount
  useEffect(() => {
    // Set user ID
    setUserId(uuidv4());

    // Set document ID from URL or generate new one
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const docParam = urlParams.get("doc");

      if (docParam) {
        setDocumentId(docParam);
      } else {
        setDocumentId(uuidv4().substring(0, 8));
      }

      // Try to get user name from localStorage
      const savedUserName = localStorage.getItem("collaborative_user_name");
      if (savedUserName) {
        setUserName(savedUserName);
      }
    } else {
      setDocumentId(uuidv4().substring(0, 8));
    }
  }, []); // Empty dependency array for one-time execution on mount

  // Update share link when document ID changes
  useEffect(() => {
    if (documentId && typeof window !== "undefined") {
      setShareLink(
        `${window.location.origin}/collaborative-demo?doc=${documentId}`
      );
    }
  }, [documentId]);

  // Check for document ID in URL query parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const docId = params.get("doc");
      if (docId) {
        setDocumentId(docId);
      }
    }
  }, []);

  const handleJoin = () => {
    if (userName.trim()) {
      localStorage.setItem("collaborative_user_name", userName);
      setIsJoined(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSave = (content: string) => {
    console.log("Document saved:", content);
    // In a real app, you would save this to your backend
  };

  if (!isJoined) {
    return (
      <DemoLayout>
        <div className="container mx-auto py-16 px-4">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  Join Collaborative Session
                </CardTitle>
                <CardDescription>
                  Enter your name to join the collaborative editing session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userName">Your Name</Label>
                    <Input
                      id="userName"
                      placeholder="Enter your name"
                      value={userName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUserName(e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="documentId">Document ID</Label>
                    <Input
                      id="documentId"
                      placeholder="Document ID"
                      value={documentId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDocumentId(e.target.value)
                      }
                      disabled={false} // Will be updated in useEffect
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleJoin}
                  className="w-full"
                  disabled={!userName.trim()}
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  Join Session
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </DemoLayout>
    );
  }

  return (
    <DemoLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Collaborative Document
              </h1>
              <div className="flex items-center mt-2">
                <Users className="h-4 w-4 text-gray-500 mr-2" />
                <span className="text-sm text-gray-500">
                  Editing as {userName}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Input
                  value={shareLink}
                  readOnly
                  className="pr-24 w-[280px] text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  className="absolute right-0 top-0 h-full rounded-l-none"
                >
                  <LinkIcon className="h-4 w-4 mr-1" />
                  {isCopied ? "Copied!" : "Copy Link"}
                </Button>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <CollaborativeEditor
              documentId={documentId}
              userId={userId}
              userName={userName}
              initialContent="<h1>Welcome to Collaborative Editing!</h1><p>This document is being edited in real-time. Try opening this link in another browser window to see the collaboration in action.</p>"
              onSave={handleSave}
              readOnly={false}
            />
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <p>Document ID: {documentId}</p>
            <p className="mt-1">
              Share this link with others to collaborate in real-time
            </p>
          </div>
        </div>
      </div>
    </DemoLayout>
  );
}
