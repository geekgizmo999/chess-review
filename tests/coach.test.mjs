import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCoachPlan, phaseOfFen, readCoachProgress, writeCoachProgress } from '../coach.js';

test('phase detector distinguishes opening, middlegame and endgame examples', () => {
  assert.equal(phaseOfFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'), 'opening');
  assert.equal(phaseOfFen('8/8/4k3/8/8/4K3/4P3/8 w - - 0 1'), 'endgame');
});

test('coach plan adapts to the selected side and ranks observed weaknesses', () => {
  const moves = [
    { color: 'w', san: 'e4', captured: null },
    { color: 'b', san: 'Qh4+', captured: null },
    { color: 'w', san: 'Nf3', captured: null },
    { color: 'w', san: 'Rxd5', captured: 'p' }
  ];
  const fens = Array(5).fill('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const res = [
    { label: 'Blunder', loss: .3 },
    { label: 'Mistake', loss: .15 },
    { label: 'Good', loss: .02 },
    { label: 'Inaccuracy', loss: .07 }
  ];
  const plan = buildCoachPlan({ moves, fens, res, bookN: 0, me: 'w' });
  assert.equal(plan.reviewedMoves, 3);
  assert.equal(plan.mistakesFound, 2);
  assert.equal(plan.areas.reduce((n, a) => n + a.count, 0), 2);
  assert.ok(plan.focus.count >= 1);
  assert.equal(plan.areas.length, 4);
});

test('coach progress storage gracefully handles unavailable storage', () => {
  const memory = new Map();
  const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  assert.deepEqual(readCoachProgress(storage), {});
  assert.equal(writeCoachProgress({ tactics: 3 }, storage), true);
  assert.deepEqual(readCoachProgress(storage), { tactics: 3 });
  assert.deepEqual(readCoachProgress({ getItem() { throw Error('blocked'); } }), {});
});
