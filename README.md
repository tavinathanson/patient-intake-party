# Intake Investigations

**Team 22 · Ship It · branch `team-22`**

Four ordinary intake fields. One wildly overqualified detective. Up to eighty unnecessary questions.

A browser-only game powered by prewritten questions and instant decision trees. Detective Maybe tries to discover your first name, reason for visit, date of birth, and specific pharmacy from **exactly 100 preset candidates in each category**. All questions, answers, and game decisions stay in your browser. No login, API key, model service, or game API is needed.

Team 22's deployment URL is **[https://team-22-intake-oop.fly.dev](https://team-22-intake-oop.fly.dev)**. Normal pushes to `team-22` run the repository's deployment workflow.

You may answer only **Yes**, **No**, or **Maybe / I don't know**. Each category gets 20 questions, including guesses. A Yes to a complete guess solves it early; ordinary clue answers only narrow the pool. Maybe spends a question without ruling candidates out. If your answer is outside the preset pool, or the detective remains stumped after question 20, ordinary input fields let you record the actual details.

The first-name round follows namesakes, nicknames, songs, stories, and questionable hunches. Alphabet ranges and letter-by-letter searches are off the table. The detective is here to entertain; getting your name right is a bonus. The pharmacy pool contains the NYC CVS demo anchor below and **99 realistic but fictional U.S. pharmacy examples**, rather than a pharmacy directory.

## Run locally

Requires Node.js 22+.

```bash
npm start
```

Open **[http://localhost:4317](http://localhost:4317)**. There are no production dependencies to install and no build step. `npm start` is a convenience static-file host; it does not run the game or receive intake answers. Questions, candidate data, artwork, and system fonts are bundled in `public/`.

The only optional setting is the port:

```bash
PORT=4318 npm start
```

The whole case is stored in the tab's `sessionStorage`, so refreshing the page restores your progress. Closing the tab ends that saved session. No intake details leave the browser. The final intake summary can be copied from the app.

To use another static host, publish the contents of `public/` as the site's root. On Fly, the convenience file host listens on `0.0.0.0` and uses `PORT=8080`; there is no backend game service to configure.

## Demo anchors

These four values are included in the preset pools:

| Category | Candidate |
|---|---|
| First name | Andrew |
| Reason for visit | GLP-1 / weight loss |
| Date of birth | 1995-05-26 |
| Pharmacy | CVS, 258 8th Ave, New York, NY 10011 |

## Verify

```bash
npm test
```

The development checks cover candidate paths and game transitions, including Maybe answers, rejected guesses, and the 20-question fallback. Browser-side game rules determine when a category is solved.

Push `team-22` normally to deploy or redeploy. The original breakout materials and shared Fly deployment instructions below are preserved for reference.

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
