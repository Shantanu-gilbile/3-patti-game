import React from 'react';
import { Card } from './Card';
import { Volume2, VolumeX, ShieldAlert, Sparkles } from 'lucide-react';

export const Seat = ({
  player,
  isCurrentTurn,
  turnTimeRemaining,
  isDealer,
  positionIndex,
  isSelf,
  reaction
}) => {
  if (!player) return null;

  // Circular timer calculation
  const totalTime = 30;
  const progress = isCurrentTurn ? (turnTimeRemaining / totalTime) * 100 : 0;
  const strokeDashoffset = 100 - progress;

  // Relative seat position on the oval table: 6 distinct positions around circle
  const positionClasses = [
    'bottom-2 left-1/2 -translate-x-1/2',       // 0: Bottom Center (Self / Primary)
    'bottom-16 left-4 sm:left-12',              // 1: Bottom Left
    'top-16 left-4 sm:left-12',                 // 2: Top Left
    'top-2 left-1/2 -translate-x-1/2',          // 3: Top Center
    'top-16 right-4 sm:right-12',               // 4: Top Right
    'bottom-16 right-4 sm:right-12'             // 5: Bottom Right
  ][positionIndex % 6];

  return (
    <div className={`absolute ${positionClasses} flex flex-col items-center z-20 transition-all duration-300`}>
      {/* Floating Reaction Bubble */}
      {reaction && (
        <div className="absolute -top-10 animate-bounce bg-black/80 px-2 py-1 rounded-full text-2xl border border-amber-400 z-50">
          {reaction.emoji}
        </div>
      )}

      {/* Cards Display */}
      <div className="flex -space-x-4 mb-1">
        {player.cards && player.cards.length > 0 ? (
          player.cards.map((card, idx) => (
            <Card
              key={idx}
              card={card}
              faceDown={card === '?'}
              size={isSelf ? 'lg' : 'md'}
              className={player.isWinner ? 'ring-2 ring-amber-400 animate-pulse' : ''}
            />
          ))
        ) : (
          player.cardCount > 0 && [0, 1, 2].map((_, idx) => (
            <Card key={idx} faceDown={true} size={isSelf ? 'lg' : 'md'} />
          ))
        )}
      </div>

      {/* Hand description if available */}
      {player.handEvaluation && (
        <span className="text-[11px] font-bold text-amber-300 bg-black/75 px-2 py-0.5 rounded-full border border-amber-500/40 mb-1 shadow">
          {player.handEvaluation.typeName}
        </span>
      )}

      {/* Avatar Container with Timer Ring */}
      <div className="relative flex items-center justify-center">
        {isCurrentTurn && (
          <svg className="absolute -inset-1 w-14 h-14 sm:w-16 sm:h-16 -rotate-90 pointer-events-none">
            <circle
              cx="50%"
              cy="50%"
              r="24"
              className="stroke-amber-400/30"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="50%"
              cy="50%"
              r="24"
              className="stroke-amber-400 transition-all duration-1000 ease-linear"
              strokeWidth="4"
              strokeDasharray="150"
              strokeDashoffset={`${(strokeDashoffset * 1.5)}`}
              fill="transparent"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Player Avatar */}
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-2xl sm:text-3xl bg-slate-900 border-2 shadow-xl relative transition-all ${
            player.isWinner
              ? 'border-amber-400 ring-4 ring-amber-400/50 scale-105'
              : isCurrentTurn
              ? 'border-amber-400 scale-105'
              : player.isPacked
              ? 'border-slate-700 opacity-50 grayscale'
              : 'border-slate-600'
          }`}
        >
          {player.avatar}

          {/* Dealer Chip Indicator */}
          {isDealer && (
            <div className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border border-white shadow">
              D
            </div>
          )}

          {/* Winner Ribbon */}
          {player.isWinner && (
            <div className="absolute -bottom-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full shadow-lg flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> Won
            </div>
          )}
        </div>
      </div>

      {/* Player Info Box */}
      <div className="bg-slate-950/85 backdrop-blur-md px-2 py-1 rounded-md border border-slate-700/70 shadow-lg text-center mt-1 min-w-[90px]">
        <div className="flex items-center justify-center gap-1">
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[70px]">
            {player.name} {isSelf && '(You)'}
          </span>
          {!player.isConnected && (
            <span className="text-[10px] text-rose-400 font-bold" title="Disconnected">⚡</span>
          )}
        </div>

        <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-xs">
          <span>🪙</span>
          <span>{player.chips.toLocaleString()}</span>
        </div>

        {/* Status badges */}
        <div className="mt-0.5 flex items-center justify-center gap-1">
          {player.isPacked ? (
            <span className="text-[9px] bg-rose-950/80 text-rose-400 px-1.5 rounded font-bold uppercase">
              Packed
            </span>
          ) : player.isBlind ? (
            <span className="text-[9px] bg-blue-950/80 text-blue-300 px-1.5 rounded font-bold uppercase">
              Blind
            </span>
          ) : (
            <span className="text-[9px] bg-emerald-950/80 text-emerald-300 px-1.5 rounded font-bold uppercase">
              Seen
            </span>
          )}

          {player.currentBet > 0 && (
            <span className="text-[9px] text-slate-400">
              +{player.currentBet}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
