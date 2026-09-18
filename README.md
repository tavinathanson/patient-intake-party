![Did I hear party?](did-i-hear-party.jpg)

# 🏴‍☠️ Walk the Plank

**A voice-driven patient intake, disguised as a game a pirate is making you play.**

A pirate has your chart. He won't read it — you have to *tell* him. Every answer you
give, he roars and shoves your stick figure one step further down the plank. Answer all
18 questions and you go in the water regardless. Fastest swim tops the leaderboard.

Branch: **temporary-3** · Live at `https://temporary-3-intake-oop.fly.dev`

---

## The constraint

**The patient will not fill out a form. They'll talk, but only if it's a game.**

Mango (our [eczema patient](patients/eczema)) texted the clinic and sent a photo. Nobody
replied. He'd rather not come in at all. The one thing he *does* do reliably is log his
itch in an app every couple of days — because that app gives him something back.

So: no typing, no scrolling, no 18-field wall of text. The pirate asks out loud, you
answer out loud, and the reward is a timer and a leaderboard. The intake form fills
itself in the background and lands as clean JSON for the care team.

## How it works

| Piece | What it does |
|---|---|
| `webkitSpeechRecognition` | Speech-to-text for every answer. Interim results stream into the parchment as you talk. |
| `speechSynthesis` | The pirate asks each question aloud, then the mic opens on its own. |
| Web Audio API | The roar after each answer — two detuned sawtooth growls plus band-passed noise, synthesized, no audio files. |
| Flask (`main.py`) | Holds the finished forms and the leaderboard. |

**Checkboxes became yes/no.** You can't speak a checkbox grid, so the four past-condition
boxes are individual *"Asthma? Aye or nay!"* questions. Say aye, yes, yep, sure, nay,
nope, never — the regex takes all of them. Tobacco and alcohol are three-way
(never / former / current), also matched from natural speech.

**Every question has three escape hatches:** `Say again` re-opens the mic, `Type it`
gives you a text field, `Skip` leaves the field blank and shoves you anyway. Firefox has
no `webkitSpeechRecognition`, so it falls back to typing automatically. Spacebar
re-opens the mic, because reaching for a button costs you time on the clock.

## Run it locally

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python main.py
```

Open **http://127.0.0.1:8080** in **Chrome** (`webkitSpeechRecognition` is Chrome/Safari
only) and allow the mic when asked.

> [!IMPORTANT]
> Use `127.0.0.1`, not your LAN IP. Browsers only grant mic access on `localhost` or
> HTTPS. On the deployed Fly URL it's HTTPS, so the mic works there too.

Production server, the same way Fly runs it:

```bash
.venv/bin/gunicorn main:app --bind 0.0.0.0:8080
```

Runs stay in `/tmp/ships-log.json`. Override with `INTAKE_STORE=./ships-log.json` to keep
them next to the code instead.

## API

| Route | |
|---|---|
| `GET /` | the game |
| `GET /api/leaderboard` | best run per captain, fastest first |
| `POST /api/intake` | `{username, elapsed_ms, answered, form}` → `{rank, leaderboard}` |
| `GET /api/intakes` | **every completed form, newest first — this is the part the care team reads** |
| `GET /healthz` | |

The form comes out in the same shape as [`example-intake-form.md`](example-intake-form.md),
matching the filled-in `intake-form.json` files in Fig's and Plum's folders:

```json
{
  "filled_out_by": "Mango (via Walk the Plank, voice)",
  "name": "Mango Broccoli",
  "reason_for_visit": "rash inside both elbows, three weeks, worse at night",
  "allergies": "penicillin",
  "past_conditions": ["Asthma"],
  "tobacco": "never",
  "alcohol": "occasional",
  "signature": "Mango (spoken, not signed — he was pushed)"
}
```

## Deploy

Push the branch, wait ~2 minutes, it's live. [Railpack](https://railpack.com) sees
`requirements.txt` + `main.py` and builds a Python app; the `Procfile` tells it to serve
with gunicorn.

```bash
git push -u origin temporary-3
```

Then `https://temporary-3-intake-oop.fly.dev`, or the
[Deployments page](https://github.com/tavinathanson/patient-intake-party/deployments).

**Push access first:** comment anything on
[issue #1](https://github.com/tavinathanson/patient-intake-party/issues/1) while signed in
to GitHub. A bot replies within a minute with an invite link — open it and click the green
**Accept invitation** button.

## Notes

The leaderboard disk is ephemeral — Fly wipes `/tmp` when the machine restarts, so the
board is per-machine and per-deploy. Good enough for a party; add a volume if you want it
to outlive the afternoon.

Patients in [`patients/`](patients) are synthetic and LLM-generated. Don't put anything
real in this.

---

<details>
<summary>Original repo README</summary>

## Patient Intake Party

patient intake is usually a form ([like this one](example-intake-form.md)), but the broader goal is <ins>helping the care team understand the patient's situation</ins>.

this repo has some synthetic, LLM-generated patient examples.

your mission, if you like missions: **Build something that makes patient intake better.**

Five made-up patients in [`patients/`](patients), or all on one page in [patients.md](patients.md).

| Patient | When | Photo | Time series | Proxy |
|---|---|---|---|---|
| [Mango](patients/eczema) (eczema) | before visit | rash | itch log | |
| [Kiwi](patients/strained-back) (strained back) | walk-in, blank chart | old x-ray | watch steps and sleep | |
| [Papaya](patients/glp1) (GLP-1 / weight loss) | before visit | mystery pen | weight | |
| [Fig](patients/persistent-pain) (persistent pain) | at the clinic | pill bottle | 9 visits, 5 doctors | wife |
| [Plum](patients/glaucoma) (glaucoma) | at the clinic | 2023 eye scan | eye pressure | daughter |

Images are real:

* [elbow-photo.png](patients/eczema/elbow-photo.png): [SCIN dataset](https://github.com/google-research-datasets/scin), CC BY 4.0
* [xray-2021.jpg](patients/strained-back/xray-2021.jpg): [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lateral_lumbar_x_ray.jpg), CC BY-SA 4.0
* [pen-photo.jpg](patients/glp1/pen-photo.jpg): [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Ozempic%C2%AE_3ml.jpg), CC BY-SA 4.0
* [pill-bottle.jpg](patients/persistent-pain/pill-bottle.jpg): [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Pill_Bottle_of_Assorted_Pills.JPG), CC BY-SA 3.0
* [optic-disc-2023.png](patients/glaucoma/optic-disc-2023.png): [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Optic_disc_topography,_case_1,_R,_glaucoma.png), CC BY-SA 3.0

</details>
