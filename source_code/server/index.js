const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const roomHandler = require("./roomHandler");
const authRoutes = require("./auth");
const db = require("./db");

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  },
});

const rooms = [];

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

io.on("connection", (socket) => {
  console.log("connected", socket.id);
  roomHandler(io, socket, rooms);

  socket.on("disconnect", () => {
    console.log("disconnected", socket.id);
  });
});

const port = process.env.PORT || 3003;
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${port}`);
  console.log(`🌍 Accessible externally at http://62.72.35.202:${port}`);
  console.log(`🔧 Health check endpoint: http://62.72.35.202:${port}/api/health`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use. Please stop the existing process or use a different port.`);
  } else {
    console.error(`❌ Server failed to start: ${err.message}`);
  }
  process.exit(1);
});
