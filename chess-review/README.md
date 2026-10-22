# Chess Review

A Chess.com-style game review that runs entirely in your browser. Engine: Stockfish 19 (lite, single-threaded WASM), run in up to two parallel web workers. The worker pool is intentionally capped to keep CPU and memory use reasonable on ordinary PCs.

## Run it

It must be served over http(s). Opening index.html straight from disk will not work, because browsers block workers and WASM on file://.

- **Locally:** `cd chess-review && python3 -m http.server 8000`, then open http://localhost:8000
- **Netlify:** drag the whole `chess-review` folder onto app.netlify.com/drop
- **GitHub Pages / Cloudflare Pages:** push the folder and enable Pages. No build step and no special headers needed.

## Using it

- Paste a PGN, or use the Chess.com tab with your username to list recent games.
- Set each side's rating (or it reads WhiteElo/BlackElo from the PGN). Labels re-score instantly when you change a rating, with no re-analysis.
- "I am" flips the board and highlights your column in the summary.
- Keys: left/right arrows step, Home/End, F flips the board, J / K jump to the next/previous key move.
- Click a number in the summary (e.g. Black's Blunders) to step through just those moves.
- Finished analyses are cached in your browser, so reopening a game is instant. The cache key is versioned by engine build, depth and relevant settings so old results are not silently reused after analysis changes.

## How the rating-aware labels work

Like Chess.com's "expected points" model, a move is judged by how much winning chance it costs, not by raw centipawns. The cut-offs are Chess.com's published ones: Excellent up to 0.02, Good up to 0.05, Inaccuracy up to 0.10, Mistake up to 0.20, Blunder above that. How an engine score maps to winning chance depends on the player's rating. A weaker player converts a +2 advantage less often, so the curve is flatter. Chess.com's exact rating curve is proprietary. This one is my approximation (a logistic curve fitted at ~2300 and scaled with rating), so labels may differ from Chess.com's, especially in close positions. Brilliant, Great and Miss are still heuristic approximations, not reproductions of Chess.com's private implementation. Brilliant detection was made more conservative so pawn-only material losses are not enough by themselves to trigger the label.

"Game rating" is a rough estimate from average centipawn loss. Treat it as a ballpark.

## Reliability changes in this version

- Engine info lines are tracked by reported search depth; completed results must include the requested depth for the principal line. MultiPV lines are compared only when they were reported at the same depth.
- Each position has a 120-second analysis timeout, in addition to the engine startup timeout. Failed workers are terminated so a stalled worker does not leave the review hanging.
- The worker pool is capped at two concurrent workers.
- Cache keys now include the engine/cache identity, starting FEN, move sequence, depth, MultiPV and hash settings. Older `cr1:` entries are left untouched but are not reused.
- Added regression tests for expected-points thresholds, score perspective assumptions, PGN parsing and summary output.

Run tests from this folder with `./tests/run-tests.sh` (Node.js required).

## Known limitations

- The rating-to-expected-points curve is an approximation. Chess.com publishes the Classification V2 loss bands, but not the exact rating curve used to map engine evaluations to expected points.
- Accuracy is still a local estimate and is not a verified implementation of Chess.com CAPS2.
- Great, Brilliant, Miss and game-rating logic remain approximations and need comparison against actual games reviewed by Chess.com.
- This remains the original single-page browser app for this audit pass. The Next.js + TypeScript migration should happen after the scoring and engine behavior are better covered by tests.

## Files

- `index.html`: UI, engine worker pool, Chess.com import
- `review.js`: scoring, classification, explanations (pure logic)
- `openings.js`: opening names (Lichess chess-openings dataset)
- `engine/`: Stockfish 19 lite single-thread (GPL-3.0, see COPYING.txt)
- `lib/chess.js`: chess.js 0.13.4 (BSD-2)
- `pieces/`: cburnett piece set (free licence, from Lichess)

## Stronger engine (optional)

Replace the two files in `engine/` with `stockfish-19-single.js` and `.wasm` from the npm package `stockfish` (about 95MB, slow first load), and change the filename in index.html. The lite engine is already far stronger than any human, so most people won't need it.
