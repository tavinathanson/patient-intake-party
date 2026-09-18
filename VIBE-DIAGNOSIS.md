# Vibe Diagnosis

**The constraint:** the only intake data we have is the patient's Instagram. That's it. No form,
no history, no questions.

**The point:** that's a terrible constraint, because a photograph is not a window into your hair
color, your habits, or your health — and photos people *post* are chosen, lit, cropped and
captioned. Any system that claims to read a condition off a grid of selfies is doing astrology
with extra steps.

So this app does exactly that, with total confidence, and then **refuses to have the last word.**
It produces four findings and hands them to the room. Humans vote. The top answer wins. The
model gets a vote of exactly zero.

## Flow

1. **Paste a link** — `instagram.com/handle`, `@handle`, or just `handle`.
2. **The "reel" plays** — a drawn selfie, a scan line, and a readout confidently measuring
   nothing (`ring light detected at 6500K, sun not consulted`).
3. **The roast + four findings** — a sassy read of the account, then four hard-coded
   "conditions", each with fake photographic evidence, the complaint the patient probably has,
   and a suggested plan.
4. **A QR code appears** — everyone in the room scans it on their phone and votes.
5. **Close voting** — the room's top answer is the verdict. Ties are allowed, and are the most
   honest outcome available.

## It is entirely fake, deliberately

Nothing touches Instagram. There is no network call, no scraping, no model. The handle is
hashed to deal 4 of 10 hard-coded findings (`CARDS` in [main.py](main.py)), so the same handle
always gives the same result — handy when you demo twice. The photo is an inline SVG drawing.

## Run it locally

```bash
cd patient-intake-party && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python main.py
```

Then open http://127.0.0.1:8080. For voting from real phones, they need to reach your laptop —
same wifi plus your LAN IP, or just deploy (below), which is easier at a hackathon.

## Deploy

Per the [README](README.md): push this branch, get `https://vibe-diagnosis-intake-oop.fly.dev`.
The QR code is built from the request host, so on Fly it points at the public URL automatically.

## Notes for whoever picks this up

- Votes live in memory in one gunicorn worker (`Procfile` pins `--workers 1`). A restart wipes
  every session; `/vote/<dead-sid>` then shows a friendly "this vote is over" page.
- One vote per browser, tracked by a random id in `localStorage`. Re-voting replaces your
  previous choice rather than stacking. It is trivially cheatable — it's a party, not an election.
- Add findings by appending to `CARDS` in [main.py](main.py); four are dealt per handle.
