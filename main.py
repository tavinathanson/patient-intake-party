"""Patient Intake Party -- VIBE DIAGNOSIS (a joke, on purpose).

Premise: a photograph is not a window into your health. You cannot read a
person's hair color, let alone their conditions, off a grid of selfies.
This app pretends otherwise, extremely confidently, and then refuses to
commit -- it hands four equally ridiculous "findings" to a room full of
humans and makes them vote.

Nothing here touches Instagram. The link is decoration. The photo is a
drawing. The findings are hard-coded. That is the point.
"""

import hashlib
import io
import random
import time
import uuid
from threading import Lock

from flask import Flask, Response, abort, jsonify, render_template, request

app = Flask(__name__)

try:
    import qrcode
    import qrcode.image.svg
    HAVE_QR = True
except ImportError:  # still usable, people just type the URL
    HAVE_QR = False


# --------------------------------------------------------------------------
# The entire "AI". Ten hard-coded findings; four get dealt per handle.
# --------------------------------------------------------------------------

CARDS = [
    {
        "id": "golden-hour",
        "name": "Chronic Golden Hour Deficiency",
        "evidence": "61% of posts were taken in the 11 minutes before sunset. "
                    "The rest were taken at 2pm and look like grief.",
        "complaint": "“I only feel like myself between 6:41 and 6:52 PM.”",
        "plan": "Refer to an east-facing window. Follow up never.",
    },
    {
        "id": "ring-light",
        "name": "Ring Light Dependence Syndrome",
        "evidence": "Perfectly circular catchlights in 43 consecutive photos. "
                    "The sun does not do that. The sun has never done that.",
        "complaint": "“In natural light I feel unseen and slightly damp.”",
        "plan": "Taper to a lamp. Do not stop abruptly.",
    },
    {
        "id": "hydration",
        "name": "Hydration Theater",
        "evidence": "Holding a 40oz tumbler in 22 photos. Observed drinking from it: zero times.",
        "complaint": "“I carry the water. Isn't that the same thing?”",
        "plan": "Two sips, supervised.",
    },
    {
        "id": "brunch",
        "name": "Acute Brunch Reliance",
        "evidence": "Nine plates of eggs benedict, photographed from above, "
                    "all uneaten. No fork has ever entered frame.",
        "complaint": "“My weekends have a hollandaise-shaped hole in them.”",
        "plan": "Dinner. Once. As an experiment.",
    },
    {
        "id": "tilt",
        "name": "Fixed Cephalic Tilt, 14° Right",
        "evidence": "Head tilted 14° right in every single photo since 2019, "
                    "including the ones at a funeral.",
        "complaint": "“People say I look approachable and I don't know why.”",
        "plan": "Tilt left for two weeks to even it out. (Do not do this.)",
    },
    {
        "id": "beige",
        "name": "Chronic Beige",
        "evidence": "Palette entropy in the bottom 3rd percentile. "
                    "Nine shades of oat. One rogue olive.",
        "complaint": "“I bought a red thing once and returned it.”",
        "plan": "Prescribe one (1) color. Start low, go slow.",
    },
    {
        "id": "dog",
        "name": "Canine-Mediated Emotional Outsourcing",
        "evidence": "The dog appears in 71% of posts. You appear in 34%. "
                    "The dog is doing your feelings for you.",
        "complaint": "“He's the one with the personality, honestly.”",
        "plan": "Post one photo without the dog. We'll wait.",
    },
    {
        "id": "gym-mirror",
        "name": "Mirror-Adjacent Fitness Identity Drift",
        "evidence": "Mirror photos from five different gyms. Weights touched in "
                    "any of them: none. A single unclaimed kettlebell in frame 4.",
        "complaint": "“I go. I'm there. I'm literally in the building.”",
        "plan": "Pick up the kettlebell. Nothing else. Just pick it up.",
    },
    {
        "id": "captions",
        "name": "Seasonal Affective Caption Disorder",
        "evidence": "Captions have shortened by 4 characters per week since October. "
                    "Last three posts: “yeah”, “.”, and a single leaf emoji.",
        "complaint": "“I ran out of things to say around Thanksgiving.”",
        "plan": "One adjective per post until March.",
    },
    {
        "id": "airport",
        "name": "Terminal Terminal Syndrome",
        "evidence": "Six airport stories, zero destination photos. "
                    "You are documenting the hallway, not the trip.",
        "complaint": "“The going is the good part. The being there is a lot.”",
        "plan": "Leave the airport. That's the whole plan.",
    },
]

ROAST_OPENERS = [
    "Okay. I have looked at @{h}'s grid for 0.4 seconds and I have opinions.",
    "I scanned @{h}'s entire feed. I need to sit down.",
    "@{h}. Nine hundred photos. One facial expression.",
    "I've reviewed @{h}'s account and I want to start by saying: wow.",
]

ROAST_MIDDLES = [
    "The lighting is consistent, the vibes are not, and something is happening with the captions that I am not qualified to name.",
    "Every photo is the same three feet of apartment and one very tired houseplant.",
    "You have posted the same sunset four times and captioned it differently each time, which is either art or a cry for help.",
    "There's a lot of standing-near-things energy here. Near a wall. Near a car. Near a body of water you did not enter.",
]

ROAST_CLOSERS = [
    "From this, and only this, I have confidently determined what is medically wrong with you. I should not be allowed to do that.",
    "Based purely on pixels, here is my diagnosis. There is no reason this should work. It does not work.",
    "I have never met you, taken your history, or asked you a single question. Here's what's wrong with you anyway.",
]

TAGLINES = [
    "Confidence: extremely high. Basis: none.",
    "Accuracy: unmeasured. Certainty: total.",
    "Trained on vibes. Validated on nothing.",
]


def normalize_handle(raw):
    """Pull something handle-shaped out of whatever got pasted."""
    s = (raw or "").strip()
    for junk in ("https://", "http://", "www.", "instagram.com/", "instagr.am/"):
        if s.lower().startswith(junk):
            s = s[len(junk):]
    if "instagram.com/" in s.lower():
        s = s.lower().split("instagram.com/", 1)[1]
    s = s.split("?")[0].split("#")[0].strip("/@ ")
    s = s.split("/")[0]
    s = "".join(c for c in s if c.isalnum() or c in "._")
    return s[:30] or "someone"


def deal(handle):
    """Same handle, same four findings -- so a demo can be re-run on stage."""
    seed = int(hashlib.sha256(handle.lower().encode()).hexdigest()[:16], 16)
    rng = random.Random(seed)
    cards = rng.sample(CARDS, 4)
    out = []
    for i, c in enumerate(cards):
        card = dict(c)
        card["confidence"] = rng.choice([91, 94, 96, 97, 99])
        card["rank"] = i + 1
        out.append(card)
    roast = " ".join([
        rng.choice(ROAST_OPENERS).format(h=handle),
        rng.choice(ROAST_MIDDLES),
        rng.choice(ROAST_CLOSERS),
    ])
    return out, roast, rng.choice(TAGLINES)


# --------------------------------------------------------------------------
# Sessions live in memory. One fly machine, one party, no database.
# --------------------------------------------------------------------------

SESSIONS = {}
LOCK = Lock()
MAX_SESSIONS = 200


def get_session(sid):
    s = SESSIONS.get(sid)
    if s is None:
        abort(404, description="That vote has ended or the server restarted.")
    return s


def tally(s):
    counts = {c["id"]: 0 for c in s["cards"]}
    for choice in s["voters"].values():
        if choice in counts:
            counts[choice] += 1
    return counts


def winners(s):
    counts = tally(s)
    top = max(counts.values()) if counts else 0
    if top == 0:
        return []
    return [cid for cid, n in counts.items() if n == top]


def public(s):
    counts = tally(s)
    return {
        "handle": s["handle"],
        "closed": s["closed"],
        "total": len(s["voters"]),
        "counts": counts,
        "winners": winners(s) if s["closed"] else [],
        "cards": s["cards"],
    }


@app.errorhandler(404)
def not_found(e):
    """The phone page parses JSON, so /api/* must never answer with HTML."""
    msg = getattr(e, "description", "Not found.")
    if request.path.startswith("/api/") or request.path.startswith("/qr/"):
        return jsonify({"ok": False, "error": msg}), 404
    return render_template("gone.html", msg=msg), 404


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/session")
def create_session():
    handle = normalize_handle((request.json or {}).get("link"))
    cards, roast, tagline = deal(handle)
    sid = uuid.uuid4().hex[:8]
    with LOCK:
        if len(SESSIONS) >= MAX_SESSIONS:  # drop the oldest party
            oldest = min(SESSIONS, key=lambda k: SESSIONS[k]["created"])
            SESSIONS.pop(oldest, None)
        SESSIONS[sid] = {
            "handle": handle,
            "cards": cards,
            "roast": roast,
            "tagline": tagline,
            "voters": {},
            "closed": False,
            "created": time.time(),
        }
    return jsonify({
        "sid": sid,
        "handle": handle,
        "cards": cards,
        "roast": roast,
        "tagline": tagline,
        "vote_url": vote_url(sid),
        "qr": f"/qr/{sid}.svg" if HAVE_QR else None,
    })


@app.get("/api/results/<sid>")
def results(sid):
    return jsonify(public(get_session(sid)))


@app.post("/api/close/<sid>")
def close(sid):
    s = get_session(sid)
    s["closed"] = True
    return jsonify(public(s))


@app.post("/api/reopen/<sid>")
def reopen(sid):
    s = get_session(sid)
    s["closed"] = False
    return jsonify(public(s))


@app.get("/vote/<sid>")
def vote_page(sid):
    s = get_session(sid)
    return render_template("vote.html", sid=sid, handle=s["handle"], cards=s["cards"])


@app.post("/api/vote/<sid>")
def cast_vote(sid):
    s = get_session(sid)
    if s["closed"]:
        return jsonify({"ok": False, "error": "Voting is closed. The room has spoken."}), 409
    body = request.json or {}
    voter = str(body.get("voter") or "")[:64]
    choice = str(body.get("choice") or "")
    if not voter:
        return jsonify({"ok": False, "error": "missing voter id"}), 400
    if choice not in {c["id"] for c in s["cards"]}:
        return jsonify({"ok": False, "error": "unknown option"}), 400
    with LOCK:
        s["voters"][voter] = choice  # re-voting replaces, never stacks
    return jsonify({"ok": True, "choice": choice, "total": len(s["voters"])})


def vote_url(sid):
    return request.url_root.rstrip("/") + "/vote/" + sid


@app.get("/qr/<sid>.svg")
def qr_svg(sid):
    get_session(sid)
    if not HAVE_QR:
        abort(404)
    img = qrcode.make(
        vote_url(sid),
        image_factory=qrcode.image.svg.SvgPathImage,
        box_size=12,
        border=2,
    )
    buf = io.BytesIO()
    img.save(buf)
    return Response(buf.getvalue(), mimetype="image/svg+xml",
                    headers={"Cache-Control": "no-store"})


if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), debug=True)
