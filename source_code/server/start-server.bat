@echo off
REM Backend server startup script for Windows

echo 🚀 Starting Rock Paper Scissors Backend Server...
echo 🌍 Server IP: 62.72.35.202
echo 🔌 Server will be accessible at: http://62.72.35.202:3003

REM Install dependencies if not already installed
if not exist "node_modules" (
  echo 📦 Installing server dependencies...
  npm install
)

REM Start the server
echo 🎮 Starting backend server...
npm start