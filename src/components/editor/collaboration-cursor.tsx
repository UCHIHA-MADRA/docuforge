"use client";

import { useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";

// Awareness type - import separately if available, otherwise define
interface Awareness {
  clientID: number;
  getStates(): Map<number, Record<string, unknown>>;
  setLocalStateField(field: string, value: unknown): void;
  getLocalState(): Record<string, unknown> | null;
  on(
    event: string,
    callback: (changes: {
      added: number[];
      updated: number[];
      removed: number[];
    }) => void
  ): void;
  off(
    event: string,
    callback: (changes: {
      added: number[];
      updated: number[];
      removed: number[];
    }) => void
  ): void;
}

// Define proper provider interface based on Yjs providers
interface YjsProvider {
  awareness: Awareness;
  doc: Y.Doc;
  connect(): void;
  disconnect(): void;
  destroy(): void;
  wsconnected?: boolean;
  synced?: boolean;
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
}

// User interface for collaboration
interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

// Props for the collaboration cursor hook
interface CollaborationCursorProps {
  editor: Editor | null;
  user: CollaborationUser;
  provider: YjsProvider;
  onUserJoined?: (user: CollaborationUser) => void;
  onUserLeft?: (user: CollaborationUser) => void;
  onConnectionStatusChange?: (
    status: "connecting" | "connected" | "disconnected" | "error"
  ) => void;
}

// Custom hook for managing collaboration cursor
export function useCollaborationCursor({
  editor,
  user,
  provider,
  onUserJoined,
  onUserLeft,
  onConnectionStatusChange,
}: CollaborationCursorProps) {
  const connectionStatusRef = useRef<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");
  const activeUsersRef = useRef<Map<string, CollaborationUser>>(new Map());

  // Validate user data
  const validateUser = useCallback((user: CollaborationUser): boolean => {
    if (!user?.id || typeof user.id !== "string") {
      console.error(
        "CollaborationCursor: User ID is required and must be a string"
      );
      return false;
    }
    if (!user?.name || typeof user.name !== "string") {
      console.error(
        "CollaborationCursor: User name is required and must be a string"
      );
      return false;
    }
    if (!user?.color || typeof user.color !== "string") {
      console.error(
        "CollaborationCursor: User color is required and must be a string"
      );
      return false;
    }
    // Validate color format (hex, rgb, rgba, or named colors)
    const colorRegex = /^(#[0-9A-Fa-f]{3,8}|rgb\(|rgba\(|[a-zA-Z]+).*$/;
    if (!colorRegex.test(user.color)) {
      console.error(
        "CollaborationCursor: User color must be a valid CSS color"
      );
      return false;
    }
    return true;
  }, []);

  // Handle awareness state changes
  const handleAwarenessChange = useCallback(() => {
    if (!provider?.awareness) return;

    const states = provider.awareness.getStates();
    const currentUsers = new Map<string, CollaborationUser>();

    states.forEach((state: Record<string, unknown>, clientId: number) => {
      const user = state.user as CollaborationUser;
      if (
        user &&
        validateUser(user) &&
        clientId !== provider.awareness.clientID
      ) {
        currentUsers.set(user.id, user);
      }
    });

    // Detect new users
    currentUsers.forEach((user) => {
      if (!activeUsersRef.current.has(user.id)) {
        onUserJoined?.(user);
      }
    });

    // Detect users who left
    activeUsersRef.current.forEach((user) => {
      if (!currentUsers.has(user.id)) {
        onUserLeft?.(user);
      }
    });

    activeUsersRef.current = currentUsers;
  }, [provider, onUserJoined, onUserLeft, validateUser]);

  // Handle connection status changes
  const handleConnectionStatusChange = useCallback(
    (status: typeof connectionStatusRef.current) => {
      if (connectionStatusRef.current !== status) {
        connectionStatusRef.current = status;
        onConnectionStatusChange?.(status);
      }
    },
    [onConnectionStatusChange]
  );

  // Setup provider event listeners
  useEffect(() => {
    if (!provider) return;

    const onConnect = () => handleConnectionStatusChange("connected");
    const onDisconnect = () => handleConnectionStatusChange("disconnected");
    const onError = () => handleConnectionStatusChange("error");
    const onSync = (...args: unknown[]) => {
      const synced = args[0] as boolean;
      if (synced && connectionStatusRef.current === "connecting") {
        handleConnectionStatusChange("connected");
      }
    };

    // Add event listeners with error handling
    try {
      provider.on("connect", onConnect);
      provider.on("disconnect", onDisconnect);
      provider.on("connection-error", onError);
      provider.on("sync", onSync);

      // Handle awareness changes with proper typing
      const awarenessChangeHandler = () => handleAwarenessChange();
      provider.awareness?.on("change", awarenessChangeHandler);

      // Set initial connecting state
      handleConnectionStatusChange("connecting");

      return () => {
        try {
          provider.off("connect", onConnect);
          provider.off("disconnect", onDisconnect);
          provider.off("connection-error", onError);
          provider.off("sync", onSync);
          provider.awareness?.off("change", awarenessChangeHandler);
        } catch (error) {
          console.error(
            "CollaborationCursor: Error cleaning up provider listeners:",
            error
          );
        }
      };
    } catch (error) {
      console.error(
        "CollaborationCursor: Error setting up provider listeners:",
        error
      );
      handleConnectionStatusChange("error");
    }
  }, [provider, handleAwarenessChange, handleConnectionStatusChange]);

  // Setup user awareness
  useEffect(() => {
    if (!provider?.awareness || !validateUser(user)) return;

    try {
      // Set local user state in awareness
      provider.awareness.setLocalStateField("user", {
        id: user.id,
        name: user.name,
        color: user.color,
        avatar: user.avatar,
      });

      // Set cursor information
      provider.awareness.setLocalStateField("cursor", null);
    } catch (error) {
      console.error(
        "CollaborationCursor: Error setting user awareness:",
        error
      );
    }

    return () => {
      try {
        // Clean up awareness on unmount
        provider.awareness?.setLocalStateField("user", null);
        provider.awareness?.setLocalStateField("cursor", null);
      } catch (error) {
        console.error(
          "CollaborationCursor: Error cleaning up awareness:",
          error
        );
      }
    };
  }, [provider, user, validateUser]);

  // Verify editor has collaboration cursor extension
  useEffect(() => {
    if (!editor) return;

    const hasCollabCursor = editor.extensionManager.extensions.some(
      (extension) => extension.name === "collaborationCursor"
    );

    if (!hasCollabCursor) {
      console.warn(
        "CollaborationCursor: Editor does not have CollaborationCursor extension. " +
          "Make sure to add it during editor initialization using createCollaborationCursorExtension()."
      );
    }
  }, [editor]);

  return {
    activeUsers: Array.from(activeUsersRef.current.values()),
    connectionStatus: connectionStatusRef.current,
    isConnected: connectionStatusRef.current === "connected",
  };
}

// Sanitize CSS color value
function sanitizeColor(color: string): string {
  // Remove any potential CSS injection
  const sanitized = color.replace(/[<>'"]/g, "");

  // Validate against common color formats
  const colorFormats = [
    /^#([A-Fa-f0-9]{3}){1,2}$/, // hex
    /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/, // rgb
    /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/, // rgba
    /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/, // hsl
    /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)$/, // hsla
  ];

  const isValidFormat = colorFormats.some((format) => format.test(sanitized));

  // Return sanitized color or fallback
  return isValidFormat ? sanitized : "#000000";
}

// Create DOM element safely
function createCursorElement(user: Record<string, unknown>): HTMLElement {
  try {
    const userName = typeof user.name === "string" ? user.name : "Anonymous";
    const userColor = sanitizeColor(
      typeof user.color === "string" ? user.color : "#000000"
    );
    const userId = typeof user.id === "string" ? user.id : "unknown";

    // Create cursor wrapper
    const cursor = document.createElement("span");
    cursor.className = "collaboration-cursor";
    cursor.setAttribute("data-user-id", userId);
    cursor.style.cssText = `
      position: relative;
      border-left: 2px solid ${userColor};
      border-right: 2px solid ${userColor};
      margin-left: -1px;
      margin-right: -1px;
      pointer-events: none;
      z-index: 1000;
    `;

    // Create user label
    const label = document.createElement("div");
    label.className = "collaboration-cursor-label";
    label.style.cssText = `
      position: absolute;
      top: -30px;
      left: -4px;
      background-color: ${userColor};
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
      z-index: 1001;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.2;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    // Safely set text content
    label.textContent = userName.slice(0, 20); // Limit length for UI

    // Create small triangle pointer
    const pointer = document.createElement("div");
    pointer.className = "collaboration-cursor-pointer";
    pointer.style.cssText = `
      position: absolute;
      top: 100%;
      left: 8px;
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 4px solid ${userColor};
      pointer-events: none;
    `;

    label.appendChild(pointer);
    cursor.appendChild(label);

    return cursor;
  } catch (error) {
    console.error("CollaborationCursor: Error creating cursor element:", error);

    // Return fallback element
    const fallback = document.createElement("span");
    fallback.className = "collaboration-cursor collaboration-cursor-fallback";
    fallback.style.cssText = `
      position: relative;
      border-left: 2px solid #000000;
      border-right: 2px solid #000000;
      margin-left: -1px;
      margin-right: -1px;
      pointer-events: none;
    `;
    return fallback;
  }
}

// Extension factory function with comprehensive error handling
export function createCollaborationCursorExtension(
  provider: YjsProvider,
  user: CollaborationUser
): ReturnType<typeof CollaborationCursor.configure> | null {
  try {
    // Validate inputs
    if (!provider) {
      console.error("CollaborationCursor: Provider is required");
      return null;
    }

    if (!provider.awareness) {
      console.error(
        "CollaborationCursor: Provider must have awareness capability"
      );
      return null;
    }

    if (!user?.id || !user?.name || !user?.color) {
      console.error(
        "CollaborationCursor: User must have id, name, and color properties"
      );
      return null;
    }

    return CollaborationCursor.configure({
      provider,
      user: {
        id: user.id,
        name: user.name,
        color: sanitizeColor(user.color),
        avatar: user.avatar,
      },
      render: createCursorElement,
      onUpdate: (
        users: Array<{ [key: string]: unknown; clientId: number }>
      ): null => {
        // Optional: Handle cursor updates
        console.debug(
          "CollaborationCursor: Active users updated",
          users.length
        );
        return null;
      },
    });
  } catch (error) {
    console.error("CollaborationCursor: Error creating extension:", error);
    return null;
  }
}

// Utility function to check if collaboration is supported
export function isCollaborationSupported(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof WebSocket !== "undefined" &&
      typeof Y !== "undefined"
    );
  } catch {
    return false;
  }
}

// Utility function to generate random user color
export function generateUserColor(userId: string): string {
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
    "#F8C471",
    "#82E0AA",
    "#F1948A",
    "#85C1E9",
    "#D7BDE2",
  ];

  // Generate consistent color based on user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

// Export types for consumers
export type { CollaborationUser, YjsProvider, CollaborationCursorProps };
