import React, { useState } from 'react';
import { Eye, ShieldX, Play, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { sounds } from '../utils/audio';

export const ActionBar = ({
  gameState,
  selfPlayer,
  onAction,
  disabled
}) => {
  if (!gameState || !selfPlayer) return null;

  const isMyTurn = gameState.currentTurnPlayerId === selfPlayer.id;
  const isPlaying = gameState.roundState === 'PLAYING';
  const isPacked = selfPlayer.isPacked;

  // Calculate betting options
  const isBlind = selfPlayer.isBlind;
  const stake = gameState.currentStake;
  const minChaal = isBlind ? stake : stake * 2;
  const maxChaal = isBlind ? stake * 2 : stake * 4;

  const [raiseAmount, setRaiseAmount] = useState(minChaal);

  // Sync raise amount if minChaal changes
  React.useEffect(() => {
    setRaiseAmount(minChaal);
  }, [minChaal]);

  if (!isPlaying || isPacked) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 text-center text-sm text-slate-400 max-w-xl mx-auto shadow-2xl">
        {isPacked
          ? 'You have packed. Waiting for current round to conclude...'
          : gameState.roundState === 'WAITING'
          ? 'Waiting for players to ready up and game to start...'
          : 'Showdown in progress...'}
      </div>
    );
  }

  const canAffordChaal = selfPlayer.chips >= minChaal;
  const canShow = gameState.canShow && isMyTurn;

  return (
    <div className="bg-slate-950/95 backdrop-blur-lg border border-slate-800/80 rounded-2xl p-3 sm:p-4 max-w-2xl mx-auto shadow-2xl">
      {/* Top row: Status & Quick Info */}
      <div className="flex items-center justify-between mb-3 text-xs sm:text-sm px-1">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Your Status:</span>
          <span className={`font-bold uppercase px-2 py-0.5 rounded text-[11px] ${
            isBlind ? 'bg-blue-900/60 text-blue-300' : 'bg-emerald-900/60 text-emerald-300'
          }`}>
            {isBlind ? 'Blind' : 'Seen'}
          </span>
          {isBlind && (
            <span className="text-slate-500 text-[11px]">
              (Blind count: {selfPlayer.blindTurnCount || 0}/{gameState.config.maxBlindCount})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Current Stake:</span>
          <span className="text-amber-400 font-bold">🪙 {stake}</span>
        </div>
      </div>

      {/* Raise Slider Controls if It's My Turn */}
      {isMyTurn && maxChaal > minChaal && (
        <div className="mb-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between text-xs text-slate-300 mb-1">
            <span>Bet Amount</span>
            <span className="text-amber-400 font-bold">🪙 {raiseAmount}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{minChaal}</span>
            <input
              type="range"
              min={minChaal}
              max={Math.min(maxChaal, selfPlayer.chips)}
              step={isBlind ? 50 : 100}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
            />
            <span className="text-xs text-slate-500">{Math.min(maxChaal, selfPlayer.chips)}</span>
          </div>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {/* See Cards button */}
        {isBlind && (
          <button
            onClick={() => {
              sounds.playCardFlip();
              onAction('action:see_cards');
            }}
            disabled={disabled}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs sm:text-sm font-semibold transition active:scale-95 disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            See Cards
          </button>
        )}

        {/* Pack / Fold */}
        <button
          onClick={() => {
            sounds.playFold();
            onAction('action:pack');
          }}
          disabled={!isMyTurn || disabled}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 text-xs sm:text-sm font-semibold transition active:scale-95 disabled:opacity-40"
        >
          <ShieldX className="w-4 h-4" />
          Pack
        </button>

        {/* Chaal (Current min bet) */}
        <button
          onClick={() => {
            sounds.playChip();
            onAction('action:bet', { amount: minChaal });
          }}
          disabled={!isMyTurn || !canAffordChaal || disabled}
          className="flex flex-col items-center justify-center py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950 transition active:scale-95 disabled:opacity-40"
        >
          <span>Chaal</span>
          <span className="text-[10px] opacity-90">🪙 {minChaal}</span>
        </button>

        {/* Raise Bet */}
        {raiseAmount > minChaal && (
          <button
            onClick={() => {
              sounds.playChip();
              onAction('action:bet', { amount: raiseAmount });
            }}
            disabled={!isMyTurn || raiseAmount > selfPlayer.chips || disabled}
            className="flex flex-col items-center justify-center py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-amber-950 transition active:scale-95 disabled:opacity-40"
          >
            <span className="flex items-center gap-1">
              Raise <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] opacity-90">🪙 {raiseAmount}</span>
          </button>
        )}

        {/* Show (Available when only 2 players left) */}
        {canShow && (
          <button
            onClick={() => {
              sounds.playChip();
              onAction('action:show');
            }}
            disabled={!isMyTurn || disabled}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-950 transition active:scale-95 col-span-2 sm:col-span-1"
          >
            <CheckCircle2 className="w-4 h-4" />
            Show
          </button>
        )}

        {/* Side Show Request */}
        {!isBlind && !canShow && isMyTurn && (
          <button
            onClick={() => {
              sounds.playChip();
              onAction('action:side_show_request');
            }}
            disabled={!isMyTurn || disabled}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-semibold transition active:scale-95 disabled:opacity-40"
          >
            Side Show
          </button>
        )}
      </div>
    </div>
  );
};
