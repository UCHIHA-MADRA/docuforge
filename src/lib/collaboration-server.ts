import { WebSocketServer } from "ws";
// Type-only module lacks declarations; declare module in ambient types if needed
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { setupWSConnection } from "y-websocket/bin/utils";

class CollaborationServer {
  private wss: WebSocketServer;

  constructor(port: number = 3001) {
    this.wss = new WebSocketServer({ port });

    this.wss.on("connection", (ws, req) => {
      try {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        // Use pathname as the docName if provided like /<docId>, fallback to query "docId"
        const pathDoc = url.pathname?.replace(/^\//, "");
        const queryDoc = url.searchParams.get("docId") || undefined;
        const docName = pathDoc || queryDoc;

        if (!docName) {
          ws.close(1008, "Missing document identifier");
          return;
        }

        setupWSConnection(ws as any, req as any, { docName });
      } catch (err) {
        console.error("Error establishing y-websocket connection:", err);
        try { ws.close(); } catch {}
      }
    });

    this.wss.on("listening", () => {
      console.log(`y-websocket collaboration server listening on ws://localhost:${(this.wss.address() as any).port}`);
    });

    this.wss.on("error", (err) => {
      console.error("WebSocket server error:", err);
    });
  }

  public shutdown() {
    try {
      this.wss.close(() => {
        console.log("Collaboration server closed");
      });
    } catch (err) {
      console.error("Error during collaboration server shutdown:", err);
    }
  }
}

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

if (process.env.NODE_ENV === "development") {
  const port = parseInt(process.env.COLLABORATION_PORT || "3001");
  startCollaborationServer(port);
}
