import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
// Note: y-websocket collab server runs on its own port (3001) via src/lib/collaboration-server.ts
// We keep the HTTP server focused on Next.js; real-time editor connects to ws://localhost:3001

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/**
 * Initialize the server with WebSocket support
 */
export async function initServer() {
  try {
    await app.prepare();
    
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling request:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    // Real-time collaboration runs via dedicated y-websocket server (port 3001)
    // This HTTP server only handles Next.js

    // Start listening
    server.listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Collaboration server should be started separately on ws://localhost:3001`);
    });

    // Handle server shutdown
    const handleShutdown = () => {
      console.log('Shutting down server...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);

    return { server };
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}