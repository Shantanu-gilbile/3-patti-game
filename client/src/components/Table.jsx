import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Seat } from './Seat';
import { ActionBar } from './ActionBar';
import { ChatBox } from './ChatBox';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  Share2,
  MessageSquare,
  LogOut,
  Play,
  CheckCircle,
  HelpCircle,
  Coins
} from 'lucide-react';
import { sounds } from '../utils/audio';

export const Table = ({ onLeaveRoom }) => {
  const {
    gameState,
    user,
    socket,
    chatMessages,
    reactions,
    errorMessage,
    muted,
    toggleSound
  } = useGame();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showHandRanksModal, setShowHandRanksModal] = useState(false);

  // Trigger confetti when self wins
  useEffect(() => {
    if (gameState?.roundState === 'SHOWDOWN') {
      const selfWon = gameState.players.some(p => p.id === user.id && p.isWinner);
      if (selfWon) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  }, [gameState?.roundState]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p>Connecting to game table...</p>
      </div>
    );
  }

  // Find self player
  const selfPlayer = gameState.players.find(p => p.id === user.id);
  const isHost = gameState.hostId === user.id;

  // Re-orient seats so self is always at seat 0 (bottom)
  const totalSeats = gameState.config.maxPlayers || 6;
  const selfSeatIndex = selfPlayer ? selfPlayer.seatIndex : 0;

  const orientedPlayers = gameState.players.map(p => {
    // Relative position offset from self
    const relativeIndex = (p.seatIndex - selfSeatIndex + totalSeats) % totalSeats;
    return {
      ...p,
      relativeIndex
    };
  });

  const handleAction = (event, data = {}) => {
    socket.emit(event, {
      roomId: gameState.roomId,
      playerId: user.id,
      ...data
    });
  };

  const handleShareLink = () => {
    const url = `${window.location.origin}?room=${gameState.roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSideShowResponse = (accepted) => {
    socket.emit('action:side_show_response', {
      roomId: gameState.roomId,
      playerId: user.id,
      accepted
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between overflow-hidden relative select-none">
      {/* Top Header Bar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/80 px-2.5 py-1.5 rounded-xl border border-rose-900/50 transition active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" /> Leave
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{gameState.roomName}</span>
              <span className="text-[10px] bg-slate-800 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">
                Code: {gameState.roomId}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Boot: 🪙{gameState.config.bootAmount} • Pot Limit: 🪙{gameState.config.potLimit.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-2">
          {/* Rules / Hand rankings guide button */}
          <button
            onClick={() => setShowHandRanksModal(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Hand Rankings"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Share Room Button */}
          <button
            onClick={handleShareLink}
            className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-2 rounded-xl border border-slate-700 transition active:scale-95"
            title="Copy Invite Link"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 relative transition"
          >
            <MessageSquare className="w-4 h-4" />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
            )}
          </button>
        </div>
      </header>

      {/* Error Toast */}
      {errorMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-rose-900/90 text-rose-100 border border-rose-500 text-xs px-4 py-2 rounded-xl shadow-2xl z-50 animate-bounce">
          {errorMessage}
        </div>
      )}

      {/* Side Show Request Modal for Target Player */}
      {gameState.sideShowRequest && gameState.sideShowRequest.toPlayerId === user.id && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-5 max-w-sm w-full text-center shadow-2xl">
            <h4 className="text-base font-bold text-amber-400 mb-2">Side Show Requested!</h4>
            <p className="text-xs text-slate-300 mb-4">
              Another player has asked to compare cards with you. The one with the lower hand will be packed!
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleSideShowResponse(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-bold"
              >
                Decline
              </button>
              <button
                onClick={() => handleSideShowResponse(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs rounded-xl font-bold"
              >
                Accept Side Show
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Middle Game Area (Oval Poker Table) */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-6 relative">
        <div className="w-full max-w-4xl aspect-[16/10] sm:aspect-[16/9] max-h-[72vh] rounded-[100px] sm:rounded-[180px] bg-gradient-to-b from-[#195b32] via-[#0f3d20] to-[#0a2c16] border-[10px] sm:border-[16px] border-[#2c180e] shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.9)] relative flex items-center justify-center">
          {/* Subtle table felt inner pattern */}
          <div className="absolute inset-4 rounded-[80px] sm:rounded-[160px] border border-amber-400/20 pointer-events-none opacity-40" />

          {/* Center: Table Pot, Stake & Info */}
          <div className="flex flex-col items-center justify-center z-10 text-center">
            {/* Round Status Badge */}
            <span className="text-[10px] sm:text-xs font-cinzel tracking-widest uppercase text-amber-300/80 mb-1">
              {gameState.roundState === 'WAITING'
                ? 'WAITING TO START'
                : gameState.roundState === 'SHOWDOWN'
                ? 'SHOWDOWN'
                : `ROUND ${gameState.roundNumber}`}
            </span>

            {/* Central Pot Display */}
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-500/40 shadow-xl flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <span className="text-[10px] text-slate-400 block -mb-0.5">TOTAL POT</span>
                <span className="text-base sm:text-xl font-black text-amber-400 font-cinzel">
                  🪙 {gameState.pot.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Current Stake info */}
            <div className="mt-2 text-[11px] text-slate-300/90 font-medium bg-black/40 px-3 py-0.5 rounded-full border border-white/10">
              Current Stake: <span className="text-amber-400 font-bold">🪙 {gameState.currentStake}</span>
            </div>

            {/* Last Action Broadcast Toast */}
            {gameState.lastAction && (
              <div className="mt-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1 rounded-full text-[11px] text-slate-200 max-w-[260px] truncate shadow">
                {gameState.lastAction.message}
              </div>
            )}

            {/* Host / Ready Controls if Waiting */}
            {gameState.roundState === 'WAITING' && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  onClick={() => handleAction('game:ready')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    selfPlayer?.isReady
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {selfPlayer?.isReady ? 'Ready!' : 'Ready Up'}
                </button>

                {isHost && (
                  <button
                    onClick={() => handleAction('game:start')}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg flex items-center gap-1.5 hover:from-amber-400 hover:to-yellow-400 transition"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Round (Host)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Render Player Seats */}
          {orientedPlayers.map((player) => {
            const playerReaction = reactions.find(r => r.playerId === player.id);
            return (
              <Seat
                key={player.id}
                player={player}
                isCurrentTurn={gameState.currentTurnPlayerId === player.id}
                turnTimeRemaining={gameState.turnTimeRemaining}
                isDealer={gameState.players[gameState.dealerIndex]?.id === player.id}
                positionIndex={player.relativeIndex}
                isSelf={player.id === user.id}
                reaction={playerReaction}
              />
            );
          })}
        </div>
      </main>

      {/* Bottom Floating Action Bar */}
      <footer className="p-3 sm:p-4 z-30">
        <ActionBar
          gameState={gameState}
          selfPlayer={selfPlayer}
          onAction={handleAction}
          disabled={gameState.roundState !== 'PLAYING'}
        />
      </footer>

      {/* Chat & Quick Reaction Slide-out Drawer */}
      <ChatBox
        chatMessages={chatMessages}
        onSendMessage={(msg) => socket.emit('chat:send', {
          roomId: gameState.roomId,
          sender: { id: user.id, name: user.name },
          message: msg
        })}
        onSendReaction={(emoji) => socket.emit('chat:reaction', {
          roomId: gameState.roomId,
          playerId: user.id,
          emoji
        })}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* Hand Rankings Rules Modal */}
      {showHandRanksModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-xs">
            <h3 className="text-base font-bold text-amber-400 mb-3 font-cinzel">Teen Patti Hand Rankings</h3>
            <div className="space-y-2.5 text-slate-300">
              <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                <span className="font-bold text-amber-400 block">1. Trail / Trio / Set (Three of a kind)</span>
                Three cards of the same rank (e.g. A-A-A is highest, 2-2-2 is lowest).
              </div>
              <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                <span className="font-bold text-amber-400 block">2. Pure Sequence (Straight Flush)</span>
                Three consecutive cards of the same suit. A-K-Q is highest, <b>A-2-3 is second highest</b>, then K-Q-J down to 4-3-2.
              </div>
              <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                <span className="font-bold text-amber-400 block">3. Sequence (Normal Straight)</span>
                Three consecutive cards not of the same suit. Order is A-K-Q, <b>A-2-3</b>, K-Q-J ... 4-3-2.
              </div>
              <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                <span className="font-bold text-amber-400 block">4. Color (Flush)</span>
                Three cards of the same suit that are not in sequence. High card breaks ties.
              </div>
              <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                <span className="font-bold text-amber-400 block">5. Pair (Double)</span>
                Two cards of the same rank. Highest pair wins; third card acts as kicker.
              </div>
              <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                <span className="font-bold text-amber-400 block">6. High Card</span>
                When no other combination is formed. Highest card wins.
              </div>
            </div>
            <button
              onClick={() => setShowHandRanksModal(false)}
              className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl text-xs transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
