// Personal coach foundation: deterministic, explainable heuristics over existing review results.
// This deliberately does not claim to identify every tactical/strategic motif; that comes in later stages.

const BAD = new Set(['Inaccuracy', 'Miss', 'Mistake', 'Blunder']);
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function phaseOfFen(fen) {
  const board = (fen || '').split(' ')[0];
  let nonPawnMaterial = 0, pieces = 0;
  for (const ch of board) {
    const p = ch.toLowerCase();
    if (VALUE[p] !== undefined && p !== 'p' && p !== 'k') nonPawnMaterial += VALUE[p];
    if (/[prnbqk]/i.test(ch)) pieces++;
  }
  if (nonPawnMaterial <= 12 || pieces <= 10) return 'endgame';
  if (nonPawnMaterial <= 22 || pieces <= 14) return 'middlegame';
  return 'opening';
}

function categoryFor({ i, move, fen, bookN, label }) {
  const phase = phaseOfFen(fen);
  if (phase === 'endgame') return 'endgames';
  if (i < Math.max(bookN, 10) && phase === 'opening') return 'openings';
  // Early version: mistakes are tactical candidates; strategic study is drawn from quieter middlegame inaccuracies.
  if (BAD.has(label) && (move.captured || move.san?.includes('+') || ['Mistake', 'Blunder', 'Miss'].includes(label))) return 'tactics';
  if (phase === 'middlegame') return 'middlegames';
  if (BAD.has(label)) return 'tactics';
  return 'middlegames';
}

const TITLES = {
  tactics: 'Tactics & calculation',
  openings: 'Opening decisions',
  middlegames: 'Middlegame plans',
  endgames: 'Endgame technique'
};
const ADVICE = {
  tactics: 'Before moving, check checks, captures, threats, and what your opponent can do next. Recalculate forcing lines after every candidate move.',
  openings: 'Review the first position where you left the known line. Check development, central control, king safety, and whether your move created a concrete threat.',
  middlegames: 'Name your worst-placed piece, identify the opponent’s threat, and choose a plan before calculating individual moves.',
  endgames: 'Activate your king, count pawn races, look for opposition and passed pawns, and verify rook activity before trading.'
};

export function buildCoachPlan({ moves = [], fens = [], res = [], bookN = 0, me = '' } = {}) {
  const counts = { tactics: 0, openings: 0, middlegames: 0, endgames: 0 };
  const examples = { tactics: [], openings: [], middlegames: [], endgames: [] };
  let reviewed = 0, serious = 0;
  moves.forEach((move, i) => {
    const result = res[i];
    if (!result) return;
    if (me && move.color !== me) return;
    reviewed++;
    if (!BAD.has(result.label)) return;
    serious++;
    const category = categoryFor({ i, move, fen: fens[i] || '', bookN, label: result.label });
    counts[category]++;
    examples[category].push({ ply: i + 1, move: move.san, label: result.label, loss: Number(result.loss || 0), fen: fens[i] || '' });
  });
  const areas = Object.keys(counts).map(id => ({
    id, title: TITLES[id], count: counts[id], advice: ADVICE[id],
    examples: examples[id].sort((a, b) => b.loss - a.loss).slice(0, 3)
  }));
  // A non-zero floor ensures all four areas remain in the weekly rotation until sufficient evidence exists.
  const max = Math.max(1, ...areas.map(a => a.count));
  const ranked = areas.map(a => ({ ...a, priority: a.count ? Math.round(100 * a.count / max) : 10 }))
    .sort((a, b) => b.count - a.count || ['tactics', 'openings', 'middlegames', 'endgames'].indexOf(a.id) - ['tactics', 'openings', 'middlegames', 'endgames'].indexOf(b.id));
  return {
    reviewedMoves: reviewed,
    mistakesFound: serious,
    areas: ranked,
    focus: ranked[0],
    note: reviewed ? 'Based on the reviewed moves available so far. Categories are an initial heuristic, not a perfect motif detector.' : 'Analyze a PGN or load a Chess.com game to build a plan from your moves.'
  };
}

export function readCoachProgress(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage?.getItem('chess-coach-progress-v1') || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch { return {}; }
}

export function writeCoachProgress(progress, storage = globalThis.localStorage) {
  try { storage?.setItem('chess-coach-progress-v1', JSON.stringify(progress)); return true; }
  catch { return false; }
}
