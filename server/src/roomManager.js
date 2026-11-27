import { GameRoom } from './gameRoom.js';
import { roomStore } from './store.js';

/**
 * Generates a random 6-character room code (e.g. "TP8X2A")
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous I, 1, O, 0
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> GameRoom
    this.playerToRoom = new Map(); // playerId -> roomId
  }

  createRoom(name, isPrivate = false, config = {}) {
    let roomId = generateRoomCode();
    while (this.rooms.has(roomId)) {
      roomId = generateRoomCode();
    }

    const room = new GameRoom(roomId, name, isPrivate, config);
    room.setBroadcastCallback((rId, eventName, state) => {
      this.broadcastRoom(rId, eventName);
    });

    this.rooms.set(roomId, room);
    roomStore.setRoom(roomId, { id: roomId, name: room.name, isPrivate });
    return room;
  }

  getRoom(roomId) {
    if (!roomId) return null;
    return this.rooms.get(roomId.toUpperCase()) || null;
  }

  getPublicRooms() {
    const list = [];
    for (const room of this.rooms.values()) {
      if (!room.isPrivate) {
        list.push({
          id: room.id,
          name: room.name,
          playerCount: room.players.length,
          maxPlayers: room.config.maxPlayers,
          bootAmount: room.config.bootAmount,
          roundState: room.roundState
        });
      }
    }
    return list;
  }

  joinRoom(roomId, player) {
    const room = this.getRoom(roomId);
    if (!room) {
      return { success: false, reason: 'Room not found' };
    }

    // Check if player is reconnecting
    const existingPlayer = room.getPlayer(player.id);
    if (existingPlayer) {
      room.handleReconnect(player.id, player.socketId);
      this.playerToRoom.set(player.id, room.id);
      return { success: true, room, isReconnect: true, player: existingPlayer };
    }

    const res = room.addPlayer(player);
    if (res.success) {
      this.playerToRoom.set(player.id, room.id);
      return { success: true, room, isReconnect: false, player: res.player };
    }
    return res;
  }

  leaveRoom(playerId) {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return null;

    const room = this.getRoom(roomId);
    if (!room) {
      this.playerToRoom.delete(playerId);
      return null;
    }

    const removedPlayer = room.removePlayer(playerId);
    this.playerToRoom.delete(playerId);

    if (room.players.length === 0) {
      room.clearTimers();
      this.rooms.delete(room.id);
      roomStore.deleteRoom(room.id);
    } else {
      this.broadcastRoom(room.id, 'game:state');
    }

    return { room, removedPlayer };
  }

  broadcastRoom(roomId, eventName = 'game:state') {
    const room = this.getRoom(roomId);
    if (!room) return;

    // Send individualized state to each player in the room
    for (const player of room.players) {
      if (player.socketId) {
        const personalState = room.getPublicState(player.id);
        this.io.to(player.socketId).emit(eventName, personalState);
      }
    }
  }
}
