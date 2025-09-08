#!/bin/bash
# Backend server startup script for VPS deployment

echo "🚀 Starting Rock Paper Scissors Backend Server..."
echo "🌍 Server IP: 62.72.35.202"
echo "🔌 Server will be accessible at: http://62.72.35.202:3003"

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing server dependencies..."
  npm install
fi

# Start the server
echo "🎮 Starting backend server..."
npm start