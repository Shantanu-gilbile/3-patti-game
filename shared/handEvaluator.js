// Card definitions and Hand Evaluator for Teen Patti (3 Patti)

/**
 * Suits: 'S' (Spades), 'H' (Hearts), 'D' (Diamonds), 'C' (Clubs)
 * Values: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 (J), 12 (Q), 13 (K), 14 (A)
 * Card format: { suit: 'H', value: 14 } or string shorthand "AH", "10S", "2C", "KD"
 */

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_NAMES = { S: '♠', H: '♥', D: '♦', C: '♣' };

export const RANK_NAMES = {
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

export const HAND_TYPES = {
  TRAIL: 6,         // Three of a kind (Trio / Set)
  PURE_SEQUENCE: 5, // Straight flush (Pakki round)
  SEQUENCE: 4,      // Straight (Normal round)
  COLOR: 3,         // Flush (All cards of same suit)
  PAIR: 2,          // Pair (Double)
  HIGH_CARD: 1      // High card
};

export const HAND_TYPE_LABELS = {
  6: 'Trail (Set)',
  5: 'Pure Sequence',
  4: 'Sequence',
  3: 'Color (Flush)',
  2: 'Pair',
  1: 'High Card'
};

/**
 * Normalize card object or string into { suit, value }
 */
export function normalizeCard(card) {
  if (typeof card === 'string') {
    const suit = card.slice(-1).toUpperCase();
    const rankStr = card.slice(0, -1).toUpperCase();
    let value;
    if (rankStr === 'A') value = 14;
    else if (rankStr === 'K') value = 13;
    else if (rankStr === 'Q') value = 12;
    else if (rankStr === 'J') value = 11;
    else value = parseInt(rankStr, 10);
    return { suit, value };
  }
  return { suit: card.suit.toUpperCase(), value: Number(card.value) };
}

/**
 * Generate full 52 card deck
 */
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let value = 2; value <= 14; value++) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

/**
 * Helper to get sequence strength for teen patti.
 * In Teen Patti:
 * 1. A-K-Q is the highest sequence: [14, 13, 12] -> rank 14
 * 2. A-2-3 is the second highest sequence: [14, 3, 2] -> rank 13.5 (or custom ordered rank higher than K-Q-J)
 * 3. K-Q-J is next: [13, 12, 11] -> rank 13
 * ... down to 4-3-2: [4, 3, 2] -> rank 4
 *
 * Returns a score number between 4 and 15 if sequence, else 0.
 */
function getSequenceRank(sortedValues) {
  // sortedValues is sorted descending, e.g. [14, 13, 12] or [14, 3, 2]
  const [v1, v2, v3] = sortedValues;

  // Check A-2-3
  if (v1 === 14 && v2 === 3 && v3 === 2) {
    return 13.5; // Exactly between A-K-Q (14) and K-Q-J (13)
  }

  // Normal sequences: consecutive numbers
  if (v1 - v2 === 1 && v2 - v3 === 1) {
    return v1; // 14 for A-K-Q, 13 for K-Q-J ... down to 4 for 4-3-2
  }

  return 0;
}

/**
 * Evaluate 3 cards hand.
 * Returns: {
 *   type: HAND_TYPES.* (1-6),
 *   typeName: string,
 *   score: array of numbers for deterministic tie-breaking comparison,
 *   cards: sorted normalized cards
 * }
 */
export function evaluateHand(cards) {
  if (!cards || cards.length !== 3) {
    throw new Error('evaluateHand requires exactly 3 cards');
  }

  const normalized = cards.map(normalizeCard);
  // Sort descending by value
  normalized.sort((a, b) => b.value - a.value);

  const values = normalized.map(c => c.value);
  const suits = normalized.map(c => c.suit);
  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];

  // Frequency of card values
  const countMap = {};
  for (const v of values) {
    countMap[v] = (countMap[v] || 0) + 1;
  }
  const counts = Object.entries(countMap).map(([val, count]) => ({
    val: parseInt(val, 10),
    count
  })).sort((a, b) => b.count - a.count || b.val - a.val);

  // 1. Trail / Trio / Set (three of a kind)
  if (counts[0].count === 3) {
    return {
      type: HAND_TYPES.TRAIL,
      typeName: HAND_TYPE_LABELS[HAND_TYPES.TRAIL],
      score: [HAND_TYPES.TRAIL, counts[0].val],
      cards: normalized
    };
  }

  const seqRank = getSequenceRank(values);

  // 2. Pure Sequence (Straight Flush)
  if (isFlush && seqRank > 0) {
    return {
      type: HAND_TYPES.PURE_SEQUENCE,
      typeName: HAND_TYPE_LABELS[HAND_TYPES.PURE_SEQUENCE],
      score: [HAND_TYPES.PURE_SEQUENCE, seqRank],
      cards: normalized
    };
  }

  // 3. Normal Sequence (Straight)
  if (seqRank > 0) {
    return {
      type: HAND_TYPES.SEQUENCE,
      typeName: HAND_TYPE_LABELS[HAND_TYPES.SEQUENCE],
      score: [HAND_TYPES.SEQUENCE, seqRank],
      cards: normalized
    };
  }

  // 4. Color / Flush
  if (isFlush) {
    return {
      type: HAND_TYPES.COLOR,
      typeName: HAND_TYPE_LABELS[HAND_TYPES.COLOR],
      score: [HAND_TYPES.COLOR, values[0], values[1], values[2]],
      cards: normalized
    };
  }

  // 5. Pair
  if (counts[0].count === 2) {
    const pairValue = counts[0].val;
    const kicker = counts[1].val;
    return {
      type: HAND_TYPES.PAIR,
      typeName: HAND_TYPE_LABELS[HAND_TYPES.PAIR],
      score: [HAND_TYPES.PAIR, pairValue, kicker],
      cards: normalized
    };
  }

  // 6. High Card
  return {
    type: HAND_TYPES.HIGH_CARD,
    typeName: HAND_TYPE_LABELS[HAND_TYPES.HIGH_CARD],
    score: [HAND_TYPES.HIGH_CARD, values[0], values[1], values[2]],
    cards: normalized
  };
}

/**
 * Compare two hands.
 * Returns:
 * > 0 if handA wins
 * < 0 if handB wins
 * 0 if exact tie
 */
export function compareHands(handA, handB) {
  const evalA = handA.score ? handA : evaluateHand(handA);
  const evalB = handB.score ? handB : evaluateHand(handB);

  const len = Math.max(evalA.score.length, evalB.score.length);
  for (let i = 0; i < len; i++) {
    const valA = evalA.score[i] || 0;
    const valB = evalB.score[i] || 0;
    if (valA !== valB) {
      return valA - valB;
    }
  }

  return 0; // Pure tie (e.g. same ranks in high card/flush across different suits)
}

/**
 * Determine winner among active players
 * playersWithCards: Array of { playerId, cards }
 * Returns array of winner playerIds (multiple if split pot / exact tie)
 */
export function determineWinners(playersWithCards) {
  if (!playersWithCards || playersWithCards.length === 0) return [];
  if (playersWithCards.length === 1) return [playersWithCards[0].playerId];

  const evaluations = playersWithCards.map(p => ({
    playerId: p.playerId,
    evaluation: evaluateHand(p.cards)
  }));

  evaluations.sort((a, b) => compareHands(b.evaluation, a.evaluation));

  const bestEval = evaluations[0].evaluation;
  const winners = evaluations
    .filter(p => compareHands(p.evaluation, bestEval) === 0)
    .map(p => p.playerId);

  return winners;
}
