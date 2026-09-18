# PULL FOR PAIN 🎰

A slot-machine intake form for **Fig Turnip** (persistent pain), built for
[patient-intake-party](https://github.com/tavinathanson/patient-intake-party).

**Constraint:** the patient cannot type and will not read a list.
Every question is one reel, one lever, one answer at a time.

---

## Why a slot machine is actually the right idea

The repo's README suggests this silly constraint:

> the patient has an extremely relevant comorbidity that he/she will not notice
> in a list of checkboxes because he/she doesn't remember what it's called

That is **literally Fig**. On the paper form he ticked `diabetes` and skipped
`Depression / anxiety` — which is printed one row below it, and which he takes
sertraline for. Fifteen boxes, one tick, two true answers.

A reel cannot be skimmed. It shows **one option at a time, alone, in 48px type**,
in the words the patient uses ("Ever been on something for your mood or nerves?"),
and it will not advance until it gets a yes or a no.

The slot machine isn't decoration on the form. It's the fix for the exact failure
mode already sitting in his chart.

## Pull the lever

Every pull spins the **whole reel** — two full passes through every option — then
settles on one. No quiet stepping between options: if you're being asked, the reel
spun for it.

Say **yes** and the machine pays out:

- **HIT** — a yes the paper form already caught
- **JACKPOT** — a yes the paper form *missed*. Say yes to "ever been on something
  for your mood or nerves?" and that's a jackpot, because the checkbox grid never got it.

## The receipt

At the end it prints a receipt — every answer, the pull count, the jackpot count,
and a `*` beside everything the paper form never captured.

```
PAST CONDITIONS
  diabetes                     YES
  depression anxiety         YES *
...
PULLS                            9
JACKPOTS                         3
* MISSED ON PAPER                2
```

## What the care team gets

The patient pulls a lever seven times. The doctor gets one screen, on the rule
**only mismatches print, agreement is silent**:

| | |
|---|---|
| 🔴 HIGH | Codeine allergy — paper form says "none" |
| 🔴 HIGH | Sertraline stopped months ago, still Active in the chart |
| 🟠 MED | Gabapentin skipped on active days (foggy) — a dosing problem, not a treatment failure |
| 🟠 MED | Depression/anxiety never ticked on paper. Reel caught it. |
| ⚪ LOW | Not sleeping. Never asked before — there's no box for it. |
| 🟢 INFO | He wants to talk about the fence. |

## Files

```
index.html          the whole app — no build, no deps, no framework
slot-intake.json    every question, reel, and flag. edit this, not the HTML.
```

`persistent-pain-intake-form.json` is a separate thing: the original paper form
rewritten as annotated Q&A, showing where each answer goes wrong. Reference, not
part of the app.

### Reel modes

| mode | behaviour | used for |
|---|---|---|
| `spin_to_pick` | reel spins, lever stops it, keep or pull again | one-of-many |
| `spin_through_all` | walks every option, yes/no on each | the checkbox-grid replacement |
| `spin_scale` | reel of 0–10 | pain score |

## Run it

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>. It must be served over HTTP — the page fetches
`slot-intake.json`, so `file://` won't work.

## Deploy

Matches the repo's pipeline ([deploy.yml](https://github.com/tavinathanson/patient-intake-party/blob/main/.github/workflows/deploy.yml)):

- files at **repo root**, not in a subfolder ✓
- no Dockerfile, no build step — Railpack detects a static site ✓
- push any branch except `main`, get `https://<branch>-intake-oop.fly.dev` in ~2 min

```bash
git checkout -b pull-for-pain
git push -u origin pull-for-pain
```

Push access first: comment on issue #1 and accept the invite.

---

Fiction. LLM-generated parody patient. Not medical advice.
