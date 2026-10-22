# Chess Review audit and prioritized fixes

## What changed in this pass

### P0 — engine result reliability
- Parse the UCI `depth` field on each usable `info` line.
- Keep the deepest result per MultiPV line and ignore bound scores.
- Require the principal variation to reach the requested depth before accepting the position result.
- Compare MultiPV lines only at the same completed depth.
- Add a 120-second per-position timeout and a clearer error when the engine fails to reach the requested depth.
- Terminate workers after analysis errors and avoid showing cancellation as an engine failure.
- Cap concurrent Stockfish workers at two to reduce resource pressure on typical machines.

### P0 — cache correctness
- Move from the `cr1:` cache namespace to `cr2:`.
- Include an explicit engine/cache identity, starting FEN, move sequence, depth, MultiPV and Hash settings.
- Old `cr1:` data is not reused; it remains in local storage until the browser's own storage is cleared.

### P1 — move classification boundaries
- Extract expected-points loss bands into a tested `classifyLoss()` helper.
- Keep the public loss cutoffs in one place: Best (near-zero tolerance), Excellent through 0.02, Good through 0.05, Inaccuracy through 0.10, Mistake through 0.20, then Blunder.
- Make Brilliant detection more conservative: a pawn-only material loss is no longer enough to trigger Brilliant. This is a guardrail, not a claim that Chess.com's private Brilliant detector has been replicated.

### P1 — regression tests
- Expected-points monotonicity and bounds across ratings.
- Mate-score expected-points sign handling.
- Classification threshold boundaries.
- PGN move/FEN sequence parsing.
- Basic mover-perspective classification and accuracy-summary output.

## Verification

Run `./tests/run-tests.sh` from this folder. The tests use Node.js's built-in test runner and the bundled chess.js library; no npm install is required.

## Important findings that remain unresolved

1. **CAPS2 accuracy:** the existing formula is still an approximation. The official Chess.com explanation says accuracy uses CAPS2 but does not disclose enough mathematics to reproduce it exactly. It should remain clearly identified as estimated until compared against the same games.
2. **Rating-to-expected-points curve:** published loss thresholds are now isolated and tested, but the rating-dependent logistic curve is not an exact Chess.com curve.
3. **Great / Brilliant / Miss:** their triggers are still heuristics. Further changes should be driven by a comparison dataset, not guesses.
4. **Game rating:** the current centipawn-loss estimate is a rough local metric, not Chess.com's performance-rating calculation.
5. **Engine behavior:** automated tests cover the scoring helpers and parsing, but an actual browser smoke test at depth 18 is still needed on the target PC. A worker can fail because of browser/runtime constraints not represented by Node unit tests.
6. **Next.js + TypeScript:** intentionally not started in this pass. The first goal was to harden the existing baseline and add tests before moving files into a new architecture.

## Suggested next comparison test

Use the same PGN in this app and Chess.com Game Review at the closest available analysis strength. Record per-move classifications, each side's accuracy, and the top engine line around disagreements. Include the PGN and screenshots/exported move labels if available. That comparison will give us evidence for tuning the curve and special labels.

## Reference material consulted

- Chess.com Game Review overview and feature behavior: https://support.chess.com/en/articles/8584089-how-does-game-review-work
- Chess.com Classification V2 / expected-points thresholds: https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc
- Chess.com CAPS2 accuracy overview: https://support.chess.com/en/articles/8708970-how-is-accuracy-in-analysis-determined
- Stockfish UCI protocol details (depth, score perspective, MultiPV and `bestmove` completion): https://official-stockfish.github.io/docs/stockfish-wiki/UCI-&-Commands.html
