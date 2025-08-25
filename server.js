#!/usr/bin/env node

/**
 * Custom server with WebSocket support for DocuForge
 */

import { initServer } from './dist/lib/server.js';

// Start the server
initServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});