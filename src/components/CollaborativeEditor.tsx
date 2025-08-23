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
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
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
  Save,
  Settings,
  AlignLeft,
  AlignCenter,
  AlignRight,
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

interface SaveStatus {
  saving: boolean;
  lastSaved: Date | null;
  autoSaveEnabled: boolean;
}

interface AwarenessState {
  user?: {
    id: string;
    name: string;
    color: string;
  };
}

const COLLABORATION_WS_URL =
  process.env.NEXT_PUBLIC_COLLABORATION_WS_URL || "ws://localhost:3001";

// Helper function to create collaboration extensions
function createCollaborationExtension({
  document,
  provider,
  user,
}: {
  document: Y.Doc;
  provider: WebsocketProvider;
  user: { id: string; name: string; color: string };
}) {
  // This is a placeholder - you'll need to implement actual collaboration extensions
  // based on your specific Y.js setup. Common extensions include:
  // - Collaboration (for shared editing)
  // - CollaborationCursor (for showing other users' cursors)
  return [];
}

// Connection Status Component
function ConnectionStatusComponent({ status }: { status: ConnectionStatus }) {
  const getStatusIcon = () => {
    if (status.connecting) {
      return <Clock className="h-4 w-4 text-yellow-600 animate-spin" />;
    }
    if (status.connected) {
      return <Wifi className="h-4 w-4 text-green-600" />;
    }
    if (status.error) {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    return <WifiOff className="h-4 w-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (status.connecting) return "Connecting...";
    if (status.connected)
      return `Connected${status.latency ? ` (${status.latency}ms)` : ""}`;
    if (status.error) return `Error: ${status.error}`;
    return "Disconnected";
  };

  return (
    <div className="flex items-center space-x-2">
      {getStatusIcon()}
      <span className="text-sm text-gray-600">{getStatusText()}</span>
    </div>
  );
}

// Active Users Component
function ActiveUsersComponent({ users }: { users: UserPresence[] }) {
  return (
    <div className="flex items-center space-x-2">
      <Users className="h-4 w-4 text-gray-600" />
      <span className="text-sm text-gray-600">
        {users.length + 1} user{users.length !== 0 ? "s" : ""}
      </span>
      <div className="flex -space-x-1">
        {users.slice(0, 3).map((user) => (
          <div
            key={user.userId}
            className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-medium"
            style={{ backgroundColor: user.userColor }}
            title={user.userName}
          >
            {user.userName.charAt(0).toUpperCase()}
          </div>
        ))}
        {users.length > 3 && (
          <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-xs text-white font-medium">
            +{users.length - 3}
          </div>
        )}
      </div>
    </div>
  );
}

// Save Status Component
function SaveStatusComponent({ status }: { status: SaveStatus }) {
  const getStatusIcon = () => {
    if (status.saving) {
      return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
    }
    if (status.lastSaved) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <Save className="h-4 w-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (status.saving) return "Saving...";
    if (status.lastSaved) {
      const now = new Date();
      const diff = now.getTime() - status.lastSaved.getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes === 0) return "Saved just now";
      if (minutes === 1) return "Saved 1 minute ago";
      if (minutes < 60) return `Saved ${minutes} minutes ago`;
      const hours = Math.floor(minutes / 60);
      if (hours === 1) return "Saved 1 hour ago";
      return `Saved ${hours} hours ago`;
    }
    return "Not saved";
  };

  return (
    <div className="flex items-center space-x-2">
      {getStatusIcon()}
      <span className="text-sm text-gray-600">{getStatusText()}</span>
      {status.autoSaveEnabled && (
        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
          Auto
        </span>
      )}
    </div>
  );
}

// Editor Toolbar Component
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  return (
    <div className="flex items-center space-x-1 p-2 border-b bg-gray-50">
      <div className="flex items-center space-x-1 border-r pr-2 mr-2">
        <Button
          variant={editor.isActive("bold") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("italic") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("underline") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("strike") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center space-x-1 border-r pr-2 mr-2">
        <Button
          variant={
            editor.isActive("heading", { level: 1 }) ? "default" : "ghost"
          }
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant={
            editor.isActive("heading", { level: 2 }) ? "default" : "ghost"
          }
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant={
            editor.isActive("heading", { level: 3 }) ? "default" : "ghost"
          }
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center space-x-1 border-r pr-2 mr-2">
        <Button
          variant={editor.isActive({ textAlign: "left" }) ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={
            editor.isActive({ textAlign: "center" }) ? "default" : "ghost"
          }
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={
            editor.isActive({ textAlign: "right" }) ? "default" : "ghost"
          }
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center space-x-1">
        <Button
          variant={editor.isActive("bulletList") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("orderedList") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("blockquote") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("code") ? "default" : "ghost"}
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function CollaborativeEditor({
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
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);
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

  // Create save status object
  const saveStatus = useMemo<SaveStatus>(
    () => ({
      saving: isSaving,
      lastSaved,
      autoSaveEnabled,
    }),
    [isSaving, lastSaved, autoSaveEnabled]
  );

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
        try {
          providerRef.current.ws?.send(
            JSON.stringify({ type: "ping", timestamp: start })
          );

          // Measure latency
          setTimeout(() => {
            const latency = Date.now() - start;
            setConnectionStatus((prev) => ({ ...prev, latency }));
          }, 100);
        } catch (error) {
          console.error("Ping failed:", error);
        }
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
          if (providerRef.current.awareness) {
            providerRef.current.awareness.on("change", () => {
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
          }

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

      try {
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
      } catch (error) {
        console.error("Failed to initialize provider:", error);
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
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      ...createCollaborationExtension({
        document: ydoc,
        provider: provider!,
        user: {
          id: userId,
          name: userName,
          color: userColor,
        },
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
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
        if (providerRef.current.awareness) {
          providerRef.current.awareness.on("change", () => {
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
        }

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
  }, [
    userId,
    autoSaveEnabled,
    startPingInterval,
    startAutoSaveInterval,
    scheduleReconnection,
  ]);

  const disconnect = useCallback(() => {
    if (providerRef.current) {
      try {
        providerRef.current.disconnect();
      } catch (error) {
        console.error("Disconnect error:", error);
      }
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
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
    <div className="flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div className="flex items-center space-x-4">
          <ConnectionStatusComponent status={connectionStatus} />
          <ActiveUsersComponent users={activeUsers} />
          <SaveStatusComponent status={saveStatus} />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUserList(!showUserList)}
          >
            <Users className="h-4 w-4 mr-1" />
            Users
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleAutoSave}>
            <Settings className="h-4 w-4 mr-1" />
            Auto-save: {autoSaveEnabled ? "On" : "Off"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={isSaving || !onSave}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor */}
      <div className="flex-1 flex">
        <div className="flex-1 overflow-auto">
          <EditorContent
            editor={editor}
            className="prose max-w-none p-6 min-h-full focus:outline-none"
          />
        </div>

        {/* Active Users Panel */}
        {showUserList && (
          <div className="w-64 bg-gray-50 border-l p-4 overflow-auto">
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
    </div>
  );
}
