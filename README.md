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

A reel cannot be skimmed. It shows options **one at a time, alone, in big type**,
worded the way the patient would say them. `Depression / anxiety` is a phrase Fig
skims past. *"Something for my mood or nerves"* is a phrase he answers.

**One pull, one answer, then the form moves on.** It asks every question on the
clinic's real paper form — all 19 fields of
[`intake-form.json`](https://github.com/tavinathanson/patient-intake-party/blob/main/patients/persistent-pain/intake-form.json) —
plus three the form forgot. Because each field gets exactly one pull, each one has
to be the *right* question:

| instead of asking | it asks |
|---|---|
| tick all 15 conditions that apply | "Besides the diabetes — what else are you being treated for?" |
| list every medication you take | "Which one have you **stopped**, or skip?" |

That second one is the whole trick. "What are you taking?" gets a list that
matches the chart. "Which did you stop?" gets the sertraline — the one fact
nobody at the clinic has.

### Coverage

All 19 fields of the paper form, in form order. `name`, `date_of_birth`,
`address` and `phone` are confirmed together in one pull (a lever can't spell a
surname, and the clinic already holds them); `date` is stamped automatically.

Three questions are **not** on the paper form and are marked ★ — a pain score
(the form has none, on a form handed to a man with 18 months of pain visits),
how he's sleeping, and what he actually wants to talk about.

## Pull the lever

Every pull spins the **whole reel** — two full passes through every option — then
settles on one. That landing is the answer. Keep it, or pull again.

When it lands on something the chart cares about, the machine pays out:

- **HIT** — an answer the paper form already caught
- **JACKPOT** — an answer the paper form *missed*. Landing on "something for my
  mood or nerves", or on the pill he quietly stopped, is a jackpot.

## The receipt

At the end it prints a receipt — every answer, the pull count, the jackpot count,
and a `*` beside everything the paper form never captured.

```
* PAST CONDITIONS
  depression anxiety

* MEDICATIONS TAKEN
  sertraline
...
PULLS                            7
JACKPOTS                         2
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
| `spin_to_pick` | reel spins through every option, lands on one | every question |
| `spin_scale` | reel of 0–10 | pain score |

One pull, one answer, always.

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
