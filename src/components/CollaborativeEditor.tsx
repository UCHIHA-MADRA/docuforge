"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Underline from "@tiptap/extension-underline";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Users,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Underline as UnderlineIcon,
} from "lucide-react";

interface CollaborativeEditorProps {
  documentId: string;
  userId: string;
  userName: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
}

interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  cursor?: { x: number; y: number };
  selection?: { from: number; to: number };
  lastSeen: number;
}

interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  latency: number | null;
}

interface AwarenessState {
  user?: {
    id: string;
    name: string;
    color: string;
  };
}

interface ProviderOptions {
  connect?: boolean;
  awareness?: {
    setLocalStateField: (field: string, value: unknown) => void;
    getStates: () => Map<number, unknown>;
    on: (event: string, callback: () => void) => void;
  };
  params?: { [key: string]: string };
  WebSocketPolyfill?: typeof WebSocket;
  resyncInterval?: number;
  maxBackoffTime?: number;
  disableOffline?: boolean;
  maxConns?: number;
  filterBcConns?: boolean;
  peerOpts?: Record<string, unknown>;
}

const COLLABORATION_WS_URL =
  process.env.NEXT_PUBLIC_COLLABORATION_WS_URL || "ws://localhost:3001";

export default function CollaborativeEditor({
  documentId,
  userId,
  userName,
  initialContent = "",
  onSave,
  readOnly = false,
}: CollaborativeEditorProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    connecting: false,
    error: null,
    latency: null,
  });

  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showUserList, setShowUserList] = useState(false);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const editorRef = useRef<any | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique user color
  const userColor = useMemo(() => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E9",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  // Initialize Y.js document
  const ydoc = useMemo(() => {
    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
    }
    return ydocRef.current;
  }, []);

  // Auto-save handler
  const handleAutoSave = useCallback(
    async (content: string) => {
      if (!onSave) return;

      try {
        setIsSaving(true);
        await onSave(content);
        setLastSaved(new Date());
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [onSave]
  );

  // Start auto-save interval
  const startAutoSaveInterval = useCallback(() => {
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }

    autoSaveIntervalRef.current = setInterval(() => {
      if (editorRef.current && onSave && autoSaveEnabled) {
        const content = editorRef.current.getHTML();
        handleAutoSave(content);
      }
    }, 30000); // Auto-save every 30 seconds
  }, [onSave, autoSaveEnabled, handleAutoSave]);

  // Start ping interval
  const startPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      if (providerRef.current?.wsconnected) {
        const start = Date.now();
        providerRef.current.ws?.send(
          JSON.stringify({ type: "ping", timestamp: start })
        );

        // Measure latency
        setTimeout(() => {
          const latency = Date.now() - start;
          setConnectionStatus((prev) => ({ ...prev, latency }));
        }, 100);
      }
    }, 10000); // Ping every 10 seconds
  }, []);

  // Schedule reconnection
  const scheduleReconnection = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const connectFn = () => {
      setConnectionStatus((prev) => {
        if (prev.connected || prev.connecting) {
          return prev;
        }
        return { ...prev, connecting: true, error: null };
      });

      try {
        // Connect to WebSocket
        if (providerRef.current) {
          providerRef.current.connect();
        }

        // Set up connection event handlers
        if (providerRef.current) {
          providerRef.current.on(
            "status",
            ({ status }: { status: "connected" | "disconnected" }) => {
              setConnectionStatus((prev) => ({
                ...prev,
                connected: status === "connected",
                connecting: false,
                error: null,
              }));
            }
          );

          providerRef.current.on("sync", (isSynced: boolean) => {
            if (isSynced) {
              console.log("Document synced successfully");
              setConnectionStatus((prev) => ({ ...prev, error: null }));
            }
          });

          // Set up awareness (user presence)
          providerRef.current.awareness?.on("change", () => {
            const states = Array.from(
              providerRef.current!.awareness!.getStates().values()
            ) as AwarenessState[];
            const users: UserPresence[] = states
              .filter((state) => state.user && state.user.id !== userId)
              .map((state) => ({
                userId: state.user!.id,
                userName: state.user!.name,
                userColor: state.user!.color,
                lastSeen: Date.now(),
              }));

            setActiveUsers(users);
          });

          // Start ping interval for latency measurement
          startPingInterval();

          // Auto-save interval
          if (autoSaveEnabled) {
            startAutoSaveInterval();
          }
        }
      } catch (error) {
        console.error("Failed to connect:", error);
        setConnectionStatus((prev) => ({
          ...prev,
          connecting: false,
          error: error instanceof Error ? error.message : "Connection failed",
        }));

        // Schedule reconnection
        scheduleReconnection();
      }
    };

    reconnectTimeoutRef.current = setTimeout(connectFn, 5000); // Retry after 5 seconds
  }, [userId, autoSaveEnabled, startPingInterval, startAutoSaveInterval]);

  // Initialize WebSocket provider
  const provider = useMemo(() => {
    if (!providerRef.current) {
      const isBrowser = typeof window !== "undefined";
      
      providerRef.current = new WebsocketProvider(
        COLLABORATION_WS_URL,
        documentId,
        ydoc,
        {
          connect: false, // Don't connect immediately
          WebSocketPolyfill: isBrowser ? WebSocket : undefined,
          params: {
            docId: documentId,
            userId,
            userName,
            userColor,
          },
        }
      );

      // Set awareness user info
      if (providerRef.current.awareness) {
        providerRef.current.awareness.setLocalStateField("user", {
          id: userId,
          name: userName,
          color: userColor,
        });
      }
    }
    return providerRef.current;
  }, [documentId, userId, userName, userColor, ydoc]);

  // Set up editor with Tiptap
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Disable history as we're using Y.js
      }),
      Underline,
      Collaboration.configure({
        document: ydoc,
        field: "content",
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          id: userId,
          name: userName,
          color: userColor,
        },
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }: { editor: any }) => {
      // Handle content updates
      if (autoSaveEnabled && onSave) {
        const content = editor.getHTML();
        handleAutoSave(content);
      }
    },
  });

  // Store editor reference
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Connection management
  const connect = useCallback(async () => {
    setConnectionStatus((prev) => {
      if (prev.connected || prev.connecting) {
        return prev;
      }
      return { ...prev, connecting: true, error: null };
    });

    try {
      // Connect to WebSocket
      if (providerRef.current) {
        await providerRef.current.connect();

        // Set up connection event handlers
        providerRef.current.on(
          "status",
          ({ status }: { status: "connected" | "disconnected" }) => {
            setConnectionStatus((prev) => ({
              ...prev,
              connected: status === "connected",
              connecting: false,
              error: null,
            }));
          }
        );

        providerRef.current.on("sync", (isSynced: boolean) => {
          if (isSynced) {
            console.log("Document synced successfully");
            setConnectionStatus((prev) => ({ ...prev, error: null }));
          }
        });

        // Set up awareness (user presence)
        providerRef.current.awareness?.on("change", () => {
          const states = Array.from(
            providerRef.current!.awareness!.getStates().values()
          ) as AwarenessState[];
          const users: UserPresence[] = states
            .filter((state) => state.user && state.user.id !== userId)
            .map((state) => ({
              userId: state.user!.id,
              userName: state.user!.name,
              userColor: state.user!.color,
              lastSeen: Date.now(),
            }));

          setActiveUsers(users);
        });

        // Start ping interval for latency measurement
        startPingInterval();

        // Auto-save interval
        if (autoSaveEnabled) {
          startAutoSaveInterval();
        }
      }
    } catch (error) {
      console.error("Failed to connect:", error);
      setConnectionStatus((prev) => ({
        ...prev,
        connecting: false,
        error: error instanceof Error ? error.message : "Connection failed",
      }));

      // Schedule reconnection
      scheduleReconnection();
    }
  }, [userId, autoSaveEnabled, startPingInterval, startAutoSaveInterval, scheduleReconnection]);

  const disconnect = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.disconnect();
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }

    setConnectionStatus({
      connected: false,
      connecting: false,
      error: null,
      latency: null,
    });

    setActiveUsers([]);
  }, []);

  const handleManualSave = useCallback(async () => {
    if (!editor || !onSave) return;

    try {
      setIsSaving(true);
      const content = editor.getHTML();
      await onSave(content);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Manual save failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [editor, onSave]);

  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled((prev) => {
      const newValue = !prev;
      if (newValue) {
        startAutoSaveInterval();
      } else if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      return newValue;
    });
  }, [startAutoSaveInterval]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [connect, disconnect]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Editor Toolbar */}
      <div className="bg-white border border-gray-200 rounded-t-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Collaborative Editor
            </h3>

            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {connectionStatus.connected ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm">Connected</span>
                  {connectionStatus.latency && (
                    <span className="text-xs text-gray-500">
                      ({connectionStatus.latency}ms)
                    </span>
                  )}
                </div>
              ) : connectionStatus.connecting ? (
                <div className="flex items-center space-x-1 text-yellow-600">
                  <Clock className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Connecting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-600">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm">Disconnected</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Active Users */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUserList(!showUserList)}
              className="flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>{activeUsers.length + 1}</span>
            </Button>

            {/* Save Controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAutoSave}
              className={
                autoSaveEnabled
                  ? "bg-green-50 text-green-700 border-green-200"
                  : ""
              }
            >
              {autoSaveEnabled ? "Auto-save ON" : "Auto-save OFF"}
            </Button>

            <Button
              onClick={handleManualSave}
              disabled={isSaving || !connectionStatus.connected}
              size="sm"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={
              editor.isActive("bold") ? "bg-blue-100 text-blue-700" : ""
            }
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={
              editor.isActive("italic") ? "bg-blue-100 text-blue-700" : ""
            }
          >
            <Italic className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={
              !editor.can().chain().focus().toggleUnderline().run()
            }
            className={
              editor.isActive("underline") ? "bg-blue-100 text-blue-700" : ""
            }
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={
              editor.isActive("strike") ? "bg-blue-100 text-blue-700" : ""
            }
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2"></div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className={
              editor.isActive("heading", { level: 1 })
                ? "bg-blue-100 text-blue-700"
                : ""
            }
          >
            <Heading1 className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={
              editor.isActive("heading", { level: 2 })
                ? "bg-blue-100 text-blue-700"
                : ""
            }
          >
            <Heading2 className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className={
              editor.isActive("heading", { level: 3 })
                ? "bg-blue-100 text-blue-700"
                : ""
            }
          >
            <Heading3 className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2"></div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={
              editor.isActive("bulletList") ? "bg-blue-100 text-blue-700" : ""
            }
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={
              editor.isActive("orderedList") ? "bg-blue-100 text-blue-700" : ""
            }
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={
              editor.isActive("blockquote") ? "bg-blue-100 text-blue-700" : ""
            }
          >
            <Quote className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={
              editor.isActive("codeBlock") ? "bg-blue-100 text-blue-700" : ""
            }
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>

        {/* Error Display */}
        {connectionStatus.error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">
                Connection error: {connectionStatus.error}
              </span>
            </div>
          </div>
        )}

        {/* Last Saved Info */}
        {lastSaved && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-gray-500">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="bg-white border border-gray-200 rounded-b-lg shadow-sm">
        <EditorContent
          editor={editor}
          className="prose prose-lg max-w-none p-6 min-h-[500px] focus:outline-none"
        />
      </div>

      {/* Active Users Panel */}
      {showUserList && (
        <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="font-medium text-gray-900 mb-3">Active Users</h4>
          <div className="space-y-2">
            {/* Current User */}
            <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: userColor }}
              ></div>
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {userName} (You)
              </span>
              <span className="text-xs text-blue-600">● Online</span>
            </div>

            {/* Other Users */}
            {activeUsers.map((user) => (
              <div
                key={user.userId}
                className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: user.userColor }}
                ></div>
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  {user.userName}
                </span>
                <span className="text-xs text-gray-600">● Online</span>
              </div>
            ))}

            {activeUsers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">
                No other users currently editing
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
