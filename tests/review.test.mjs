import test from 'node:test';
import assert from 'node:assert/strict';
import { ep, epL, kOf, classifyLoss, parseGame, classifyAll, summarize } from '../review.js';

test('expected-points curve is bounded and monotonic', () => {
  for (const rating of [400, 800, 1200, 1800, 2300, 3000]) {
    assert.ok(ep(-3000, rating) >= 0 && ep(-3000, rating) <= 0.5);
    assert.ok(ep(3000, rating) >= 0.5 && ep(3000, rating) <= 1);
    assert.ok(ep(-100, rating) < ep(0, rating));
    assert.ok(ep(0, rating) < ep(100, rating));
  }
  assert.ok(kOf(400) < kOf(2300));
});

test('mate scores map to expected points from the side-to-move perspective', () => {
  assert.equal(epL({ mate: 3, v: 10000 }, 1200), 1);
  assert.equal(epL({ mate: -3, v: -10000 }, 1200), 0);
  assert.equal(epL({ mate: null, v: 0 }, 1200), 0.5);
});

test('published expected-points loss thresholds map to the intended bands', () => {
  assert.equal(classifyLoss(0), 'Best');
  assert.equal(classifyLoss(0.003), 'Excellent');
  assert.equal(classifyLoss(0.02), 'Excellent');
  assert.equal(classifyLoss(0.0201), 'Good');
  assert.equal(classifyLoss(0.05), 'Good');
  assert.equal(classifyLoss(0.0501), 'Inaccuracy');
  assert.equal(classifyLoss(0.10), 'Inaccuracy');
  assert.equal(classifyLoss(0.1001), 'Mistake');
  assert.equal(classifyLoss(0.20), 'Mistake');
  assert.equal(classifyLoss(0.2001), 'Blunder');
});

test('PGN parser preserves move count and position sequence', () => {
  const parsed = parseGame('[Event "test"]\n[White "A"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0');
  assert.ok(parsed);
  assert.equal(parsed.moves.length, 4);
  assert.equal(parsed.fens.length, 5);
  assert.deepEqual(parsed.sans, ['e4', 'e5', 'Nf3', 'Nc6']);
});

test('classification uses mover-side expected points and summarizes both sides', () => {
  const parsed = parseGame('[Event "test"]\n[White "A"]\n[Black "B"]\n[WhiteElo "1200"]\n[BlackElo "1200"]\n[Result "*"]\n\n1. e4 e5 *');
  assert.ok(parsed);
  // Scores are from the side-to-move perspective. White's e4 leaves Black at -0.5.
  const raw = [
    { lines: [{ v: 50, mate: null, pv: ['e2e4'] }, { v: 30, mate: null, pv: ['d2d4'] }] },
    { lines: [{ v: -50, mate: null, pv: ['g8f6'] }, { v: -30, mate: null, pv: ['b8c6'] }] },
    { lines: [{ v: 0, mate: null, pv: ['g1f3'] }, { v: -10, mate: null, pv: ['f1c4'] }] }
  ];
  const S = { ...parsed, raw, rat: { w: 1200, b: 1200 }, bookN: 0 };
  const results = classifyAll(S);
  assert.equal(results.length, 2);
  assert.equal(results[0].playedBest, true);
  assert.equal(results[0].label, 'Best');
  const summary = summarize(S, results);
  assert.ok(Number.isFinite(summary.w.accuracy));
  assert.ok(Number.isFinite(summary.b.accuracy));
  assert.ok(summary.w.accuracy >= 0 && summary.w.accuracy <= 100);
  assert.ok(summary.b.accuracy >= 0 && summary.b.accuracy <= 100);
});
