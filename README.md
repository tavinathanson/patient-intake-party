# Intake Investigations

**Team 22 · Ship It · branch `team-22`**

Four ordinary intake fields. One wildly overqualified detective. Up to eighty unnecessary questions.

A local browser game powered by your installed Codex CLI. Detective Maybe tries to discover your first name, reason for visit, date of birth, and specific pharmacy. You may answer only **Yes**, **No**, or **Maybe / I don't know**. Each category gets 20 questions. A confirmed complete guess solves it early; otherwise, the detective reluctantly produces a normal input field.

The first-name round follows namesakes, nicknames, songs, stories, and questionable hunches. Alphabet ranges and letter-by-letter searches are off the table. The detective is here to entertain; getting your name right is a bonus.

## Run locally

Requires Node.js 22+ and [Codex CLI](https://learn.chatgpt.com/docs/cli) installed and signed in.

```bash
codex login status
# If needed:
codex login

npm start
```

Open **http://localhost:4317**. There are no production dependencies to install and no build step. The server binds only to `127.0.0.1`; this version is for a local demo. The model runs through OpenAI, so an internet connection and available Codex usage are required.

Optional settings:

```bash
PORT=4318 npm start
CODEX_MODEL=gpt-5.6-sol npm start
# For a CLI executable not on PATH:
CODEX_BIN=/absolute/path/to/codex npm start
```

`CODEX_TIMEOUT_MS` controls the per-turn deadline (default 90000). Unless `CODEX_MODEL` is supplied, Codex chooses its default model. The game ignores personal Codex configuration, disables unrelated tools, uses a read-only sandbox, and sends the explicit game transcript on each ephemeral model call. It uses existing Codex authentication; it never reads or copies credentials itself.

Games live in server memory. Reloading the page restores the current case by its opaque ID; restarting the server expires cases. Normal field values are collected only after a failed round. The final intake summary can be copied from the app. The original breakout materials below are preserved; its Fly deployment flow is separate from this local Codex setup.

Team 22's initial source push skips CI because this implementation runs locally. The shared Fly workflow cannot use your computer's Codex login; use the local URL above for the demo.

## Verify

```bash
npm test
```

Tests exercise the real game transitions and HTTP endpoints with deterministic model responses. Live model output is checked separately because answers are nondeterministic. The game rules, rather than model confidence, determine when a category is solved and when fallback becomes available.

---

![Did I hear party?](did-i-hear-party.jpg)

## Patient Intake Party

patient intake is usually a form ([like this one](example-intake-form.md)), but the broader goal is <ins>helping the care team understand the patient's situation</ins>.

this repo has some synthetic, LLM-generated patient examples.

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
