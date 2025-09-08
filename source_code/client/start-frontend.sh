#!/bin/bash
# Frontend startup script for VPS deployment

echo "🚀 Starting Rock Paper Scissors Frontend..."
echo "🌍 Server IP: 62.72.35.202"
echo "🔌 Frontend will be accessible at: http://62.72.35.202:3000"

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  npm install
fi

# Start the frontend server
echo "🎮 Starting frontend development server..."
npm start