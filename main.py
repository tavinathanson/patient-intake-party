"""Bare-bones patient intake: Flask API + static frontend.

Run locally:  pip install -r requirements.txt && python main.py
Then open:    http://localhost:8080
"""

import json
import os
import sqlite3
from datetime import datetime, timezone

from flask import Flask, jsonify, request, send_from_directory

DB_PATH = os.environ.get("INTAKE_DB", "intake.db")

# Everything the paper form asks for (see example-intake-form.md).
FIELDS = [
    "filled_out_by",
    "date",
    "name",
    "date_of_birth",
    "address",
    "phone",
    "insurance",
    "member_id",
    "emergency_contact",
    "reason_for_visit",
    "current_medications",
    "allergies",
    "past_conditions",  # list
    "past_surgeries",
    "family_history",
    "tobacco",
    "alcohol",
    "drugs",
    "signature",
]

# 0-10 scales the patient screams (or drags) an answer for. Each one is stored
# as {"value": 1-10, "method": "scream"|"slider", "seconds": float|None} —
# a 7 that came from a 7.2-second scream is worth more than a 7 dragged on a
# slider, so we keep how it was measured.
RATING_FIELDS = [
    "pain",
    "itch",
    "nausea",
    "fatigue",
    "sleep_trouble",
    "stiffness",
    "breathlessness",
    "low_spirits",
    "interference",
]

METHODS = ("scream", "slider")


def clean_ratings(raw):
    """Keep only known scales with an in-range value. Silently drop the rest."""
    ratings = {}
    if not isinstance(raw, dict):
        return ratings

    for key in RATING_FIELDS:
        entry = raw.get(key)
        if not isinstance(entry, dict):
            continue
        try:
            value = int(entry.get("value"))
        except (TypeError, ValueError):
            continue
        if not 1 <= value <= 10:
            continue

        try:
            seconds = round(float(entry.get("seconds")), 1)
        except (TypeError, ValueError):
            seconds = None

        ratings[key] = {
            "value": value,
            "method": entry.get("method") if entry.get("method") in METHODS else "slider",
            "seconds": seconds,
        }
    return ratings

app = Flask(__name__, static_folder="static")


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with db() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS submissions (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   submitted_at TEXT NOT NULL,
                   payload TEXT NOT NULL
               )"""
        )


@app.get("/")
def index():
    return send_from_directory("static", "index.html")


@app.get("/api/intake")
def list_intake():
    """Everything the front desk has collected, newest first."""
    with db() as conn:
        rows = conn.execute(
            "SELECT id, submitted_at, payload FROM submissions ORDER BY id DESC"
        ).fetchall()
    return jsonify(
        [
            {"id": r["id"], "submitted_at": r["submitted_at"], **json.loads(r["payload"])}
            for r in rows
        ]
    )


@app.get("/api/intake/<int:submission_id>")
def get_intake(submission_id):
    with db() as conn:
        row = conn.execute(
            "SELECT id, submitted_at, payload FROM submissions WHERE id = ?",
            (submission_id,),
        ).fetchone()
    if row is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(
        {"id": row["id"], "submitted_at": row["submitted_at"], **json.loads(row["payload"])}
    )


@app.post("/api/intake")
def create_intake():
    body = request.get_json(silent=True) or {}

    form = {}
    for field in FIELDS:
        value = body.get(field, [] if field == "past_conditions" else "")
        if field == "past_conditions":
            form[field] = [str(v).strip() for v in value] if isinstance(value, list) else []
        else:
            form[field] = str(value).strip()

    form["ratings"] = clean_ratings(body.get("ratings"))

    # Only hard requirement: we need to know who walked in.
    if not form["name"]:
        return jsonify({"error": "name is required"}), 400

    submitted_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO submissions (submitted_at, payload) VALUES (?, ?)",
            (submitted_at, json.dumps(form)),
        )
        submission_id = cur.lastrowid

    return jsonify({"id": submission_id, "submitted_at": submitted_at, **form}), 201


init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), debug=True)
