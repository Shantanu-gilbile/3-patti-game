import assert from 'node:assert';
import {
  evaluateHand,
  compareHands,
  determineWinners,
  HAND_TYPES,
  createDeck
} from './handEvaluator.js';
import {
  getValidBetRange,
  calculateNewStake,
  DEFAULT_CONFIG
} from './bettingRules.js';

console.log('🧪 Starting Teen Patti Unit Tests...\n');

// 1. Hand Evaluation Tests
function testDeck() {
  const deck = createDeck();
  assert.strictEqual(deck.length, 52, 'Deck should contain 52 cards');
  console.log('✅ Deck generation: Passed (52 cards)');
}

function testHandRankings() {
  // Trail (Set)
  const trailA = evaluateHand(['AS', 'AH', 'AD']);
  const trailK = evaluateHand(['KS', 'KH', 'KD']);
  const trail2 = evaluateHand(['2S', '2H', '2C']);
  assert.strictEqual(trailA.type, HAND_TYPES.TRAIL);
  assert.strictEqual(trailK.type, HAND_TYPES.TRAIL);
  assert.strictEqual(trail2.type, HAND_TYPES.TRAIL);
  assert.ok(compareHands(trailA, trailK) > 0, 'Trail A beats Trail K');
  assert.ok(compareHands(trailK, trail2) > 0, 'Trail K beats Trail 2');

  // Pure Sequence (Straight Flush)
  const pureAKQ = evaluateHand(['AS', 'KS', 'QS']);
  const pureA23 = evaluateHand(['AH', '2H', '3H']);
  const pureKQJ = evaluateHand(['KD', 'QD', 'JD']);
  const pure432 = evaluateHand(['4C', '3C', '2C']);

  assert.strictEqual(pureAKQ.type, HAND_TYPES.PURE_SEQUENCE);
  assert.strictEqual(pureA23.type, HAND_TYPES.PURE_SEQUENCE);
  assert.strictEqual(pureKQJ.type, HAND_TYPES.PURE_SEQUENCE);
  assert.strictEqual(pure432.type, HAND_TYPES.PURE_SEQUENCE);

  // Requirement: A-2-3 is second highest after A-K-Q
  assert.ok(compareHands(pureAKQ, pureA23) > 0, 'Pure AKQ beats Pure A23');
  assert.ok(compareHands(pureA23, pureKQJ) > 0, 'Pure A23 beats Pure KQJ (Second highest rule)');
  assert.ok(compareHands(pureKQJ, pure432) > 0, 'Pure KQJ beats Pure 432');

  // Sequence (Straight)
  const seqAKQ = evaluateHand(['AS', 'KH', 'QD']);
  const seqA23 = evaluateHand(['AS', '2C', '3H']);
  const seqKQJ = evaluateHand(['KS', 'QH', 'JC']);
  const seq543 = evaluateHand(['5D', '4H', '3S']);

  assert.strictEqual(seqAKQ.type, HAND_TYPES.SEQUENCE);
  assert.strictEqual(seqA23.type, HAND_TYPES.SEQUENCE);
  assert.strictEqual(seqKQJ.type, HAND_TYPES.SEQUENCE);
  assert.strictEqual(seq543.type, HAND_TYPES.SEQUENCE);

  assert.ok(compareHands(seqAKQ, seqA23) > 0, 'Seq AKQ beats Seq A23');
  assert.ok(compareHands(seqA23, seqKQJ) > 0, 'Seq A23 beats Seq KQJ');
  assert.ok(compareHands(seqKQJ, seq543) > 0, 'Seq KQJ beats Seq 543');

  // Category comparisons
  assert.ok(compareHands(trail2, pureAKQ) > 0, 'Trail (even 2s) beats Pure AKQ');
  assert.ok(compareHands(pure432, seqAKQ) > 0, 'Pure Sequence (even 432) beats Normal Sequence (AKQ)');

  // Color (Flush)
  const colorAK9 = evaluateHand(['AS', 'KS', '9S']);
  const colorAQJ = evaluateHand(['AH', 'QH', 'JH']);
  const colorK98 = evaluateHand(['KD', '9D', '8D']);

  assert.strictEqual(colorAK9.type, HAND_TYPES.COLOR);
  assert.strictEqual(colorAQJ.type, HAND_TYPES.COLOR);
  assert.ok(compareHands(seq543, colorAK9) > 0, 'Sequence beats Color');
  assert.ok(compareHands(colorAK9, colorAQJ) > 0, 'AK9 color beats AQJ color (kicker)');
  assert.ok(compareHands(colorAQJ, colorK98) > 0, 'AQJ color beats K98 color');

  // Pair
  const pairAAK = evaluateHand(['AS', 'AH', 'KD']);
  const pairAAQ = evaluateHand(['AS', 'AC', 'QD']);
  const pairKKJ = evaluateHand(['KS', 'KH', 'JD']);
  const pair223 = evaluateHand(['2H', '2C', '3D']);

  assert.strictEqual(pairAAK.type, HAND_TYPES.PAIR);
  assert.strictEqual(pairAAQ.type, HAND_TYPES.PAIR);
  assert.ok(compareHands(colorK98, pairAAK) > 0, 'Color beats Pair');
  assert.ok(compareHands(pairAAK, pairAAQ) > 0, 'Pair of Aces with K beats Pair of Aces with Q');
  assert.ok(compareHands(pairAAQ, pairKKJ) > 0, 'Pair of Aces beats Pair of Kings');
  assert.ok(compareHands(pairKKJ, pair223) > 0, 'Pair of Kings beats Pair of 2s');

  // High Card
  const highAKJ = evaluateHand(['AS', 'KD', 'JH']);
  const highAK10 = evaluateHand(['AH', 'KS', '10C']);
  const highKQJ = evaluateHand(['KC', 'QD', '9S']);

  assert.strictEqual(highAKJ.type, HAND_TYPES.HIGH_CARD);
  assert.ok(compareHands(pair223, highAKJ) > 0, 'Pair beats High Card');
  assert.ok(compareHands(highAKJ, highAK10) > 0, 'AKJ beats AK10');
  assert.ok(compareHands(highAK10, highKQJ) > 0, 'AK10 beats KQ9');

  console.log('✅ Hand rankings & tie-breaks: Passed');
}

function testWinnerDetermination() {
  const p1 = { playerId: 'user1', cards: ['AS', 'AH', 'AD'] }; // Trail
  const p2 = { playerId: 'user2', cards: ['KS', 'QS', 'JS'] }; // Pure seq
  const p3 = { playerId: 'user3', cards: ['10S', '10H', '3D'] }; // Pair

  const winners = determineWinners([p1, p2, p3]);
  assert.deepStrictEqual(winners, ['user1'], 'Trail should win');

  // Exact tie split
  const pA = { playerId: 'A', cards: ['AS', 'KH', 'QD'] };
  const pB = { playerId: 'B', cards: ['AH', 'KD', 'QC'] };
  const tieWinners = determineWinners([pA, pB]);
  assert.strictEqual(tieWinners.length, 2, 'Should tie on identical sequence ranks');

  console.log('✅ Winner determination: Passed');
}

function testBettingLogic() {
  const stake = 100;
  const potLimit = 10000;
  const pot = 500;
  const balance = 2000;

  // Blind player range: min = stake (100), max = 2 * stake (200)
  const blindRange = getValidBetRange(true, stake, potLimit, pot, balance);
  assert.strictEqual(blindRange.minBet, 100);
  assert.strictEqual(blindRange.maxBet, 200);

  // Seen player range: min = 2 * stake (200), max = 4 * stake (400)
  const seenRange = getValidBetRange(false, stake, potLimit, pot, balance);
  assert.strictEqual(seenRange.minBet, 200);
  assert.strictEqual(seenRange.maxBet, 400);

  // New stake calculations
  assert.strictEqual(calculateNewStake(100, true), 100, 'Blind 100 keeps stake 100');
  assert.strictEqual(calculateNewStake(200, true), 200, 'Blind 200 raises stake to 200');
  assert.strictEqual(calculateNewStake(200, false), 100, 'Seen 200 (chaal) keeps stake 100');
  assert.strictEqual(calculateNewStake(400, false), 200, 'Seen 400 (raise) raises stake to 200');

  console.log('✅ Betting logic: Passed');
}

testDeck();
testHandRankings();
testWinnerDetermination();
testBettingLogic();

console.log('\n🎉 ALL SHARED EVALUATOR TESTS PASSED SUCCESSFULLY!\n');
