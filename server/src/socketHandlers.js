import { roomStore } from './store.js';

/**
 * Rate Limiter for Socket events to prevent spam / DoS
 */
export class RateLimiter {
  constructor(maxPerWindow = 10, windowMs = 1000) {
    this.maxPerWindow = maxPerWindow;
    this.windowMs = windowMs;
    this.clients = new Map(); // socketId -> { count, startTime }
  }

  isAllowed(socketId) {
    const now = Date.now();
    const client = this.clients.get(socketId) || { count: 0, startTime: now };

    if (now - client.startTime > this.windowMs) {
      client.count = 1;
      client.startTime = now;
      this.clients.set(socketId, client);
      return true;
    }

    client.count += 1;
    this.clients.set(socketId, client);
    return client.count <= this.maxPerWindow;
  }

  remove(socketId) {
    this.clients.delete(socketId);
  }
}

export function registerSocketHandlers(io, roomManager) {
  const rateLimiter = new RateLimiter(15, 1000); // 15 events per sec max

  io.on('connection', (socket) => {
    // Basic anti-spam middleware per socket event
    socket.use(([event, ...args], next) => {
      if (!rateLimiter.isAllowed(socket.id)) {
        return next(new Error('Rate limit exceeded. Please slow down.'));
      }
      next();
    });

    socket.on('error', (err) => {
      socket.emit('game:error', { message: err.message });
    });

    // 1. Lobby: List public rooms
    socket.on('lobby:get_rooms', () => {
      socket.emit('lobby:room_list', roomManager.getPublicRooms());
    });

    // 2. Lobby: Create Room
    socket.on('room:create', ({ name, isPrivate, config, player }) => {
      try {
        if (!player || !player.id || !player.name) {
          return socket.emit('game:error', { message: 'Invalid player profile' });
        }

        const room = roomManager.createRoom(name, !!isPrivate, config);
        const joinRes = roomManager.joinRoom(room.id, {
          ...player,
          socketId: socket.id
        });

        socket.join(room.id);
        socket.emit('room:created', { roomId: room.id });
        roomManager.broadcastRoom(room.id, 'game:state');
        io.emit('lobby:room_list', roomManager.getPublicRooms());
      } catch (err) {
        socket.emit('game:error', { message: err.message });
      }
    });

    // 3. Lobby: Join Room
    socket.on('room:join', ({ roomId, player }) => {
      try {
        if (!roomId || !player || !player.id) {
          return socket.emit('game:error', { message: 'Room ID and player profile required' });
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          return socket.emit('game:error', { message: 'Room not found or expired' });
        }

        const joinRes = roomManager.joinRoom(roomId, {
          ...player,
          socketId: socket.id
        });

        if (!joinRes.success) {
          return socket.emit('game:error', { message: joinRes.reason || 'Failed to join room' });
        }

        socket.join(room.id);
        socket.emit('room:joined', { roomId: room.id, isReconnect: joinRes.isReconnect });
        roomManager.broadcastRoom(room.id, 'game:state');
        io.emit('lobby:room_list', roomManager.getPublicRooms());
      } catch (err) {
        socket.emit('game:error', { message: err.message });
      }
    });

    // 4. Ready / Start Game
    socket.on('game:ready', ({ roomId, playerId }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const ok = room.toggleReady(playerId);
      if (ok) {
        roomManager.broadcastRoom(room.id, 'game:state');
      }
    });

    socket.on('game:start', ({ roomId, playerId }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      if (room.hostId !== playerId) {
        return socket.emit('game:error', { message: 'Only the host can start the game' });
      }

      const started = room.startRound();
      if (!started) {
        return socket.emit('game:error', { message: 'Cannot start game. Need at least 2 players with enough chips.' });
      }
      roomManager.broadcastRoom(room.id, 'game:state');
    });

    socket.on('room:kick', ({ roomId, hostId, targetPlayerId }) => {
      const room = roomManager.getRoom(roomId);
      if (!room || room.hostId !== hostId) return;

      const target = room.getPlayer(targetPlayerId);
      if (target && target.socketId) {
        io.to(target.socketId).emit('room:kicked', { message: 'You have been kicked by the host.' });
      }
      room.removePlayer(targetPlayerId);
      roomManager.playerToRoom.delete(targetPlayerId);
      roomManager.broadcastRoom(room.id, 'game:state');
    });

    // 5. In-Game Player Actions
    socket.on('action:see_cards', ({ roomId, playerId }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const ok = room.playerSeeCards(playerId);
      if (ok) {
        roomManager.broadcastRoom(room.id, 'game:state');
      }
    });

    socket.on('action:bet', ({ roomId, playerId, amount }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const res = room.playerBet(playerId, Number(amount));
      if (!res.success) {
        return socket.emit('game:error', { message: res.reason });
      }
      roomManager.broadcastRoom(room.id, 'game:state');
    });

    socket.on('action:pack', ({ roomId, playerId }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const ok = room.playerPack(playerId, false);
      if (ok) {
        roomManager.broadcastRoom(room.id, 'game:state');
      }
    });

    socket.on('action:show', ({ roomId, playerId }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const res = room.playerShow(playerId);
      if (!res.success) {
        return socket.emit('game:error', { message: res.reason });
      }
      roomManager.broadcastRoom(room.id, 'game:state');
    });

    socket.on('action:side_show_request', ({ roomId, playerId }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const res = room.requestSideShow(playerId);
      if (!res.success) {
        return socket.emit('game:error', { message: res.reason });
      }
      roomManager.broadcastRoom(room.id, 'game:state');
    });

    socket.on('action:side_show_response', ({ roomId, playerId, accepted }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const res = room.respondSideShow(playerId, !!accepted);
      if (!res.success) {
        return socket.emit('game:error', { message: res.reason });
      }
      roomManager.broadcastRoom(room.id, 'game:state');
    });

    // 6. Chat and Quick Reactions
    socket.on('chat:send', ({ roomId, sender, message }) => {
      if (!roomId || !message || !message.trim()) return;
      const sanitized = message.trim().slice(0, 150);
      io.to(roomId).emit('chat:message', {
        id: Math.random().toString(36).substring(2, 9),
        sender,
        message: sanitized,
        timestamp: Date.now()
      });
    });

    socket.on('chat:reaction', ({ roomId, playerId, emoji }) => {
      if (!roomId || !emoji) return;
      io.to(roomId).emit('chat:reaction', {
        playerId,
        emoji,
        timestamp: Date.now()
      });
    });

    // 7. Reconnect / Refresh state
    socket.on('room:get_state', ({ roomId, playerId }) => {
      const room = roomManager.getRoom(roomId);
      if (room) {
        socket.emit('game:state', room.getPublicState(playerId));
      }
    });

    // 8. Leave room
    socket.on('room:leave', ({ playerId }) => {
      const res = roomManager.leaveRoom(playerId);
      if (res && res.room) {
        socket.leave(res.room.id);
        io.emit('lobby:room_list', roomManager.getPublicRooms());
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      rateLimiter.remove(socket.id);
      // Find room where socket was connected
      for (const room of roomManager.rooms.values()) {
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          room.handleDisconnect(player.id);
          roomManager.broadcastRoom(room.id, 'game:state');
          break;
        }
      }
    });
  });
}
