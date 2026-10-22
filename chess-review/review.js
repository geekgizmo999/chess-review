import { Chess } from './lib/chess.js';

export const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const ORDER = ['Brilliant', 'Great', 'Best', 'Excellent', 'Good', 'Book', 'Inaccuracy', 'Miss', 'Mistake', 'Blunder'];
export const COLORS = { Brilliant: '#1baca6', Great: '#5b8bb2', Best: '#5c9a2b', Excellent: '#7cb342', Good: '#96a85f', Book: '#a88865', Inaccuracy: '#e0a800', Miss: '#e46a6a', Mistake: '#e8832a', Blunder: '#d32f2f' };
export const SYM = { Brilliant: '!!', Great: '!', Best: '★', Excellent: '✓', Good: '✓', Book: 'B', Inaccuracy: '?!', Miss: '✗', Mistake: '?', Blunder: '??' };
export const KEY = ['Brilliant', 'Great', 'Miss', 'Mistake', 'Blunder'];

// ---- expected points (rating aware) ----
// k is fitted around 2300 (Lichess' curve); weaker players convert advantages less reliably, so their curve is flatter.
export const kOf = r => 0.00368208 * Math.pow(Math.max(400, Math.min(3000, r || 1200)) / 2300, 0.6);
export const ep = (cp, r) => 1 / (1 + Math.exp(-kOf(r) * Math.max(-3000, Math.min(3000, cp))));
export const epL = (l, r) => (l.mate != null ? (l.mate > 0 ? 1 : l.mate < 0 ? 0 : 0) : ep(l.v, r));

// Published Classification V2 expected-points loss bands. The rating-to-EP curve
// above remains an approximation because Chess.com has not published its exact curve.
export const classifyLoss = loss => loss < 0.003 ? 'Best' : loss <= 0.02 ? 'Excellent' : loss <= 0.05 ? 'Good' : loss <= 0.10 ? 'Inaccuracy' : loss <= 0.20 ? 'Mistake' : 'Blunder';
export const evalStr = (l, sgn = 1) => {
  if (l.mate != null) return l.mate === 0 ? '#' : (sgn * l.mate > 0 ? '+' : '-') + 'M' + Math.abs(l.mate);
  const v = sgn * l.v / 100;
  return (v > 0 ? '+' : '') + v.toFixed(1);
};
export const bucket = e => e >= 0.85 ? 'winning' : e >= 0.65 ? 'clearly better' : e >= 0.55 ? 'slightly better' : e >= 0.45 ? 'about equal' : e >= 0.3 ? 'worse' : 'losing';

// ---- helpers ----
const md = (fen, col) => {
  let s = 0;
  for (const ch of fen.split(' ')[0]) { const l = ch.toLowerCase(); if (/[a-z]/i.test(ch) && VAL[l] !== undefined) s += (ch === l ? -1 : 1) * VAL[l]; }
  return col === 'w' ? s : -s;
};
const mv = (c, u) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
export function pvSan(fen, pv, max = 6) {
  const c = new Chess(fen); let n = +fen.split(' ')[5] || 1, out = [], sans = [], first = true;
  for (const u of pv.slice(0, max)) {
    const t = c.turn(), m = mv(c, u); if (!m) break;
    sans.push(m.san);
    if (t === 'w') out.push(n + '. ' + m.san); else { out.push((first ? n + '... ' : '') + m.san); n++; }
    first = false;
  }
  return { sans, text: out.join(' ') };
}
const matPath = (fen, pv, col, plies) => {
  const c = new Chess(fen), base = md(fen, col), out = [];
  for (let k = 0; k < Math.min(plies, pv.length); k++) { if (!mv(c, pv[k])) break; out.push(md(c.fen(), col) - base); }
  return out;
};
const attacksFrom = (fen, sq) => {
  const p = fen.split(' '); p[1] = p[1] === 'w' ? 'b' : 'w'; p[3] = '-';
  try { return new Chess(p.join(' ')).moves({ square: sq, verbose: true }).filter(m => m.captured).map(m => m.captured); } catch (e) { return []; }
};
const list = a => a.length < 2 ? a[0] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
export function describe(fen, uci, ply) {
  const c = new Chess(fen), m = mv(c, uci); if (!m) return [];
  const o = [];
  if (m.flags.includes('k') || m.flags.includes('q')) o.push('castles, tucking the king away');
  if (m.promotion) o.push('promotes to a ' + NAME[m.promotion]);
  if (m.captured) o.push(`captures the ${NAME[m.captured]} on ${m.to}`);
  if (m.san.includes('#')) o.push('delivers checkmate'); else if (m.san.includes('+')) o.push('gives check');
  const big = attacksFrom(c.fen(), m.to).filter(x => x === 'k' || VAL[x] >= 3);
  if (!m.san.includes('#')) {
    if (big.length >= 2) o.push('forks the ' + list(big.map(x => NAME[x])));
    else if (big.length === 1 && !m.san.includes('+')) o.push('attacks the ' + NAME[big[0]]);
  }
  if (!m.captured && ply < 24 && (m.piece === 'n' || m.piece === 'b') && (m.from[1] === '1' || m.from[1] === '8')) o.push('develops the ' + NAME[m.piece]);
  if (ply < 14 && m.piece === 'p' && 'de'.includes(m.to[0]) && '45'.includes(m.to[1])) o.push('fights for the center');
  return o.slice(0, 3);
}

// ---- game parsing & openings ----
export function parseGame(pgn) {
  const g = new Chess();
  if (!g.load_pgn(pgn.trim())) return null;
  const headers = g.header(), moves = g.history({ verbose: true });
  if (!moves.length) return null;
  const c = new Chess(headers.FEN && headers.SetUp === '1' ? headers.FEN : undefined), fens = [c.fen()];
  for (const m of moves) { c.move(m.san); fens.push(c.fen()); }
  return { headers, moves, fens, sans: moves.map(m => m.san) };
}
export function detectOpening(sans, OPEN) {
  for (let n = Math.min(sans.length, 24); n >= 1; n--) { const o = OPEN[sans.slice(0, n).join(' ')]; if (o) return { n, eco: o[0], name: o[1] }; }
  return { n: 0 };
}

// ---- classification ----
export function classifyAll(S) {
  const { moves, fens, raw, rat, bookN = 0 } = S, base = [], res = [];
  for (let i = 0; i < moves.length; i++) {
    const A = raw[i], B = raw[i + 1];
    if (!A || !B) { base.push(null); continue; }
    const m = moves[i], R = rat[m.color], uci = m.from + m.to + (m.promotion || ''), best = A.lines[0], sec = A.lines[1], bl = B.lines[0];
    const playedBest = best.pv[0] === uci;
    const bestEP = epL(best, R), afterEP = 1 - epL(bl, R), cl = v => Math.max(-1000, Math.min(1000, v));
    base.push({
      uci, playedBest, bestEP, afterEP, loss: playedBest ? 0 : Math.max(0, bestEP - afterEP),
      lr: playedBest ? 0 : Math.max(0, epL(best, 2300) - (1 - epL(bl, 2300))),
      cpl: playedBest ? 0 : Math.max(0, cl(best.v) - cl(-bl.v)), secEP: sec ? epL(sec, R) : null
    });
  }
  for (let i = 0; i < moves.length; i++) {
    const b = base[i]; if (!b) { res.push(null); continue; }
    const m = moves[i], R = rat[m.color], B = raw[i + 1], pre = base[i - 1];
    let L = i < bookN ? 'Book' : b.playedBest ? 'Best' : classifyLoss(b.loss);
    if (pre && pre.loss >= 0.10 && (L === 'Inaccuracy' || L === 'Mistake') && b.bestEP >= 0.6) L = 'Miss';
    let sac = 0;
    if ((L === 'Best' || L === 'Excellent') && b.secEP != null) {
      const pp = matPath(fens[i], [b.uci, ...B.lines[0].pv], m.color, 4), thr = R < 800 ? 1 : R < 1400 ? 2 : 3;
      if (m.piece !== 'p' && pp.length >= 3 && pp[pp.length - 1] <= -Math.max(3, thr) && b.afterEP >= 0.45 && b.secEP < 0.9) { L = 'Brilliant'; sac = -pp[pp.length - 1]; }
      else if (L === 'Best' && b.bestEP - b.secEP >= (R < 1000 ? 0.15 : R < 1800 ? 0.20 : 0.25) && b.afterEP >= 0.4 && b.bestEP < 0.95) {
        const pm = moves[i - 1], recapture = m.captured && pm && pm.to === m.to;
        if (!recapture && new Chess(fens[i]).moves().length > 2) L = 'Great';
      }
    }
    res.push({ ...b, label: L, sac });
  }
  return res;
}

export function summarize(S, res) {
  const side = () => ({ cnt: {}, acc: [], cpl: [], worst: [] }), o = { w: side(), b: side() };
  S.moves.forEach((m, i) => {
    const r = res[i]; if (!r) return; const s = o[m.color];
    s.cnt[r.label] = (s.cnt[r.label] || 0) + 1;
    s.acc.push(Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * 100 * r.lr) - 3.1668)));
    s.cpl.push(r.cpl); if (r.loss >= 0.05) s.worst.push({ i, loss: r.loss, label: r.label });
  });
  for (const k of ['w', 'b']) {
    const s = o[k], avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    s.accuracy = avg(s.acc); s.acpl = avg(s.cpl);
    s.est = s.cpl.length ? Math.round(Math.max(400, Math.min(3200, 3100 * Math.exp(-0.01 * s.acpl)))) : null;
    s.worst.sort((a, b) => b.loss - a.loss); s.worst = s.worst.slice(0, 3);
  }
  return o;
}

// ---- explanations ----
export function explain(i, S) {
  const { moves, fens, raw, rat, res } = S, m = moves[i], r = res[i], A = raw[i], B = raw[i + 1];
  const san = m.san, L = r.label, R = rat[m.color], best = A.lines[0], sec = A.lines[1], opp = B.lines[0];
  const bad = ['Inaccuracy', 'Miss', 'Mistake', 'Blunder'].includes(L);
  const bestSan = r.playedBest ? san : (best.pv[0] ? pvSan(fens[i], [best.pv[0]], 1).sans[0] : null);
  const head = {
    Brilliant: `${san} is brilliant! You give up material and the engine confirms it works.`,
    Great: `${san} is a great move. It was the critical move in this position.`,
    Best: `${san} is the best move.`,
    Excellent: `${san} is an excellent move, almost as good as the engine's top choice.`,
    Good: `${san} is a good move.`,
    Book: `${san} is a book move${S.opening ? ' (' + S.opening + ')' : ''}.`,
    Inaccuracy: `${san} is an inaccuracy.`,
    Miss: `${san} misses a chance to punish your opponent's mistake.`,
    Mistake: `${san} is a mistake.`,
    Blunder: `${san} is a blunder.`
  }[L];
  const reasons = [], idea = [];
  const pp = matPath(fens[i], [r.uci, ...opp.pv], m.color, 4), bp = matPath(fens[i], best.pv, m.color, 4);
  let lostLine = 0;
  if (bad) {
    if (best.mate > 0 && !r.playedBest) reasons.push(`You had a forced checkmate in ${best.mate} with ${bestSan}.`);
    if (opp.mate > 0) reasons.push(`This allows a forced checkmate in ${opp.mate}.`);
    const rep = opp.pv[0];
    if (rep && pp.length >= 2) {
      const lost = pp[0] - (pp[2] !== undefined ? pp[2] : pp[1]);
      const c = new Chess(fens[i + 1]), rm = mv(c, rep);
      if (lost >= 2 && rm) lostLine = reasons.push(`It allows ${rm.san}${rm.captured ? ', winning your ' + NAME[rm.captured] : ''}. You end up about ${lost} point${lost > 1 ? 's' : ''} down in material.`);
      else if (rm && (rm.captured || rm.san.includes('+')) && (L === 'Mistake' || L === 'Blunder')) reasons.push(`It does not deal with the threat of ${rm.san}.`);
    }
    const bg = bp.length ? bp[bp.length - 1] : 0, pg = pp.length ? pp[pp.length - 1] : 0;
    if (!r.playedBest && bg - pg >= 2) {
      if (bg >= 1) reasons.push(`${bestSan} would have won about ${bg} point${bg > 1 ? 's' : ''} of material.`);
      else if (!lostLine) reasons.push(`${bestSan} would have avoided losing material.`);
    }
    const e1 = bucket(r.bestEP), e2 = bucket(r.afterEP);
    reasons.push(e1 !== e2 ? `Your position drops from ${e1} to ${e2}.` : r.afterEP < 0.5 ? `You were already ${e1}, and this makes it worse.` : `You stay ${e2}, but give up some of your edge.`);
  }
  if (L === 'Brilliant') reasons.push(`You invest about ${r.sac} point${r.sac > 1 ? 's' : ''} of material for a strong position (${evalStr(opp, -1)}).`);
  if (L === 'Great' && sec && sec.pv[0]) reasons.push(`The next best move, ${pvSan(fens[i], [sec.pv[0]], 1).sans[0]}, would have left you at ${evalStr(sec)}.`);
  if (bestSan) idea.push(...describe(fens[i], r.playedBest ? r.uci : best.pv[0], i));
  const line = pvSan(fens[i], best.pv, 6);
  return {
    label: L, head, reasons, idea: idea.length ? idea.join(', ') : '', playedBest: r.playedBest, bestSan, line: line.text, lineUci: best.pv.slice(0, line.sans.length),
    evals: `${evalStr(best)} → ${evalStr(opp, -1)}`, loss: r.loss
  };
}
