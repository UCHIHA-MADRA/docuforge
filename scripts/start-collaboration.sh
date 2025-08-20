#!/bin/bash

# Start Collaboration Server Script
# This script starts the WebSocket server for real-time collaboration

echo "🚀 Starting DocuForge Collaboration Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory."
    exit 1
fi

# Set default port
COLLABORATION_PORT=${COLLABORATION_PORT:-3001}

echo "📡 Collaboration server will start on port $COLLABORATION_PORT"

# Check if port is already in use
if lsof -Pi :$COLLABORATION_PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port $COLLABORATION_PORT is already in use."
    echo "   You can either:"
    echo "   1. Stop the process using port $COLLABORATION_PORT"
    echo "   2. Set a different port: COLLABORATION_PORT=3002 ./scripts/start-collaboration.sh"
    exit 1
fi

# Set environment variables
export NODE_ENV=development
export COLLABORATION_PORT=$COLLABORATION_PORT

echo "🔧 Environment: $NODE_ENV"
echo "🌐 WebSocket URL: ws://localhost:$COLLABORATION_PORT"

# Start the collaboration server
echo "✅ Starting collaboration server..."
echo "   Press Ctrl+C to stop the server"
echo ""

# Run the collaboration server
npx tsx src/lib/collaboration-server.ts

echo ""
echo "👋 Collaboration server stopped."
