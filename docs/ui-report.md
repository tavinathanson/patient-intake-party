# Intake Investigations frontend report

Implemented `public/index.html`, `public/styles.css`, `public/app.js`, and a custom native SVG portrait at `public/detective.svg`.

## Experience

- Editorial ivory, black ink, and vermilion cover with Detective Maybe, a clear Begin investigation action, and three short rules.
- API-driven question, fallback, between-round, and complete states. The active case includes a four-round evidence sidebar, 20-question meter, current question, detective aside, and exactly Yes / No / Maybe answers.
- Explicit guess turns display every canonical field from `turn.guess`, with a note that Yes confirms those values.
- Native modal witness transcript, final four-category intake summary, clipboard copy, and a new investigation action.
- Responsive layouts collapse the evidence sidebar into four progress markers on mobile. The illustrated cover remains fully composed at narrow widths.

## Interaction and resilience self-review

- Saves only the opaque game ID to localStorage; no intake values are persisted in browser storage.
- Request-in-flight guard plus disabled mutation controls prevents duplicate answers. Requests capture the visible turn ID; retries replay the same operation after transient errors.
- Restores an existing game on reload; clears expired IDs on 404. A 409 refreshes server state.
- Preserves fallback draft fields on failed submission. Native required / length / date constraints align with backend validation (500-character fields, DOB from 1900 through today).
- API/model text and collected values are escaped before HTML insertion.
- Keyboard 1 / 2 / 3 and Y / N / M shortcuts are available only during an active question, outside forms and the transcript dialog. Focus moves to each new question or phase heading; status changes are announced through a live region. The transcript supports native modal focus handling and Escape.
- Reduced-motion styles suppress animations. No typed input is rendered before the backend reports fallback.

## Verification

- `node --check public/app.js` passed (exit 0).
- Checked category names, result shapes, field names, and between/complete phase behavior against `src/game.mjs` and the approved design spec.
- Browser visual and end-to-end inspection intentionally left to the parent task as assigned. The parent needs to serve `/detective.svg` in the static allowlist.

## Notes

Google Fonts enhances display / body / mono typography with Barlow Condensed, DM Sans, and IBM Plex Mono. System fallbacks are specified, so the app does not require a font download to operate. All illustration artwork is local SVG.
