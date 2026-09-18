# Pop In — Intake Arcade

A dependency-free, local patient-intake arcade prototype inspired by bubble shooters.

Run `npm start`, then open http://localhost:4173. Requires Node.js 18 or later.

Point and click/tap to shoot, or use the left/right arrow keys to adjust the firing angle and Space to fire. Hold an arrow to continuously adjust aim. Aim with the pointer or angle slider; there is no dotted trajectory guide. Pointer aiming only takes over after the cursor actually moves, so a cursor resting over the playfield no longer cancels arrow-key aim. The slider and shoot button also work on touch devices. Shots bounce off the side walls; whichever balloon the projectile hits becomes the selected answer. A complete miss lets you shoot again.

Choose from five demo forms: Glaucoma, Persistent pain, GLP-1 / Weight Loss, Strained back, and Eczema. Each has age (age group followed by exact age, or 110+) and four complaint-specific questions. Each form keeps its own answers while you switch between forms. Balloons appear in a single row, with up to five answers visible. Their values cycle through the question’s valid options every 10 seconds; the countdown pauses during shots and answer confirmation. Simple mode shows all valid answers without a timer. Confirm each hit or retry. Edit collected answers, review the complete intake, and replay. Simple mode offers keyboard-accessible answer buttons. Sound is opt-in.

This is a demo, not a clinical intake integration. Answers exist only in page memory and are not saved or transmitted. There are no external dependencies or asset requests.

Shoot the dark green **Shuffle** balloon at the right end of the row to immediately draw fresh answer values and restart the 10-second countdown. It never records an answer or advances the question. Exact-age Shuffle draws from ages 0–109 and 110+, excluding all currently displayed ages. The initial age group only determines the first five exact ages shown. Other questions prioritize values not currently shown; questions with five or fewer valid options change positions. Automatic refresh uses the same selection rules.

`npm run check` checks JavaScript syntax.

Difficulty settings: **Classic** keeps the shooter stationary. **Drifter** forces side-to-side movement. **Windy** keeps the shooter still but bends every shot to the right with a steady crosswind, drawn as drifting arrows; lead your target left. **Bank Shot** adds a moving, rotating paddle that reflects shots off its current angle. **Chaos** increases shooter speed, shrinks and drifts the single balloon row, and adds two independently moving, rotating paddles. Shots reflect off their faces and ends, can chain into wall bounces, and clear after a miss or eight seconds. In every mode the arrow keys/buttons adjust the firing angle. The balloon row sits near the top of the playfield, spread as wide as the walls allow, for longer shots. Difficulty changes preserve collected and pending answers. Simple mode bypasses arcade mechanics.

The six modes rotate automatically, one per shot: Classic, Drifter, Windy, Bank Shot, Orbit, then Chaos. A playthrough takes six shots because round 01 asks twice (age group, then exact age), so every mode gets played once. The panel names the current mode and the status line reads `Mode 03 of 06 · Windy`. Tapping a mode pins it for every remaining shot; tapping the pinned mode again returns to the rotation.

**Orbit** is a separate difficulty variant: the shooter travels clockwise around the playfield perimeter while the balloons orbit clockwise on a single inner elliptical track. Arrow keys adjust the firing angle relative to the center, and mouse/touch aiming remains available. Shots can bounce off all four walls. Other modes retain a single horizontal balloon row.
