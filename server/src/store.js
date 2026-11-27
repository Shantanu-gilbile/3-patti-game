/**
 * State store interface (In-memory default, structured for pluggable Redis/KeyDB adapter)
 */

export class MemoryStore {
  constructor() {
    this.rooms = new Map();
    this.players = new Map(); // socketId or od -> player info
  }

  async getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  async setRoom(roomId, roomData) {
    this.rooms.set(roomId, roomData);
    return roomData;
  }

  async deleteRoom(roomId) {
    return this.rooms.delete(roomId);
  }

  async getAllRooms() {
    return Array.from(this.rooms.values());
  }

  async getPlayer(playerId) {
    return this.players.get(playerId) || null;
  }

  async setPlayer(playerId, playerData) {
    this.players.set(playerId, playerData);
    return playerData;
  }

  async deletePlayer(playerId) {
    return this.players.delete(playerId);
  }
}

// Export singleton instance
export const roomStore = new MemoryStore();
