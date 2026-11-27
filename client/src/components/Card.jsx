import React from 'react';

const SUIT_SYMBOLS = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣'
};

const SUIT_COLORS = {
  S: 'text-slate-900',
  C: 'text-slate-900',
  H: 'text-rose-600',
  D: 'text-rose-600'
};

const RANK_LABELS = {
  14: 'A',
  13: 'K',
  12: 'Q',
  11: 'J',
  10: '10',
  9: '9',
  8: '8',
  7: '7',
  6: '6',
  5: '5',
  4: '4',
  3: '3',
  2: '2'
};

export const Card = ({ card, faceDown = false, size = 'md', className = '' }) => {
  // Size classes
  const sizeClasses = {
    sm: 'w-9 h-13 text-xs rounded-sm',
    md: 'w-13 h-19 sm:w-14 sm:h-20 text-sm rounded-md',
    lg: 'w-18 h-26 sm:w-20 sm:h-28 text-base rounded-lg'
  }[size] || 'w-13 h-19 rounded-md';

  if (faceDown || card === '?' || !card) {
    return (
      <div
        className={`${sizeClasses} bg-gradient-to-br from-red-800 via-rose-900 to-red-950 border-2 border-amber-400/60 shadow-lg flex items-center justify-center relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 ${className}`}
      >
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#fde047_1px,transparent_1px)] [background-size:6px_6px]" />
        <div className="w-4/5 h-4/5 border border-amber-300/40 rounded flex items-center justify-center">
          <span className="text-amber-300 text-lg sm:text-xl font-bold font-cinzel">♠</span>
        </div>
      </div>
    );
  }

  // Parse card format
  let suit = 'S';
  let value = 14;

  if (typeof card === 'string') {
    suit = card.slice(-1).toUpperCase();
    const rankStr = card.slice(0, -1).toUpperCase();
    if (rankStr === 'A') value = 14;
    else if (rankStr === 'K') value = 13;
    else if (rankStr === 'Q') value = 12;
    else if (rankStr === 'J') value = 11;
    else value = parseInt(rankStr, 10);
  } else if (card && card.suit) {
    suit = card.suit.toUpperCase();
    value = Number(card.value);
  }

  const symbol = SUIT_SYMBOLS[suit] || '♠';
  const color = SUIT_COLORS[suit] || 'text-slate-900';
  const rankLabel = RANK_LABELS[value] || value;

  return (
    <div
      className={`${sizeClasses} bg-white border border-slate-300 shadow-md flex flex-col justify-between p-1 select-none font-semibold relative transition-all duration-300 transform hover:-translate-y-1.5 ${className}`}
      style={{
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)'
      }}
    >
      <div className={`flex flex-col items-center leading-none ${color}`}>
        <span className="font-bold">{rankLabel}</span>
        <span className="text-xs">{symbol}</span>
      </div>

      <div className={`self-center text-lg sm:text-2xl leading-none ${color}`}>
        {symbol}
      </div>

      <div className={`flex flex-col items-center leading-none rotate-180 ${color}`}>
        <span className="font-bold">{rankLabel}</span>
        <span className="text-xs">{symbol}</span>
      </div>
    </div>
  );
};
