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

## Team projects

One link per branch:

* [23andme](https://23andme-intake-oop.fly.dev)
* [bad-vibes-intake](https://bad-vibes-intake-intake-oop.fly.dev)
* [bk610-test](https://bk610-test-intake-oop.fly.dev)
* [black-rabbit](https://black-rabbit-intake-oop.fly.dev)
* [chris-look-test](https://chris-look-test-intake-oop.fly.dev)
* [dino-intake2](https://dino-intake2-intake-oop.fly.dev)
* [down-under](https://down-under-intake-oop.fly.dev)
* [dragon](https://dragon-intake-oop.fly.dev)
* [elo-3000-d5](https://elo-3000-d5-intake-oop.fly.dev)
* [feature/macarena](https://feature-macarena-intake-oop.fly.dev)
* [fifty-percent-chris](https://fifty-percent-chris-intake-oop.fly.dev)
* [fill-or-die](https://fill-or-die-intake-oop.fly.dev)
* [glp1-small-dose-big-goals](https://glp1-small-dose-big-intake-oop.fly.dev)
* [hot-or-not](https://hot-or-not-intake-oop.fly.dev)
* [intake-at-the-oche](https://intake-at-the-oche-intake-oop.fly.dev)
* [macarena](https://macarena-intake-oop.fly.dev)
* [super-intake-bros](https://super-intake-bros-intake-oop.fly.dev)
* [team-20-pirates](https://team-20-pirates-intake-oop.fly.dev)
* [team-21](https://team-21-intake-oop.fly.dev)
* [team-22](https://team-22-intake-oop.fly.dev)
* [team-24](https://team-24-intake-oop.fly.dev)
* [team-5-gone-fishin](https://team-5-gone-fishin-intake-oop.fly.dev)
* [team-6](https://team-6-intake-oop.fly.dev)
* [team-make-no-mistakes](https://team-make-no-mistak-intake-oop.fly.dev)
* [team-winner](https://team-winner-intake-oop.fly.dev)
* [team3](https://team3-intake-oop.fly.dev)
* [tic-tac-toe](https://tic-tac-toe-intake-oop.fly.dev)
* [vibe-diagnosis](https://vibe-diagnosis-intake-oop.fly.dev)

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
