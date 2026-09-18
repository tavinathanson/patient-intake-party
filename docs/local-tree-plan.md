# Local detective decision tree

Approved change: run the entire game in the browser with 100 local candidates in each category, and deploy through the repository's normal push workflow. Required entries: Andrew; GLP-1 / weight loss; 1995-05-26; CVS at 258 8th Ave, New York, NY 10011. Other pharmacy entries are realistic fictional examples across the US.

## Data and behavior

Each deck exports `{candidates, questions}`. Candidate: `{id, value, reveal?}`. Question: `{id, text, yesIds}`; yesIds lists the candidate IDs for which the clue is true. Every candidate has a unique ID and field value. Questions are written in character, with one answerable proposition; no alphabet ranges, spelling drills, or arbitrary candidate-index partitions. Optional subjective flavor must not falsely prune candidates. Use ordinary clear clues phrased playfully.

Replay history with `clueId` and `candidateId` to derive survivors. Yes retains the clue's yes set, No retains its complement, Maybe changes neither. A rejected explicit guess removes only that candidate; Maybe on a guess retains it but never repeats it. Choose an unused clue that splits survivors well, then explicitly guess when only one remains or no useful clues remain. Never assume a Yes to a normal clue confirms a value. Never guess excluded candidates. Contradictions and repeated Maybes still end at the existing 20-question typed fallback.

All game logic and candidate decks live under `public/src/` and are imported directly by the browser UI. The whole case is saved to the tab's `sessionStorage` and restored on refresh. No intake answers leave the browser. There are no game API calls, server-side cases, runtime Codex calls, or external font dependencies.

The contents of `public/` can be published on any static host. `npm start` provides a convenience static-file host for local use and the existing Fly deployment pipeline. It binds to `0.0.0.0`, uses the configured `PORT`, and runs on port 8080 on Fly. Normal pushes to `team-22` deploy to the expected URL, https://team-22-intake-oop.fly.dev.

## Tasks

- [x] Curate first-name deck of 100 with playful, truthful clues and Andrew included.
- [x] Curate visit-reason deck of 100 with GLP-1 / weight loss included; no advice or triage.
- [x] Build dates and 100 pharmacy entries, 99 explicitly fictional, with playful date/geographic/store clues.
- [x] Implement replay/filter/choose/guess logic and store clue IDs in game history.
- [x] Test 400 candidate paths, exact requested values, Maybe behavior, rejected guesses, unknown/contradictory paths, no duplicate questions, and the 20-question boundary.
- [x] Remove runtime Codex and document the local decision trees.
- [x] Move game logic and candidate decks into `public/src/`; call them directly from the browser and persist the case in tab `sessionStorage`.
- [x] Serve only static files, with no game API or server-side intake state.
- [ ] Push Team 22 normally with deployment enabled and confirm the deployed URL.

Candidate-path and game checks were run during the original local implementation. The browser-only migration is complete; no additional test work was performed for this handoff.
