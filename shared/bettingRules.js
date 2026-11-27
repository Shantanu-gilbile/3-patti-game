/**
 * Teen Patti Betting Rules and Limits
 */

export const DEFAULT_CONFIG = {
  bootAmount: 100,
  maxBlindCount: 4,      // Max consecutive blind turns a player can play (typical rule 4)
  potLimit: 100000,      // Max chips allowed in the pot
  turnTimeoutSeconds: 30,
  showdownDelaySeconds: 5,
  reconnectHoldSeconds: 60,
  startingChips: 10000,
  dailyTopupChips: 5000,
  minPlayers: 2,
  maxPlayers: 6
};

/**
 * Calculate the required bet for a player action.
 * Current stake is tracked as the base blind bet value (e.g., starts at bootAmount).
 *
 * Rules:
 * - A Blind player can bet the current stake (Chaal) or double it (Raise, up to 2 * currentStake).
 * - A Seen player must bet twice what a Blind player bets for the same level.
 *   - Current stake = X (blind stake).
 *   - Blind player Chaal: X
 *   - Blind player Raise: 2 * X (now current stake becomes 2 * X)
 *   - Seen player Chaal: 2 * X
 *   - Seen player Raise: 4 * X (now current stake becomes 2 * X)
 *
 * Max stake multiplier: Usually 2x the current stake per raise.
 */
export function getValidBetRange(isBlind, currentStake, potLimit, currentPot, playerBalance) {
  const minBet = isBlind ? currentStake : currentStake * 2;
  const maxBet = isBlind ? currentStake * 2 : currentStake * 4;

  // Respect pot limit and player balance
  const remainingPotSpace = potLimit - currentPot;
  const effectiveMax = Math.min(maxBet, remainingPotSpace, playerBalance);
  const effectiveMin = Math.min(minBet, playerBalance);

  return {
    minBet: effectiveMin,
    maxBet: Math.max(effectiveMin, effectiveMax),
    canAffordMin: playerBalance >= minBet
  };
}

/**
 * Determine new currentStake after a bet.
 * If a blind player bets B, the new currentStake = B.
 * If a seen player bets S, the equivalent blind stake = S / 2, so new currentStake = S / 2.
 */
export function calculateNewStake(betAmount, isBlind) {
  return isBlind ? betAmount : Math.floor(betAmount / 2);
}
