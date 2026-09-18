"""Ship's log for the Walk-the-Plank intake.

Serves the game and keeps two things: the finished intake forms (the real point)
and a leaderboard of who survived the plank fastest (the reason anyone plays).
"""

import json
import os
import threading
import time
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

ROOT = Path(__file__).parent
STORE = Path(os.environ.get("INTAKE_STORE", "/tmp/ships-log.json"))
MAX_BODY = 256 * 1024

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = MAX_BODY

_lock = threading.Lock()


def _read():
    try:
        data = json.loads(STORE.read_text())
    except (OSError, ValueError):
        return {"runs": []}
    return data if isinstance(data.get("runs"), list) else {"runs": []}


def _write(data):
    try:
        STORE.parent.mkdir(parents=True, exist_ok=True)
        STORE.write_text(json.dumps(data, indent=2))
    except OSError:
        pass  # ephemeral disk is fine; the in-file copy is a convenience, not a guarantee


def _leaderboard(runs):
    """Best run per captain, fastest first."""
    best = {}
    for run in runs:
        key = run["username"].casefold()
        prior = best.get(key)
        if prior is None or run["elapsed_ms"] < prior["elapsed_ms"]:
            best[key] = dict(run)
            best[key]["attempts"] = (prior or {}).get("attempts", 0) + 1
        else:
            prior["attempts"] = prior.get("attempts", 1) + 1
    board = sorted(best.values(), key=lambda r: r["elapsed_ms"])
    return [
        {
            "rank": i + 1,
            "username": r["username"],
            "elapsed_ms": r["elapsed_ms"],
            "answered": r.get("answered", 0),
            "attempts": r.get("attempts", 1),
            "finished_at": r.get("finished_at"),
        }
        for i, r in enumerate(board[:25])
    ]


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/api/leaderboard")
def leaderboard():
    with _lock:
        return jsonify({"leaderboard": _leaderboard(_read()["runs"])})


@app.post("/api/intake")
def submit():
    body = request.get_json(silent=True) or {}
    username = str(body.get("username") or "").strip()[:32]
    form = body.get("form")
    try:
        elapsed_ms = int(body.get("elapsed_ms"))
    except (TypeError, ValueError):
        elapsed_ms = -1

    if not username or not isinstance(form, dict) or elapsed_ms < 0:
        return jsonify({"error": "need username, elapsed_ms and a form object"}), 400

    run = {
        "username": username,
        "elapsed_ms": elapsed_ms,
        "answered": int(body.get("answered") or 0),
        "finished_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "form": form,
    }

    with _lock:
        data = _read()
        data["runs"].append(run)
        data["runs"] = data["runs"][-500:]
        _write(data)
        board = _leaderboard(data["runs"])

    rank = next(
        (row["rank"] for row in board if row["username"].casefold() == username.casefold()),
        None,
    )
    return jsonify({"rank": rank, "leaderboard": board, "form": form})


@app.get("/api/intakes")
def intakes():
    """Every completed form, newest first. This is what the care team actually reads."""
    with _lock:
        runs = _read()["runs"]
    return jsonify(
        {
            "count": len(runs),
            "intakes": [
                {
                    "username": r["username"],
                    "finished_at": r.get("finished_at"),
                    "elapsed_ms": r["elapsed_ms"],
                    "form": r.get("form", {}),
                }
                for r in reversed(runs[-50:])
            ],
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), debug=True)
