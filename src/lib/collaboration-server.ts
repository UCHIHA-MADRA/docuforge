import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
// setupWSConnection is not available in the main package, so we'll implement WebSocket handling directly
import { IncomingMessage } from "http";
import { URL } from "url";

interface CollaborationSession {
  docId: string;
  doc: Y.Doc;
  connections: Set<WebSocket>;
  lastActivity: number;
  userCount: number;
}

interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  cursor?: { x: number; y: number };
  selection?: { from: number; to: number };
}

class CollaborationServer {
  private wss: WebSocketServer;
  private sessions: Map<string, CollaborationSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> Set<docId>
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_CONNECTIONS_PER_USER = 10;
  private readonly MAX_SESSIONS_PER_USER = 5;

  constructor(port: number = 3001) {
    this.wss = new WebSocketServer({
      port,
      perMessageDeflate: false, // Disable compression for better performance
      maxPayload: 1024 * 1024, // 1MB max message size
    });

    this.setupEventHandlers();
    this.startCleanupInterval();

    console.log(`Collaboration server started on port ${port}`);
  }

  private setupEventHandlers() {
    this.wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    this.wss.on("error", (error) => {
      console.error("WebSocket server error:", error);
    });

    // Graceful shutdown
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage) {
    try {
      const url = new URL(request.url || "", `http://${request.headers.host}`);
      const docId = url.searchParams.get("docId");
      const userId = url.searchParams.get("userId");
      const userName = url.searchParams.get("userName") || "Anonymous";
      const userColor =
        url.searchParams.get("userColor") || this.generateUserColor();

      if (!docId || !userId) {
        ws.close(1008, "Missing required parameters");
        return;
      }

      // Validate user session limits
      if (!this.validateUserLimits(userId, docId)) {
        ws.close(1008, "User session limit exceeded");
        return;
      }

      // Create or get collaboration session
      const session = this.getOrCreateSession(docId);

      // Add connection to session
      session.connections.add(ws);
      session.userCount = session.connections.size;
      session.lastActivity = Date.now();

      // Track user sessions
      this.trackUserSession(userId, docId);

      // Set up connection event handlers
      this.setupConnectionHandlers(ws, session, userId, userName, userColor);

      console.log(
        `User ${userId} connected to document ${docId}. Total connections: ${session.connections.size}`
      );
    } catch (error) {
      console.error("Error handling connection:", error);
      ws.close(1011, "Internal server error");
    }
  }

  private setupConnectionHandlers(
    ws: WebSocket,
    session: CollaborationSession,
    userId: string,
    userName: string,
    userColor: string
  ) {
    // Handle user presence
    const presence: UserPresence = {
      userId,
      userName,
      userColor,
    };

    // Broadcast user joined
    this.broadcastToSession(
      session,
      {
        type: "userJoined",
        user: presence,
        timestamp: Date.now(),
      },
      ws
    );

    // Handle incoming messages (both Y.js binary updates and JSON presence messages)
    ws.on("message", (data: Buffer) => {
      try {
        // Y.js sends binary data for document updates
        if (data instanceof Buffer) {
          // Apply the update to the Y.js document
          Y.applyUpdate(session.doc, data);

          // Broadcast the update to other clients (send binary data directly)
          this.broadcastToSession(session, data, ws);

          console.log(
            `Applied Y.js update from user ${userId} to document ${session.docId}`
          );
        } else {
          // Handle JSON messages for presence and other features
          const message = JSON.parse(data.toString()) as {
            type: string;
            cursor?: { x: number; y: number };
            selection?: { from: number; to: number };
          };

          switch (message.type) {
            case "cursorMove":
              presence.cursor = message.cursor;
              this.broadcastToSession(
                session,
                {
                  type: "cursorMove",
                  userId,
                  cursor: message.cursor,
                  timestamp: Date.now(),
                },
                ws
              );
              break;

            case "selectionChange":
              presence.selection = message.selection;
              this.broadcastToSession(
                session,
                {
                  type: "selectionChange",
                  userId,
                  selection: message.selection,
                  timestamp: Date.now(),
                },
                ws
              );
              break;

            case "ping":
              ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
              break;
          }
        }

        session.lastActivity = Date.now();
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    // Handle connection close
    ws.on("close", (code: number, reason: Buffer) => {
      this.handleDisconnection(ws, session, userId, presence);
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
      this.handleDisconnection(ws, session, userId, presence);
    });

    // Handle pong responses
    ws.on("pong", () => {
      // Connection is alive
    });
  }

  private handleDisconnection(
    ws: WebSocket,
    session: CollaborationSession,
    userId: string,
    presence: UserPresence
  ) {
    // Remove connection from session
    session.connections.delete(ws);
    session.userCount = session.connections.size;
    session.lastActivity = Date.now();

    // Remove user session tracking
    this.untrackUserSession(userId, session.docId);

    // Broadcast user left
    this.broadcastToSession(
      session,
      {
        type: "userLeft",
        userId,
        userName: presence.userName,
        timestamp: Date.now(),
      },
      ws
    );

    console.log(
      `User ${userId} disconnected from document ${session.docId}. Remaining connections: ${session.connections.size}`
    );

    // Clean up empty sessions
    if (session.connections.size === 0) {
      this.cleanupSession(session.docId);
    }
  }

  private getOrCreateSession(docId: string): CollaborationSession {
    let session = this.sessions.get(docId);

    if (!session) {
      const doc = new Y.Doc();

      // Set up document event handlers
      doc.on("afterTransaction", (transaction: Y.Transaction) => {
        // Log document changes for debugging
        if (transaction.origin !== null) {
          console.log(
            `Document ${docId} changed by transaction:`,
            transaction.origin
          );
        }
      });

      session = {
        docId,
        doc,
        connections: new Set(),
        lastActivity: Date.now(),
        userCount: 0,
      };

      this.sessions.set(docId, session);
      console.log(`Created new collaboration session for document ${docId}`);
    }

    return session;
  }

  private validateUserLimits(userId: string, docId: string): boolean {
    const userSessions = this.userSessions.get(userId) || new Set();

    // Check if user is already connected to this document
    if (userSessions.has(docId)) {
      return true;
    }

    // Check session limits
    if (userSessions.size >= this.MAX_SESSIONS_PER_USER) {
      console.warn(
        `User ${userId} exceeded session limit: ${userSessions.size}/${this.MAX_SESSIONS_PER_USER}`
      );
      return false;
    }

    return true;
  }

  private trackUserSession(userId: string, docId: string) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(docId);
  }

  private untrackUserSession(userId: string, docId: string) {
    const userSessions = this.userSessions.get(userId);
    if (userSessions) {
      userSessions.delete(docId);
      if (userSessions.size === 0) {
        this.userSessions.delete(userId);
      }
    }
  }

  private broadcastToSession(
    session: CollaborationSession,
    message: Record<string, unknown> | Buffer,
    excludeWs?: WebSocket
  ) {
    let dataToSend: string | Buffer;

    if (message instanceof Buffer) {
      // Binary data (Y.js updates)
      dataToSend = message;
    } else {
      // JSON message
      dataToSend = JSON.stringify(message);
    }

    session.connections.forEach((ws) => {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(dataToSend);
        } catch (error) {
          console.error("Error broadcasting message:", error);
          // Remove broken connection
          session.connections.delete(ws);
        }
      }
    });
  }

  private cleanupSession(docId: string) {
    const session = this.sessions.get(docId);
    if (session) {
      // Destroy Y.js document
      session.doc.destroy();

      // Close all connections
      session.connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, "Session cleanup");
        }
      });

      this.sessions.delete(docId);
      console.log(`Cleaned up collaboration session for document ${docId}`);
    }
  }

  private generateUserColor(): string {
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
  }

  private startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();

      for (const [docId, session] of Array.from(this.sessions.entries())) {
        if (now - session.lastActivity > this.SESSION_TIMEOUT) {
          console.log(`Cleaning up inactive session: ${docId}`);
          this.cleanupSession(docId);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  public getStats() {
    return {
      totalSessions: this.sessions.size,
      totalConnections: Array.from(this.sessions.values()).reduce(
        (sum, session) => sum + session.connections.size,
        0
      ),
      totalUsers: this.userSessions.size,
      sessions: Array.from(this.sessions.entries()).map(([docId, session]) => ({
        docId,
        userCount: session.userCount,
        lastActivity: session.lastActivity,
        connections: session.connections.size,
      })),
    };
  }

  public shutdown() {
    console.log("Shutting down collaboration server...");

    // Close all connections
    this.wss.clients.forEach((client) => {
      client.close(1000, "Server shutdown");
    });

    // Clean up all sessions
    for (const [docId] of Array.from(this.sessions.entries())) {
      this.cleanupSession(docId);
    }

    // Close WebSocket server
    this.wss.close(() => {
      console.log("Collaboration server shutdown complete");
      process.exit(0);
    });
  }
}

// Export singleton instance
let collaborationServer: CollaborationServer | null = null;

export function startCollaborationServer(port?: number): CollaborationServer {
  if (!collaborationServer) {
    collaborationServer = new CollaborationServer(port);
  }
  return collaborationServer;
}

export function getCollaborationServer(): CollaborationServer | null {
  return collaborationServer;
}

// For development/testing
if (process.env.NODE_ENV === "development") {
  const port = parseInt(process.env.COLLABORATION_PORT || "3001");
  console.log(`🚀 Starting collaboration server on port ${port}...`);
  startCollaborationServer(port);
  console.log(`✅ Collaboration server started successfully!`);
}
