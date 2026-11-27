import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RoomManager } from './roomManager.js';
import { registerSocketHandlers } from './socketHandlers.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || '*';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const roomManager = new RoomManager(io);
registerSocketHandlers(io, roomManager);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rooms: roomManager.rooms.size,
    service: 'Teen Patti Realtime Server'
  });
});

// API endpoint to get active public rooms
app.get('/api/rooms', (req, res) => {
  res.json(roomManager.getPublicRooms());
});

// Serve frontend build if deployed together
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Teen Patti API Server Running. (Client build not present in root yet)');
    }
  });
});

server.listen(PORT, () => {
  console.log(`♠️ ♥️ ♦️ ♣️ Teen Patti Server listening on port ${PORT}`);
});
