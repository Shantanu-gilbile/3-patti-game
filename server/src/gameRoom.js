import crypto from 'node:crypto';
import { createDeck, evaluateHand, compareHands, determineWinners } from '../../shared/handEvaluator.js';
import { DEFAULT_CONFIG, getValidBetRange, calculateNewStake } from '../../shared/bettingRules.js';

/**
 * Cryptographically secure Fisher-Yates deck shuffle using crypto.randomInt
 */
export function secureShuffleDeck() {
  const deck = createDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Teen Patti Room Class
 */
export class GameRoom {
  constructor(id, name, isPrivate = false, config = {}) {
    this.id = id;
    this.name = name || `Table #${id}`;
    this.isPrivate = isPrivate;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.hostId = null;
    this.players = []; // Array of Player objects seated in order (seatIndex 0 to maxPlayers-1)
    
    // Game round states: 'WAITING', 'STARTING', 'PLAYING', 'SHOWDOWN'
    this.roundState = 'WAITING';
    this.dealerIndex = 0;
    this.currentTurnIndex = -1;
    this.currentStake = this.config.bootAmount;
    this.pot = 0;
    this.roundNumber = 0;
    this.lastAction = null;
    this.sideShowRequest = null; // { fromId, toId, timeout }

    // Timers
    this.turnTimer = null;
    this.turnTimeRemaining = 0;
    this.turnInterval = null;
    this.nextRoundTimer = null;
    this.disconnectTimers = new Map(); // playerId -> timer
    this.broadcastCallback = null;
  }

  setBroadcastCallback(fn) {
    this.broadcastCallback = fn;
  }

  emitState(eventName = 'game:state') {
    if (this.broadcastCallback) {
      this.broadcastCallback(this.id, eventName, this.getPublicState());
    }
  }

  addPlayer(player) {
    if (this.players.length >= this.config.maxPlayers) {
      return { success: false, reason: 'Room is full' };
    }

    // Determine seat index
    const occupiedSeats = new Set(this.players.map(p => p.seatIndex));
    let seatIndex = 0;
    while (occupiedSeats.has(seatIndex) && seatIndex < this.config.maxPlayers) {
      seatIndex++;
    }

    const newPlayer = {
      id: player.id,
      name: player.name,
      avatar: player.avatar || '🃏',
      chips: Math.max(player.chips ?? this.config.startingChips, this.config.bootAmount),
      seatIndex,
      isReady: false,
      isConnected: true,
      socketId: player.socketId,
      // Round-specific properties
      cards: [],
      isBlind: true,
      hasSeenCards: false,
      isPacked: false,
      blindTurnCount: 0,
      currentBet: 0,
      totalBetInRound: 0,
      isWinner: false
    };

    if (this.players.length === 0) {
      this.hostId = newPlayer.id;
    }

    this.players.push(newPlayer);
    this.players.sort((a, b) => a.seatIndex - b.seatIndex);
    return { success: true, player: newPlayer };
  }

  removePlayer(playerId) {
    const idx = this.players.findIndex(p => p.id === playerId);
    if (idx === -1) return null;

    const removed = this.players.splice(idx, 1)[0];

    // Clear any disconnect timer
    if (this.disconnectTimers.has(playerId)) {
      clearTimeout(this.disconnectTimers.get(playerId));
      this.disconnectTimers.delete(playerId);
    }

    // If host leaves, assign to next player
    if (this.hostId === playerId && this.players.length > 0) {
      this.hostId = this.players[0].id;
    }

    // If active player left during game
    if (this.roundState === 'PLAYING') {
      this.checkRoundEnd();
      if (this.roundState === 'PLAYING' && this.players[this.currentTurnIndex]?.id === playerId) {
        this.nextTurn();
      }
    } else if (this.players.length < this.config.minPlayers) {
      this.roundState = 'WAITING';
      this.clearTimers();
    }

    return removed;
  }

  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId) || null;
  }

  handleDisconnect(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return;

    player.isConnected = false;

    // In a round, hold seat for reconnectHoldSeconds
    if (this.disconnectTimers.has(playerId)) {
      clearTimeout(this.disconnectTimers.get(playerId));
    }

    const timer = setTimeout(() => {
      // If still disconnected after timeout, remove player
      const p = this.getPlayer(playerId);
      if (p && !p.isConnected) {
        this.removePlayer(playerId);
        this.emitState('room:player_left');
      }
    }, this.config.reconnectHoldSeconds * 1000);

    this.disconnectTimers.set(playerId, timer);
  }

  handleReconnect(playerId, newSocketId) {
    const player = this.getPlayer(playerId);
    if (!player) return false;

    player.isConnected = true;
    player.socketId = newSocketId;

    if (this.disconnectTimers.has(playerId)) {
      clearTimeout(this.disconnectTimers.get(playerId));
      this.disconnectTimers.delete(playerId);
    }
    return true;
  }

  toggleReady(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || this.roundState === 'PLAYING') return false;

    player.isReady = !player.isReady;

    // Auto-start if all ready and at least min players
    const allReady = this.players.length >= this.config.minPlayers && this.players.every(p => p.isReady);
    if (allReady && this.roundState === 'WAITING') {
      this.startRound();
    }

    return true;
  }

  startRound() {
    if (this.players.length < this.config.minPlayers) return false;
    
    // Eligible players with enough chips for boot
    const eligiblePlayers = this.players.filter(p => p.chips >= this.config.bootAmount && p.isConnected);
    if (eligiblePlayers.length < this.config.minPlayers) {
      this.roundState = 'WAITING';
      return false;
    }

    this.clearTimers();
    this.roundState = 'PLAYING';
    this.roundNumber += 1;
    this.pot = 0;
    this.currentStake = this.config.bootAmount;
    this.sideShowRequest = null;

    // Rotate dealer
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

    // Reset round state for players
    const deck = secureShuffleDeck();

    this.players.forEach(p => {
      p.isWinner = false;
      if (p.chips >= this.config.bootAmount && p.isConnected) {
        p.isPacked = false;
        p.hasSeenCards = false;
        p.isBlind = true;
        p.blindTurnCount = 0;
        p.chips -= this.config.bootAmount;
        p.currentBet = this.config.bootAmount;
        p.totalBetInRound = this.config.bootAmount;
        this.pot += this.config.bootAmount;
        // Deal 3 cards
        p.cards = [deck.pop(), deck.pop(), deck.pop()];
      } else {
        p.isPacked = true;
        p.cards = [];
      }
    });

    // Determine first turn: First active player next to dealer
    let firstTurn = (this.dealerIndex + 1) % this.players.length;
    while (this.players[firstTurn].isPacked) {
      firstTurn = (firstTurn + 1) % this.players.length;
    }
    this.currentTurnIndex = firstTurn;

    this.lastAction = {
      type: 'BOOT',
      amount: this.config.bootAmount,
      message: `Round ${this.roundNumber} started! Boot of ${this.config.bootAmount} collected.`
    };

    this.startTurnTimer();
    return true;
  }

  startTurnTimer() {
    this.clearTurnTimer();
    this.turnTimeRemaining = this.config.turnTimeoutSeconds;

    this.turnInterval = setInterval(() => {
      this.turnTimeRemaining -= 1;
      if (this.turnTimeRemaining <= 0) {
        this.handleAutoPack();
      }
    }, 1000);
  }

  clearTurnTimer() {
    if (this.turnInterval) {
      clearInterval(this.turnInterval);
      this.turnInterval = null;
    }
  }

  clearTimers() {
    this.clearTurnTimer();
    if (this.nextRoundTimer) {
      clearTimeout(this.nextRoundTimer);
      this.nextRoundTimer = null;
    }
  }

  handleAutoPack() {
    const curPlayer = this.players[this.currentTurnIndex];
    if (curPlayer && !curPlayer.isPacked && this.roundState === 'PLAYING') {
      this.playerPack(curPlayer.id, true);
    }
  }

  // Action: See Cards
  playerSeeCards(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || player.isPacked || player.hasSeenCards) return false;

    player.hasSeenCards = true;
    player.isBlind = false;
    this.lastAction = {
      playerId,
      type: 'SEE_CARDS',
      message: `${player.name} saw their cards.`
    };
    return true;
  }

  // Action: Chaal or Raise
  playerBet(playerId, amount) {
    if (this.roundState !== 'PLAYING') return { success: false, reason: 'Game not active' };
    const curPlayer = this.players[this.currentTurnIndex];
    if (!curPlayer || curPlayer.id !== playerId) return { success: false, reason: 'Not your turn' };

    const isBlind = curPlayer.isBlind;
    const { minBet, maxBet, canAffordMin } = getValidBetRange(
      isBlind,
      this.currentStake,
      this.config.potLimit,
      this.pot,
      curPlayer.chips
    );

    if (!canAffordMin) {
      return { success: false, reason: 'Insufficient chips' };
    }

    if (amount < minBet || amount > maxBet) {
      return { success: false, reason: `Bet must be between ${minBet} and ${maxBet}` };
    }

    // Check blind turns limit
    if (isBlind) {
      curPlayer.blindTurnCount += 1;
      if (curPlayer.blindTurnCount >= this.config.maxBlindCount) {
        // Player must see cards next round or auto-seen
        curPlayer.hasSeenCards = true;
        curPlayer.isBlind = false;
      }
    }

    // Deduct chips and add to pot
    curPlayer.chips -= amount;
    curPlayer.currentBet = amount;
    curPlayer.totalBetInRound += amount;
    this.pot += amount;

    // Update currentStake
    this.currentStake = calculateNewStake(amount, isBlind);

    const isRaise = amount > minBet;
    this.lastAction = {
      playerId,
      type: isRaise ? 'RAISE' : 'CHAAL',
      amount,
      message: `${curPlayer.name} ${isRaise ? 'raised' : 'chaaled'} ${amount} chips.`
    };

    // Check pot limit
    if (this.pot >= this.config.potLimit) {
      this.performShowdown();
      return { success: true };
    }

    this.nextTurn();
    return { success: true };
  }

  // Action: Pack (Fold)
  playerPack(playerId, isAuto = false) {
    if (this.roundState !== 'PLAYING') return false;
    const player = this.getPlayer(playerId);
    if (!player || player.isPacked) return false;

    player.isPacked = true;
    this.lastAction = {
      playerId,
      type: 'PACK',
      message: `${player.name} packed (folded)${isAuto ? ' [Timeout]' : ''}.`
    };

    if (this.checkRoundEnd()) {
      return true;
    }

    if (this.players[this.currentTurnIndex]?.id === playerId) {
      this.nextTurn();
    }
    return true;
  }

  // Action: Show
  playerShow(playerId) {
    if (this.roundState !== 'PLAYING') return { success: false, reason: 'Game not active' };
    const curPlayer = this.players[this.currentTurnIndex];
    if (!curPlayer || curPlayer.id !== playerId) return { success: false, reason: 'Not your turn' };

    const activePlayers = this.getActivePlayers();
    if (activePlayers.length !== 2) {
      return { success: false, reason: 'Show can only be called when exactly 2 players remain' };
    }

    // Required show bet:
    // If blind, pays stake; if seen, pays 2 * stake
    const requiredCost = curPlayer.isBlind ? this.currentStake : this.currentStake * 2;
    if (curPlayer.chips < requiredCost) {
      return { success: false, reason: 'Not enough chips to pay for Show' };
    }

    curPlayer.chips -= requiredCost;
    curPlayer.totalBetInRound += requiredCost;
    this.pot += requiredCost;

    this.lastAction = {
      playerId,
      type: 'SHOW',
      amount: requiredCost,
      message: `${curPlayer.name} called for SHOW!`
    };

    this.performShowdown();
    return { success: true };
  }

  // Side Show Request
  requestSideShow(playerId) {
    if (this.roundState !== 'PLAYING') return { success: false, reason: 'Game not active' };
    const curPlayer = this.players[this.currentTurnIndex];
    if (!curPlayer || curPlayer.id !== playerId) return { success: false, reason: 'Not your turn' };
    if (curPlayer.isBlind) return { success: false, reason: 'Blind players cannot request side show' };

    // Previous active player must also be SEEN
    const prevPlayer = this.getPreviousActivePlayer();
    if (!prevPlayer || prevPlayer.isBlind) {
      return { success: false, reason: 'Previous player is either blind or unavailable' };
    }

    // Side show requires betting current stake (seen chaal)
    const cost = this.currentStake * 2;
    if (curPlayer.chips < cost) {
      return { success: false, reason: 'Not enough chips for side show' };
    }

    curPlayer.chips -= cost;
    curPlayer.totalBetInRound += cost;
    this.pot += cost;

    this.sideShowRequest = {
      fromPlayerId: curPlayer.id,
      toPlayerId: prevPlayer.id
    };

    this.lastAction = {
      playerId,
      type: 'SIDESHOW_REQUEST',
      targetId: prevPlayer.id,
      message: `${curPlayer.name} requested a Side Show from ${prevPlayer.name}!`
    };

    return { success: true, toPlayerId: prevPlayer.id };
  }

  respondSideShow(targetPlayerId, accepted) {
    if (!this.sideShowRequest || this.sideShowRequest.toPlayerId !== targetPlayerId) {
      return { success: false, reason: 'No active side show request for you' };
    }

    const fromPlayer = this.getPlayer(this.sideShowRequest.fromPlayerId);
    const toPlayer = this.getPlayer(targetPlayerId);

    if (!fromPlayer || !toPlayer) return { success: false };

    if (!accepted) {
      this.lastAction = {
        type: 'SIDESHOW_DENIED',
        message: `${toPlayer.name} declined the Side Show.`
      };
      this.sideShowRequest = null;
      this.nextTurn();
      return { success: true, accepted: false };
    }

    // Accepted: Compare hands privately
    const cmp = compareHands(fromPlayer.cards, toPlayer.cards);
    let loser = null;
    let winner = null;
    if (cmp < 0) {
      loser = fromPlayer;
      winner = toPlayer;
    } else {
      // If fromPlayer wins or ties, the requester wins and target loses
      loser = toPlayer;
      winner = fromPlayer;
    }

    loser.isPacked = true;
    this.lastAction = {
      type: 'SIDESHOW_RESULT',
      message: `${toPlayer.name} accepted Side Show. ${loser.name}'s cards were weaker and they were packed!`
    };

    this.sideShowRequest = null;
    if (this.checkRoundEnd()) {
      return { success: true, accepted: true, loserId: loser.id };
    }

    this.nextTurn();
    return { success: true, accepted: true, loserId: loser.id };
  }

  getActivePlayers() {
    return this.players.filter(p => !p.isPacked && p.isConnected);
  }

  getPreviousActivePlayer() {
    let idx = (this.currentTurnIndex - 1 + this.players.length) % this.players.length;
    while (idx !== this.currentTurnIndex) {
      if (!this.players[idx].isPacked && this.players[idx].isConnected) {
        return this.players[idx];
      }
      idx = (idx - 1 + this.players.length) % this.players.length;
    }
    return null;
  }

  nextTurn() {
    this.clearTurnTimer();
    const active = this.getActivePlayers();
    if (active.length <= 1) {
      this.checkRoundEnd();
      return;
    }

    let nextIdx = (this.currentTurnIndex + 1) % this.players.length;
    while (this.players[nextIdx].isPacked || !this.players[nextIdx].isConnected) {
      nextIdx = (nextIdx + 1) % this.players.length;
    }

    this.currentTurnIndex = nextIdx;
    this.startTurnTimer();
    this.emitState('game:state');
  }

  checkRoundEnd() {
    const active = this.getActivePlayers();
    if (active.length === 1) {
      // Single survivor wins pot immediately without showing
      const winner = active[0];
      winner.chips += this.pot;
      winner.isWinner = true;
      this.roundState = 'SHOWDOWN';
      this.clearTurnTimer();

      this.lastAction = {
        playerId: winner.id,
        type: 'WINNER',
        amount: this.pot,
        message: `${winner.name} wins the pot of ${this.pot} chips!`
      };

      this.scheduleNextRound();
      this.emitState('game:round_ended');
      return true;
    }
    return false;
  }

  performShowdown() {
    this.clearTurnTimer();
    this.roundState = 'SHOWDOWN';

    const active = this.getActivePlayers();
    const candidates = active.map(p => ({ playerId: p.id, cards: p.cards }));
    const winners = determineWinners(candidates);

    const share = Math.floor(this.pot / winners.length);
    winners.forEach(wId => {
      const p = this.getPlayer(wId);
      if (p) {
        p.chips += share;
        p.isWinner = true;
      }
    });

    const winnerNames = winners.map(wId => this.getPlayer(wId)?.name).join(' & ');
    this.lastAction = {
      winners,
      type: 'SHOWDOWN_WINNER',
      amount: share,
      message: `${winnerNames} won ${this.pot} chips at Showdown!`
    };

    this.scheduleNextRound();
    this.emitState('game:round_ended');
  }

  scheduleNextRound() {
    if (this.nextRoundTimer) clearTimeout(this.nextRoundTimer);
    this.nextRoundTimer = setTimeout(() => {
      // Auto-start next round if >= 2 players have sufficient chips
      const eligible = this.players.filter(p => p.chips >= this.config.bootAmount && p.isConnected);
      if (eligible.length >= this.config.minPlayers) {
        this.startRound();
        this.emitState('game:round_started');
      } else {
        this.roundState = 'WAITING';
        this.emitState('game:state');
      }
    }, this.config.showdownDelaySeconds * 1000);
  }

  /**
   * Sanitized public state sent to clients.
   * Server-authoritative anti-cheat:
   * Client cards of others are never revealed unless it is SHOWDOWN.
   */
  getPublicState(forPlayerId = null) {
    const activePlayers = this.getActivePlayers();
    const isTwoPlayersRemaining = activePlayers.length === 2;

    return {
      roomId: this.id,
      roomName: this.name,
      isPrivate: this.isPrivate,
      roundState: this.roundState,
      roundNumber: this.roundNumber,
      pot: this.pot,
      currentStake: this.currentStake,
      dealerIndex: this.dealerIndex,
      currentTurnPlayerId: this.players[this.currentTurnIndex]?.id || null,
      currentTurnIndex: this.currentTurnIndex,
      turnTimeRemaining: this.turnTimeRemaining,
      hostId: this.hostId,
      lastAction: this.lastAction,
      sideShowRequest: this.sideShowRequest,
      canShow: isTwoPlayersRemaining && this.roundState === 'PLAYING',
      config: {
        bootAmount: this.config.bootAmount,
        potLimit: this.config.potLimit,
        maxBlindCount: this.config.maxBlindCount,
        turnTimeoutSeconds: this.config.turnTimeoutSeconds,
        showdownDelaySeconds: this.config.showdownDelaySeconds
      },
      players: this.players.map(p => {
        const isSelf = p.id === forPlayerId;
        const revealCards = (this.roundState === 'SHOWDOWN' && !p.isPacked) || (isSelf && p.hasSeenCards);

        let handEvaluation = null;
        if (revealCards && p.cards.length === 3) {
          try {
            handEvaluation = evaluateHand(p.cards);
          } catch (e) {
            // ignore
          }
        }

        return {
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          chips: p.chips,
          seatIndex: p.seatIndex,
          isReady: p.isReady,
          isConnected: p.isConnected,
          isHost: p.id === this.hostId,
          isBlind: p.isBlind,
          hasSeenCards: p.hasSeenCards,
          isPacked: p.isPacked,
          isWinner: p.isWinner,
          currentBet: p.currentBet,
          totalBetInRound: p.totalBetInRound,
          cardCount: p.cards.length,
          // Only send real cards if allowed, otherwise send masked placeholder
          cards: revealCards ? p.cards : (p.cards.length > 0 ? ['?', '?', '?'] : []),
          handEvaluation
        };
      })
    };
  }
}
