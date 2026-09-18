# Intake Investigations Implementation Plan

> Execute the approved design in this session. Use subagent-driven-development for the independent UI work, with local integration and review.

**Goal:** Build and open a working local noir detective intake game powered by Codex.

**Architecture:** A Node HTTP server owns transactional game state; a CLI adapter generates structured detective turns. A dependency-free browser UI consumes the game API.

**Tech Stack:** Node 22+, node:test, HTML, CSS, JavaScript, native SVG.

**Spec:** `docs/superpowers/specs/2026-09-18-intake-investigations-design.md`

## Global Constraints

- 20 questions per category, four categories in order: name, reason, DOB, specific pharmacy.
- Only Yes / No / Maybe while questioning; fallback input after 20 unresolved answers.
- Only Yes to a complete explicit guess resolves a category early.
- Loopback-only server; real Codex backend; no production dependencies or build step.
- Schema and HTTP state contract are defined by the spec.

### Task 1: Game engine and HTTP server

Files: `src/game.mjs`, `server.mjs`, `test/game.test.mjs`, `test/server.test.mjs`, `package.json`.

- [ ] Write tests that drive 20 Maybe responses and assert fallback, drive confirmed guesses through four categories, and verify failed model calls do not advance the question count.
- [ ] Run `node --test test/game.test.mjs` and confirm missing engine behavior fails.
- [ ] Implement `createGame(generateTurn)`, `answerGame(game, turnId, answer, generateTurn)`, `submitFallback(game,value)`, `continueGame(game,generateTurn)` returning fresh state rather than mutating inputs.
- [ ] Implement `createApp({generateTurn})` returning a Node HTTP server with the spec's routes, per-game locking, origin checks, request limits, and static-file allowlist.
- [ ] Run `node --test test/*.test.mjs` and fix failures.

### Task 2: Detective Codex adapter

Files: `src/detective.mjs`, `src/turn.schema.json`, `src/detective-instructions.md`.

- [ ] Build a strict schema for `{kind,question,aside,guess}` and a prompt with the current category, question number, collected results and full transcript.
- [ ] Spawn `codex exec --ephemeral --skip-git-repo-check --sandbox read-only --output-schema … -` without a shell; feed prompt through stdin, bound output, enforce timeout, parse and validate final JSON.
- [ ] Exercise a live turn using existing local authentication and verify only game content is returned.

### Task 3: Browser experience

Files: `public/index.html`, `public/styles.css`, `public/app.js`.

- [ ] Implement the complete responsive noir interface using the exact HTTP contract in the spec. Start screen, questioning, loading/retry, fallback, between-round acknowledgement and completed summary must all work.
- [ ] Keep authoritative state on the server, preserve the opaque game ID across reload, disable answers during requests and recover expired sessions cleanly.
- [ ] Inspect the real app in the browser at desktop and mobile widths, including one live question/answer exchange.

### Task 4: Review and delivery

Files: `README.md`, `.gitignore`, docs.

- [ ] Document `npm start`, `npm test`, Codex login, optional port/model settings, local-only operation and internet requirement.
- [ ] Review backend and frontend against the spec, then run covering tests after any fixes.
- [ ] Leave the app running and open its localhost URL in Codex. Report the URL and verified behavior.
