"use client";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import type { Doc as YDoc } from "yjs";
import type { WebsocketProvider } from "y-websocket";

interface CollaborationUser {
  id: string;
  name: string;
  color: string;
}

interface AwarenessState {
  user?: CollaborationUser;
}

interface CollaborationExtensionOptions {
  document: YDoc;
  provider: WebsocketProvider;
  user?: CollaborationUser;
  field?: string;
}

export const createCollaborationExtension = (options: CollaborationExtensionOptions) => {
  const extensions = [];
  
  // Add the base collaboration extension
  extensions.push(
    Collaboration.configure({
      document: options.document,
      field: options.field || 'default',
    })
  );
  
  // Add the cursor extension if user info and provider are provided
  if (options.user && options.provider) {
    extensions.push(
      CollaborationCursor.configure({
        provider: options.provider,
        user: {
          name: options.user.name,
          color: options.user.color,
        },
        render: (user: { name: string; color: string }) => {
          // Create the main cursor container
          const cursor = document.createElement("span");
          cursor.classList.add("collaboration-cursor__caret");
          cursor.setAttribute("style", `border-color: ${user.color}`);
          
          // Create the user label
          const label = document.createElement("div");
          label.classList.add("collaboration-cursor__label");
          label.setAttribute(
            "style",
            `background-color: ${user.color}; color: white;`
          );
          label.textContent = user.name || 'Anonymous';
          
          // Append label to cursor
          cursor.appendChild(label);
          
          // Return the cursor element (not an object)
          return cursor;
        },
      })
    );
  }
  
  return extensions;
};

// Enhanced collaboration extension with additional features
export const createAdvancedCollaborationExtension = (options: CollaborationExtensionOptions) => {
  const extensions = [];
  
  // Base collaboration
  extensions.push(
    Collaboration.configure({
      document: options.document,
      field: options.field || 'default',
    })
  );
  
  // Enhanced cursor with better UX
  if (options.user && options.provider) {
    extensions.push(
      CollaborationCursor.configure({
        provider: options.provider,
        user: {
          name: options.user.name,
          color: options.user.color,
        },
        render: (user: { name: string; color: string }) => {
          const cursor = document.createElement("span");
          cursor.classList.add("collaboration-cursor");
          
          // Create cursor line
          const cursorLine = document.createElement("span");
          cursorLine.classList.add("collaboration-cursor__caret");
          cursorLine.style.borderColor = user.color;
          
          // Create user label with enhanced styling
          const label = document.createElement("div");
          label.classList.add("collaboration-cursor__label");
          label.style.backgroundColor = user.color;
          label.style.color = getContrastColor(user.color);
          label.style.borderColor = user.color;
          
          // Add user initial and name
          const initial = document.createElement("span");
          initial.classList.add("collaboration-cursor__initial");
          initial.textContent = (user.name || 'A').charAt(0).toUpperCase();
          
          const name = document.createElement("span");
          name.classList.add("collaboration-cursor__name");
          name.textContent = user.name || 'Anonymous';
          
          label.appendChild(initial);
          label.appendChild(name);
          
          cursor.appendChild(cursorLine);
          cursor.appendChild(label);
          
          return cursor;
        },
        onUpdate: (users) => {
          // Handle user presence updates
          console.log('Active users:', users.length);
          return null;
        },
      })
    );
  }
  
  return extensions;
};

// Utility function to get contrast color for text
function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Helper function to generate random colors for users
export const generateUserColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#AED6F1', '#F1948A', '#D7BDE2',
    '#A9DFBF', '#F9E79F', '#AED6F1', '#F5B7B1', '#D5A6BD'
  ];
  
  // Use user ID to consistently generate same color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// CSS styles for collaboration cursors
export const collaborationStyles = `
  .collaboration-cursor {
    position: relative;
    display: inline;
    pointer-events: none;
  }

  .collaboration-cursor__caret {
    position: relative;
    border-left: 2px solid;
    border-right: 1px solid transparent;
    word-break: normal;
    pointer-events: none;
    animation: collaboration-cursor-blink 1s infinite;
  }

  .collaboration-cursor__label {
    position: absolute;
    top: -28px;
    left: -4px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transform: translateX(-50%);
  }

  .collaboration-cursor__initial {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: bold;
  }

  .collaboration-cursor__name {
    font-size: 10px;
    font-weight: 500;
  }

  @keyframes collaboration-cursor-blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  /* Hide labels when there are too many users to avoid clutter */
  .ProseMirror:has(.collaboration-cursor:nth-of-type(n+5)) .collaboration-cursor__label {
    display: none;
  }

  /* Show label on hover */
  .collaboration-cursor:hover .collaboration-cursor__label {
    display: flex !important;
  }

  /* Selection styles for collaborative editing */
  .collaboration-cursor__selection {
    background-color: rgba(255, 0, 0, 0.2);
    border-radius: 2px;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .collaboration-cursor__label {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .collaboration-cursor__label {
      font-size: 10px;
      padding: 1px 4px;
      top: -24px;
    }
    
    .collaboration-cursor__initial {
      width: 14px;
      height: 14px;
      font-size: 8px;
    }
    
    .collaboration-cursor__name {
      font-size: 9px;
    }
  }
`;

// Types for better TypeScript support
export interface CollaborationEvents {
  userJoined: (user: CollaborationUser) => void;
  userLeft: (userId: string) => void;
  usersChanged: (users: CollaborationUser[]) => void;
}

// Awareness state management helper
export class CollaborationManager {
  private provider: WebsocketProvider;
  private currentUser: CollaborationUser;
  private listeners: Partial<CollaborationEvents> = {};

  constructor(provider: WebsocketProvider, user: CollaborationUser) {
    this.provider = provider;
    this.currentUser = user;
    this.setupAwareness();
  }

  private setupAwareness() {
    if (!this.provider.awareness) return;

    // Set local user state
    this.provider.awareness.setLocalStateField('user', this.currentUser);

    // Listen for awareness changes
    this.provider.awareness.on('change', () => {
      const users = this.getActiveUsers();
      this.listeners.usersChanged?.(users);
    });
  }

  public getActiveUsers(): CollaborationUser[] {
    if (!this.provider.awareness) return [];

    const states = Array.from(this.provider.awareness.getStates().values());
    return states
      .filter((state: { user?: CollaborationUser }) => state.user && state.user.id !== this.currentUser.id)
      .map((state: AwarenessState) => state.user as CollaborationUser);

  }

  public on<K extends keyof CollaborationEvents>(
    event: K,
    listener: CollaborationEvents[K]
  ) {
    this.listeners[event] = listener;
  }

  public updateUser(updates: Partial<CollaborationUser>) {
    this.currentUser = { ...this.currentUser, ...updates };
    this.provider.awareness?.setLocalStateField('user', this.currentUser);
  }

  public destroy() {
    this.provider.awareness?.destroy();
  }
}