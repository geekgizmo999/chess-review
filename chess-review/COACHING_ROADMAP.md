# Personal chess coach — implementation roadmap

Target: a personal coach for roughly 800–1400 Elo, adapting across tactics, openings, middlegames and endgames.

## Guardrails
- Keep PGN paste/import and public Chess.com archive import working.
- Keep Stockfish 19 Lite running locally in the browser; no server engine or account required.
- Treat engine scores as evidence, not as an explanation by themselves.
- Label heuristics honestly; do not claim to duplicate Chess.com's private CAPS2 or classification algorithms.
- Keep the existing single-page app usable while building seams for a later Next.js + TypeScript migration.

## Stage 1 — coaching foundation (implemented)
- `coach.js` provides pure functions to estimate game phase, group reviewed mistakes into four study areas, rank likely focus areas, and read/write session counts.
- The review UI now includes a Personal coach panel with per-area counts, short study prompts, links back to the relevant move, and a suggested focus.
- Session counts are stored locally in `localStorage`; no game data is uploaded by the coach module.
- Tests cover phase detection, side filtering, four-area output, focus ranking, and storage fallback.

Known limitation: the first categorizer is a transparent heuristic. It does not yet reliably identify motifs such as pins, forks, deflections, weak squares, pawn breaks, or opposition. It should not be treated as a complete chess diagnosis.

## Stage 2 — playable, verified training exercises
- Turn reviewed positions into exercises; start with tactical positions where engine lines provide a verifiable best move.
- Let the user enter a move legally on a board before revealing the answer and explanation.
- Validate the full solution line with `chess.js`; don't generate puzzles from incomplete engine analysis.
- Add review scheduling for missed exercises.

## Stage 3 — four dedicated training tracks
- Tactics: checks/captures/threats, forks, pins, skewers, discovered attacks, mating patterns, defensive resources.
- Openings: opening identity, first deviation, opening principles, and a small repertoire based on the user's imported games.
- Middlegames: candidate moves, piece activity, king safety, pawn breaks, weak squares, exchanges, and plans.
- Endgames: king-and-pawn basics, opposition, passed pawns, rook activity and common rook endings.
- Keep a clear distinction between engine-verified lines and rule-based instructional hints.

## Stage 4 — adaptive training and progress
- Track attempts, success rate, response time (optional), repeated errors and spaced-review dates locally.
- Weight the weekly mix by repeated/high-impact errors while preserving exposure to all four areas.
- Add trend summaries across imported games; avoid implying statistical certainty from a single game.

## Stage 5 — Next.js + TypeScript migration
- Create typed domain models for `Game`, `ReviewedMove`, `EngineLine`, `CoachFinding`, `Exercise`, and `TrainingAttempt`.
- Move review and coach logic into testable pure modules before moving UI components.
- Wrap the existing Stockfish worker in a typed engine adapter; preserve WASM asset paths and browser-only execution.
- Migrate import flows and UI incrementally; run regression tests against PGN parsing, Chess.com imports, engine analysis, and coaching logic after each move.

## Current test command

```powershell
node --test tests/*.test.mjs
```
