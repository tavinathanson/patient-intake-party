![Did I hear party?](did-i-hear-party.jpg)

## Patient Intake Party

patient intake is usually a form ([like this one](example-intake-form.md)), but the broader goal is <ins>helping the care team understand the patient's situation</ins>.

this repo has some synthetic, LLM-generated patient examples.

### Running the intake form on this branch

☠ **Articles of the Ship's Surgeon** — [that form](example-intake-form.md), if the clinic were a pirate ship. Same fields, obscured behind nautical jargon, **answerable out loud**: every section has a 🎙 button that records you and dictates your answers into the fields one by one.

Flask backend (`main.py`), one static page (`static/index.html`), SQLite storage.

**Screaming your pain (section III, "The Hollerin'"):** rating a symptom 1–10 means screaming for that many seconds. A 7 is a seven-second holler. Hit 🗣, wait for *SCREAM NOW*, let it out; skull pips climb in real time and the count stops when you run out of breath (half a second of quiet ends it, 10s is the ceiling). Built on the Web Audio API — it calibrates to the room's noise floor first, so a loud waiting room doesn't register as a scream. Nine scales, each one something a clinic would normally ask you to rate by number:

| Scale | On the form | Who it's for |
|---|---|---|
| Pain (worst this week) | The Agony | everyone |
| Itching | The Itch | Mango (eczema) |
| Nausea | Green About the Gills | Papaya (GLP-1) |
| Tiredness | The Doldrums | everyone |
| Trouble sleeping | Restless Nights | Kiwi (strained back) |
| Stiffness | Rusted Joints | Kiwi (strained back) |
| Breathlessness | Short o' Wind | asthma / COPD |
| Mood | Low Spirits | Fig (persistent pain) |
| Interference with daily life | Can Ye Still Haul Rope? | everyone |

Each rating is stored with **how it was measured** — `{"value": 7, "method": "scream", "seconds": 7.2}` — because a 7 someone screamed for 7.2 seconds tells the care team more than a 7 dragged on a slider. Anything you'd rather not scream, drag the rope instead; anything that doesn't trouble you, leave blank.

**Speaking a section:** hit 🎙, and it walks the fields in order — the one it's listening for glows red. Pause between answers; each pause moves to the next field. Say "skip" to leave one blank. Dates understand "June 2nd 1943", the grog/tobacco dropdowns match spoken words, and in *Past Voyages* you can just name your curses ("creaky bones and high blood pressure") to tick the boxes. Needs Chrome or Safari — it uses the browser's built-in `SpeechRecognition`, so no API key and no audio ever leaves the page. Every field is still typeable.

```bash
pip install -r requirements.txt
python main.py
```

Open http://localhost:8080 and submit. Forms are saved to `intake.db` (created on first run, gitignored).

| Endpoint | What it does |
|---|---|
| `GET /` | the form |
| `POST /api/intake` | save a filled-out form (JSON; `name` is the only required field) |
| `GET /api/intake` | every submission, newest first |
| `GET /api/intake/<id>` | one submission |

your mission, if you like missions: **Build something that makes patient intake better.**

You don't need to know medicine. Make up whatever you need about the condition or what the care team wants. Have fun.

**Example intake form:** [example-intake-form.md](example-intake-form.md), the kind of paper form a clinic hands you at the front desk.

### tl;dr 1. Pick a constraint 2. Pick a condition 3. Build something

**1. Invent at least one constraint.** Realistic ones:
* what if they can only use audio
* what if their parent is doing this for them
* what if they have bad internet

> [!TIP]
> **🎉 Or if you're brave, invent a really silly constraint.** Some silly ideas to get you started:
> * the patient has an incredibly short attention span: you can only ask the patient 3 questions
> * the patient can only communicate using... photos? emoji? yes/no answers? 1 word at a time?
> * the patient has an extremely relevant comorbidity that he/she will not notice in a list of checkboxes because he/she doesn't remember what it's called
> * the doctor has 3 seconds to read the intake before walking in

**2. Pick a condition ([see examples with data below](#example-patients-not-required-to-use), or pick something else)**

**3. Build something.** This could mean:
* collect information differently
* use/summarize/expand information we already have
* figure out what’s missing
* help get the patient to the right next step
* etc.

Anything goes here, e.g. form, UI, API, agentic something-or-other, voice app, viz

[Live demo of a sample project](https://tic-tac-toe-intake-oop.fly.dev): the patient can only answer with tic-tac-toe grids. Source is the [tic-tac-toe branch](https://github.com/tavinathanson/patient-intake-party/tree/tic-tac-toe).

## Deploy: push a branch, get a URL

### 1. Get push access (once per person)

Comment anything on [issue #1](https://github.com/tavinathanson/patient-intake-party/issues/1) while signed in to GitHub. Within a minute a bot replies with an invite link. Open it and click the green **Accept invitation** button. (GitHub emails you the same invite.)

### 2. Make a branch

One branch per team, lowercase and dashes.

```bash
git checkout -b my-team-name
```

### 3. Build at the top level

Your files go right next to this README, not in a subfolder: `index.html`, `package.json`, `main.py`, whatever you have. Leave the `patients/` folder alone or delete it, either is fine.

No Dockerfile or config needed: [Railpack](https://railpack.com) looks at your files and figures out how to build and run them (see [deploy.yml](https://github.com/tavinathanson/patient-intake-party/blob/main/.github/workflows/deploy.yml) for the whole pipeline).

### 4. Push

```bash
git push -u origin my-team-name
```

### 5. Find your URL

About two minutes after any push, go to:

* `https://my-team-name-intake-oop.fly.dev` (your branch name plus `-intake-oop`)
* Or use the [Deployments page](https://github.com/tavinathanson/patient-intake-party/deployments), which lists every team's link

Every push redeploys.

**What runs:** a plain `index.html`, Next.js, Django, Flask, Go, whatever. Python apps: put `gunicorn` in `requirements.txt`, and for Flask name the file `main.py`.

**Example:** the [tic-tac-toe branch](https://github.com/tavinathanson/patient-intake-party/tree/tic-tac-toe) is one `index.html` at the root, live at [tic-tac-toe-intake-oop.fly.dev](https://tic-tac-toe-intake-oop.fly.dev).

## Example patients (not required to use)

Five made-up patients in [`patients/`](patients), or all on one page in [patients.md](patients.md). Each folder has two files: **what the clinic knows** and **what's actually going on**.

**These are just examples. Pick a part of one, or two, or none...whatever is fun to play with.**

| Patient | When | Photo | Time series | Proxy |
|---|---|---|---|---|
| [Mango](patients/eczema) (eczema) | before visit | rash | itch log | |
| [Kiwi](patients/strained-back) (strained back) | walk-in, blank chart | old x-ray | watch steps and sleep | |
| [Papaya](patients/glp1) (GLP-1 / weight loss) | before visit | mystery pen | weight | |
| [Fig](patients/persistent-pain) (persistent pain) | at the clinic | pill bottle | 9 visits, 5 doctors | wife |
| [Plum](patients/glaucoma) (glaucoma) | at the clinic | 2023 eye scan | eye pressure | daughter |

Fig's and Plum's folders each have a filled-out copy of the [example intake form](example-intake-form.md).

## Sources

Patients are LLM-generated. Images are real:

* [elbow-photo.png](patients/eczema/elbow-photo.png): [SCIN dataset](https://github.com/google-research-datasets/scin), CC BY 4.0
* [xray-2021.jpg](patients/strained-back/xray-2021.jpg): [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lateral_lumbar_x_ray.jpg), CC BY-SA 4.0
* [pen-photo.jpg](patients/glp1/pen-photo.jpg): [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Ozempic%C2%AE_3ml.jpg), CC BY-SA 4.0
* [pill-bottle.jpg](patients/persistent-pain/pill-bottle.jpg): [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Pill_Bottle_of_Assorted_Pills.JPG), CC BY-SA 3.0
* [optic-disc-2023.png](patients/glaucoma/optic-disc-2023.png): [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Optic_disc_topography,_case_1,_R,_glaucoma.png), CC BY-SA 3.0
