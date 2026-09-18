# Intake Investigations

Approved direction: a deliberately absurd local patient intake guessing game, hosted by a noir detective who becomes increasingly desperate.

Team 22 update: collect first name only. Name questions prioritize fun associations, namesakes, nicknames and everyday experiences. No alphabetical ranges, binary search or letter-by-letter interrogation. All UI, schema and collected values omit last name.

## Experience

Four rounds in order: first name only, primary reason for visit, date of birth, and a specific pharmacy including location. Each round permits at most 20 questions, including explicit guesses. Only Yes, No, and Maybe / I don't know are available while questioning. Maybe consumes a question. A Yes to an explicit, complete guess solves the round; an ordinary Yes never does. A No or Maybe at question 20 reveals ordinary input fields. Successfully confirmed guesses on question 20 still count. The app, not the model, enforces these rules.

The UI is a warm paper-and-ink case file with vermilion accents, an investigator portrait drawn in SVG, a question counter, case progress, collected facts and a witness transcript. The detective's spoken aside is short and theatrical; each question must remain answerable with the three choices. A between-round card acknowledges the result and advances on a button. The ending shows all four collected categories and offers copying the final intake and starting over.

## Local architecture

Use Node.js 22+ built-ins, plain browser JavaScript, HTML, CSS and SVG. No production package dependencies or build step. A loopback-only HTTP server serves public files and owns in-memory games. The browser stores only the opaque game ID in localStorage for reloads. A server restart expires games cleanly.

Each model turn runs the installed Codex CLI with JSON Schema output, existing CLI authentication, read-only sandbox, no interactive approvals, and irrelevant tools disabled. Supply the detective prompt, current category and complete game transcript each time using stdin. Use a separate ephemeral Codex session per response so the server's explicit transcript is authoritative and there is no dependency on desktop conversation IDs. The model uses OpenAI over the network. Default model selection follows the CLI default; CODEX_MODEL can override it.

Model output contains kind (question or guess), question, aside, and a guess object containing firstName, reason, dob, pharmacyName, pharmacyAddress (empty strings for unrelated fields). Validate responses. Never confirm a guess without the user's Yes. Guesses require every field for the active category and DOB must be a real past or present ISO date.

All mutations are serialized per game and transactional. Failed model calls preserve the current turn so retrying an answer is safe. Turn IDs reject double clicks and stale requests. A bounded process timeout, output-size limit and clear error recovery prevent hangs. Normal fallback input is available only at the category's question limit. No database, deployment or remote publishing.

## HTTP contract

All success responses are `{game}` except health, and errors are `{error}`.

- `GET /api/health` → `{ok:true, backend:"codex"}`.
- `POST /api/games` with `{}` starts the first question.
- `GET /api/games/:id` restores a game.
- `POST /api/games/:id/answer` with `{turnId, answer:"yes"|"no"|"maybe"}` answers the visible question.
- `POST /api/games/:id/fallback` with `{value:{...active category fields}}` records normal input.
- `POST /api/games/:id/continue` with `{}` starts the next round.

Game: `{id, categoryIndex, phase, asked, turn, history, results}`. Phase is `question`, `fallback`, `between`, or `complete`. `asked` is the visible question number (1..20), reset each round. Turn is `{id,kind,question,aside,guess}` or null. History entries are `{category,number,question,answer,aside}`. Results is an object keyed by `name`, `reason`, `dob`, `pharmacy`; each entry is `{value,method:"deduced"|"confessed",questions}`. A final-round resolution sets phase complete. Intermediate resolutions set between. Category field mappings: name→firstName; reason→reason; dob→dob; pharmacy→pharmacyName,pharmacyAddress.

## Verification

Exercise the real engine against deterministic model fixtures: 20 Maybe answers reach fallback, question 20 can solve, ordinary Yes cannot solve, partial guesses rejected, no double-counting on retries, date/name/pharmacy validation, all four rounds complete. HTTP tests cover static files, malformed inputs, unknown games and cross-origin requests. Run a live Codex exchange and inspect desktop/mobile UI in the browser.
