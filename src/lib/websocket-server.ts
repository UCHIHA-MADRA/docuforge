import http from "http";
import WebSocket, { WebSocketServer } from "ws";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

// Document store to keep track of all active documents
const docs = new Map<string, Y.Doc>();

// User awareness information
const awarenessStates = new Map<
  string,
  Map<
    number,
    {
      cursor?: { x: number; y: number };
      selection?: { anchor: number; head: number };
      presence?: { status: string; lastActive: number };
      userInfo?: { id: string; name: string; color: string };
    }
  >
>();

// Message types for WebSocket communication
enum MessageType {
  SYNC = 0,
  AWARENESS = 1,
  AUTH = 2,
  ERROR = 3,
}

/**
 * Initialize WebSocket server for real-time collaboration
 * @param server HTTP server instance to attach WebSocket server
 */
export function initWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket connection upgrade
  server.on("upgrade", (request, socket, head) => {
    if (!request.url || !request.headers.host) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host}`);
    const documentId = url.searchParams.get("document");

    if (!documentId) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, documentId);
    });
  });

  // Handle WebSocket connections
  wss.on(
    "connection",
    (ws: WebSocket, request: http.IncomingMessage, documentId: string) => {
      console.log(`New connection for document: ${documentId}`);

      let doc = docs.get(documentId);
      if (!doc) {
        doc = new Y.Doc();
        docs.set(documentId, doc);
        awarenessStates.set(documentId, new Map());
      }

      const clientId = doc.clientID;
      let synced = false;

      // Send initial document state to client
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MessageType.SYNC);
      encoding.writeVarUint8Array(encoder, Y.encodeStateAsUpdate(doc));
      ws.send(encoding.toUint8Array(encoder));

      // Handle messages from client
      ws.on("message", (data: WebSocket.RawData) => {
        const decoder = decoding.createDecoder(
          new Uint8Array(data as ArrayBuffer)
        );
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case MessageType.SYNC: {
            const update = decoding.readVarUint8Array(decoder);
            Y.applyUpdate(doc!, update);

            // Broadcast to all clients except sender
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MessageType.SYNC);
            encoding.writeVarUint8Array(encoder, update);
            const message = encoding.toUint8Array(encoder);

            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
              }
            });

            if (!synced) {
              synced = true;
              console.log(
                `Client ${clientId} synced with document ${documentId}`
              );
            }
            break;
          }

          case MessageType.AWARENESS: {
            const awarenessUpdate = decoding.readVarUint8Array(decoder);
            const awarenessMap = awarenessStates.get(documentId);

            if (awarenessMap) {
              const awarenessDecoder = decoding.createDecoder(awarenessUpdate);
              const numUpdates = decoding.readVarUint(awarenessDecoder);

              for (let i = 0; i < numUpdates; i++) {
                const clientId = decoding.readVarUint(awarenessDecoder);
                const state = JSON.parse(
                  decoding.readVarString(awarenessDecoder)
                );

                if (state === null) {
                  awarenessMap.delete(clientId);
                } else {
                  awarenessMap.set(clientId, state);
                }
              }

              const encoder = encoding.createEncoder();
              encoding.writeVarUint(encoder, MessageType.AWARENESS);
              encoding.writeVarUint8Array(encoder, awarenessUpdate);
              const message = encoding.toUint8Array(encoder);

              wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(message);
                }
              });
            }
            break;
          }

          case MessageType.AUTH: {
            // Authentication logic could be added here
            break;
          }

          default:
            console.warn(`Unknown message type: ${messageType}`);
        }
      });

      // Handle client disconnect
      ws.on("close", () => {
        console.log(
          `Client ${clientId} disconnected from document ${documentId}`
        );

        const awarenessMap = awarenessStates.get(documentId);
        if (awarenessMap) {
          awarenessMap.delete(clientId);

          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MessageType.AWARENESS);

          const awarenessEncoder = encoding.createEncoder();
          encoding.writeVarUint(awarenessEncoder, 1); // one update
          encoding.writeVarUint(awarenessEncoder, clientId);
          encoding.writeVarString(awarenessEncoder, JSON.stringify(null)); // null = removed

          encoding.writeVarUint8Array(
            encoder,
            encoding.toUint8Array(awarenessEncoder)
          );
          const message = encoding.toUint8Array(encoder);

          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
        }

        // Optional: handle persistence or cleanup here
      });

      ws.on("error", (err) => {
        console.error(`WebSocket error for document ${documentId}:`, err);
      });
    }
  );

  return wss;
}

/**
 * Get a Y.Doc instance by document ID
 */
export function getDocument(documentId: string): Y.Doc | undefined {
  return docs.get(documentId);
}

/**
 * Get awareness states for a document
 */
export function getAwarenessStates(documentId: string):
  | Map<
      number,
      {
        cursor?: { x: number; y: number };
        selection?: { anchor: number; head: number };
        presence?: { status: string; lastActive: number };
        userInfo?: { id: string; name: string; color: string };
      }
    >
  | undefined {
  return awarenessStates.get(documentId);
}
