import json
import os
import re
import urllib.parse
import urllib.request
from functools import lru_cache
from pathlib import Path
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
PERSISTENT_PAIN_JSON = BASE_DIR / "patients" / "persistent-pain" / "intake-form.json"

BIRTHSTONES = [
    {"month": "01", "name": "Garnet"},
    {"month": "02", "name": "Amethyst"},
    {"month": "03", "name": "Aquamarine"},
    {"month": "04", "name": "Diamond"},
    {"month": "05", "name": "Emerald"},
    {"month": "06", "name": "Pearl / Alexandrite"},
    {"month": "07", "name": "Ruby"},
    {"month": "08", "name": "Peridot / Spinel"},
    {"month": "09", "name": "Sapphire"},
    {"month": "10", "name": "Opal / Tourmaline"},
    {"month": "11", "name": "Topaz / Citrine"},
    {"month": "12", "name": "Turquoise / Tanzanite"},
]

INSURERS = [
    {
        "id": "bluecross",
        "value": "BlueCross, through my work",
        "label": "BlueCross",
        "logo": "logos/bluecross.svg",
    },
    {
        "id": "united",
        "value": "UnitedHealthcare",
        "label": "UnitedHealthcare",
        "logo": "logos/united.svg",
    },
    {
        "id": "aetna",
        "value": "Aetna",
        "label": "Aetna",
        "logo": "logos/aetna.svg",
    },
    {
        "id": "cigna",
        "value": "Cigna",
        "label": "Cigna",
        "logo": "logos/cigna.svg",
    },
    {
        "id": "medicare",
        "value": "Medicare",
        "label": "Medicare",
        "logo": "logos/medicare.svg",
    },
]

# Multilingual translated conditions
DEFAULT_CONDITIONS = [
    {"id": "arthritis", "label": "Gelenkentzündung (Arthritis)", "lang": "German"},
    {"id": "asthma", "label": "Άσθμα (Asthma)", "lang": "Greek"},
    {"id": "cancer", "label": "癌 (Cancer)", "lang": "Japanese"},
    {"id": "copd", "label": "Emphysème pulmonaire (COPD)", "lang": "French"},
    {"id": "depression_anxiety", "label": "Depresión / Ansiedad", "lang": "Spanish"},
    {"id": "diabetes", "label": "Sockersjuka (Diabetes)", "lang": "Swedish"},
    {"id": "glaucoma", "label": "녹내장 (Glaucoma)", "lang": "Korean"},
    {"id": "heart_disease", "label": "Болезнь сердца (Heart Disease)", "lang": "Russian"},
    {"id": "high_blood_pressure", "label": "Høyt blodtrykk (Hypertension)", "lang": "Norwegian"},
    {"id": "high_cholesterol", "label": "Wysoki cholesterol (Cholesterol)", "lang": "Polish"},
    {"id": "kidney_disease", "label": "Bệnh thận (Kidney Disease)", "lang": "Vietnamese"},
    {"id": "seizures", "label": "Kohtaukset (Seizures)", "lang": "Finnish"},
    {"id": "stroke", "label": "中风 (Stroke)", "lang": "Chinese"},
    {"id": "thyroid_disease", "label": "Tiroid hastalığı (Thyroid)", "lang": "Turkish"},
]

BOOK_FALLBACK_CACHE = {
    "dune": {"title": "Dune", "author": "Frank Herbert", "year": 1965},
    "1984": {"title": "Nineteen Eighty-Four", "author": "George Orwell", "year": 1949},
    "to kill a mockingbird": {"title": "To Kill a Mockingbird", "author": "Harper Lee", "year": 1960},
    "the great gatsby": {"title": "The Great Gatsby", "author": "F. Scott Fitzgerald", "year": 1925},
    "the catcher in the rye": {"title": "The Catcher in the Rye", "author": "J.D. Salinger", "year": 1951},
    "the hobbit": {"title": "The Hobbit", "author": "J.R.R. Tolkien", "year": 1937},
}

MEDICATION_SYLLABLE_CACHE = {
    "metformin": 3,
    "meloxicam": 4,
    "tylenol": 3,
    "gabapentin": 4,
    "aspirin": 3,
    "ibuprofen": 4,
    "naproxen": 3,
    "sertraline": 3,
    "cyclobenzaprine": 5,
}


@lru_cache(maxsize=256)
def lookup_book_year(query_str: str) -> dict:
    if not query_str or not query_str.strip():
        return {"found": False, "error": "No book title provided"}

    normalized = query_str.strip().lower()
    if normalized in BOOK_FALLBACK_CACHE:
        res = dict(BOOK_FALLBACK_CACHE[normalized])
        res["found"] = True
        return res

    encoded_query = urllib.parse.quote(query_str.strip())
    url = f"https://openlibrary.org/search.json?q={encoded_query}&fields=title,first_publish_year,author_name,edition_count&limit=10"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "PatientIntakeParty/1.0 (contact@intakeparty.dev)"},
    )

    try:
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode("utf-8"))
            docs = [d for d in data.get("docs", []) if d.get("first_publish_year")]
            if docs:
                docs.sort(key=lambda d: d.get("edition_count", 0), reverse=True)
                doc = docs[0]
                return {
                    "title": doc.get("title"),
                    "author": (doc.get("author_name") or ["Unknown"])[0],
                    "year": int(doc.get("first_publish_year")),
                    "found": True,
                }
    except Exception as e:
        for k, v in BOOK_FALLBACK_CACHE.items():
            if k in normalized or normalized in k:
                res = dict(v)
                res["found"] = True
                return res
        return {"found": False, "error": f"Lookup failed: {str(e)}"}

    return {"found": False, "error": f"No publication year found for '{query_str}'"}


def format_phone_digits(digits_str: str) -> str:
    digits = re.sub(r"\D", "", digits_str)
    if len(digits) == 7:
        return f"{digits[:3]}-{digits[3:]}"
    elif len(digits) == 10:
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    return digits_str


def clean_word(w: str) -> str:
    return re.sub(r"[^\w]", "", w.lower().strip())


@lru_cache(maxsize=1024)
def count_word_syllables(word: str) -> int:
    clean = re.sub(r"[^a-zA-Z]", "", word.lower())
    if not clean:
        return 0
    if clean in MEDICATION_SYLLABLE_CACHE:
        return MEDICATION_SYLLABLE_CACHE[clean]

    url = f"https://api.datamuse.com/words?sp={urllib.parse.quote(clean)}&qe=sp&md=s&max=1"
    req = urllib.request.Request(url, headers={"User-Agent": "PatientIntakeParty/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=2) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and data[0].get("word", "").lower() == clean and "numSyllables" in data[0]:
                return data[0]["numSyllables"]
    except Exception:
        pass

    if len(clean) <= 3:
        return 1
    w = re.sub(r"(?:[^laeiouy]|ed|es|e)$", "", clean)
    w = re.sub(r"^y", "", w)
    matches = re.findall(r"[aeiouy]{1,2}", w)
    return max(1, len(matches))


def check_haiku_structure(text: str) -> dict:
    lines = [l.strip() for l in text.strip().split("\n") if l.strip()]
    if len(lines) != 3:
        return {
            "valid": False,
            "message": f"Haiku must have 3 lines (currently {len(lines)})",
            "counts": [],
        }

    counts = []
    for line in lines:
        words = line.split()
        line_count = sum(count_word_syllables(w) for w in words)
        counts.append(line_count)

    expected = [5, 7, 5]
    if counts == expected:
        return {
            "valid": True,
            "message": f"✓ Perfect Haiku! (5-7-5 syllables)",
            "counts": counts,
        }
    else:
        return {
            "valid": False,
            "message": f"Line syllables: {counts[0]}/5, {counts[1]}/7, {counts[2]}/5",
            "counts": counts,
        }


@lru_cache(maxsize=512)
def check_rhyme_words(w1: str, w2: str) -> dict:
    w1_clean = clean_word(w1)
    w2_clean = clean_word(w2)
    if not w1_clean or not w2_clean:
        return {"valid": False, "message": "Missing words to check rhyme"}
    if w1_clean == w2_clean:
        return {"valid": False, "message": f'Cannot rhyme "{w1_clean}" with itself'}

    url = f"https://api.datamuse.com/words?rel_rhy={urllib.parse.quote(w1_clean)}"
    req = urllib.request.Request(url, headers={"User-Agent": "PatientIntakeParty/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            rhymes = [clean_word(item["word"]) for item in json.loads(resp.read().decode("utf-8"))]
            if w2_clean in rhymes:
                return {"valid": True, "message": f'✓ Verified rhyme: "{w1_clean}" and "{w2_clean}"'}
    except Exception:
        pass

    if len(w1_clean) >= 3 and len(w2_clean) >= 3 and w1_clean[-3:] == w2_clean[-3:]:
        return {"valid": True, "message": f'✓ Phonetic rhyme: "{w1_clean}" and "{w2_clean}"'}

    return {"valid": False, "message": f'"{w1_clean}" and "{w2_clean}" do not appear to rhyme'}


def load_persistent_pain_sample() -> dict:
    if PERSISTENT_PAIN_JSON.exists():
        try:
            with open(PERSISTENT_PAIN_JSON, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def parse_form_payload(form_data) -> dict:
    # 1. Cursed Date of Birth
    dob_month = form_data.get("dob_birthstone", "").strip()
    dob_day = form_data.get("dob_day", "").strip()
    dob_book = form_data.get("dob_book", "").strip()
    dob_year_raw = form_data.get("dob_year", "").strip()

    if not dob_year_raw and dob_book:
        lookup = lookup_book_year(dob_book)
        if lookup.get("found"):
            dob_year_raw = str(lookup.get("year"))

    if dob_year_raw and dob_month and dob_day:
        try:
            year_int = int(dob_year_raw)
            month_int = int(dob_month)
            day_int = int(dob_day)
            date_of_birth = f"{year_int:04d}-{month_int:02d}-{day_int:02d}"
        except ValueError:
            date_of_birth = form_data.get("date_of_birth", "").strip()
    else:
        date_of_birth = form_data.get("date_of_birth", "").strip()

    # 2. Cursed Phone Number
    f1 = form_data.get("phone_factor_1", "").strip()
    f2 = form_data.get("phone_factor_2", "").strip()
    if f1 and f2:
        try:
            product = int(f1) * int(f2)
            phone = format_phone_digits(str(product))
        except ValueError:
            phone = form_data.get("phone", "").strip()
    else:
        phone = form_data.get("phone", "").strip()

    # 3. Past conditions
    selected_conditions = form_data.getlist("past_conditions")
    other_condition = form_data.get("past_conditions_other", "").strip()
    
    past_conditions = []
    for cond in selected_conditions:
        cond_clean = cond.strip()
        if cond_clean and cond_clean.lower() != "other":
            past_conditions.append(cond_clean)
            
    if "other" in [c.lower() for c in selected_conditions] and other_condition:
        past_conditions.append(other_condition)
    elif other_condition and "other" not in [c.lower() for c in selected_conditions]:
        past_conditions.append(other_condition)

    # 4. Past surgeries (45 char limit enforced)
    past_surgeries = form_data.get("past_surgeries", "").strip()[:45]

    return {
        "filled_out_by": form_data.get("filled_out_by", "").strip(),
        "date": form_data.get("date", "").strip(),
        "name": form_data.get("name", "").strip(),
        "date_of_birth": date_of_birth,
        "address": form_data.get("address", "").strip(),
        "phone": phone,
        "insurance": form_data.get("insurance", "").strip(),
        "member_id": form_data.get("member_id", "").strip(),
        "emergency_contact": form_data.get("emergency_contact", "").strip(),
        "reason_for_visit": form_data.get("reason_for_visit", "").strip(),
        "current_medications": form_data.get("current_medications", "").strip(),
        "allergies": form_data.get("allergies", "").strip() or "none",
        "past_conditions": past_conditions,
        "past_surgeries": past_surgeries,
        "family_history": form_data.get("family_history", "").strip(),
        "tobacco": form_data.get("tobacco", "").strip(),
        "alcohol": form_data.get("alcohol", "").strip(),
        "drugs": form_data.get("drugs", "").strip(),
        "signature": form_data.get("signature", "").strip(),
    }


@app.route("/")
def index():
    prefill_param = request.args.get("prefill", "")
    form_values = {}
    cursed_dob = {}
    cursed_phone = {}
    is_dad = False
    is_prefilled = False
    
    if prefill_param in ("1", "true", "sample", "fig", "persistent-pain"):
        form_values = load_persistent_pain_sample()
        is_prefilled = True
        
        dob = form_values.get("date_of_birth", "")
        if dob and len(dob.split("-")) == 3:
            y, m, d = dob.split("-")
            cursed_dob = {
                "month": m,
                "day": int(d),
                "year": y,
                "book": "Dune",
            }

        cursed_phone = {
            "factor_1": 17,
            "factor_2": 326479,
        }

        form_values["reason_for_visit"] = "I have persistent pain\nDriving my mind insane"
        form_values["current_medications"] = "Metformin each day\nMeloxicam, Tylenol\nNerve pill for my pain"
        is_dad = False

    return render_template(
        "form.html",
        form_data=form_values,
        conditions=DEFAULT_CONDITIONS,
        birthstones=BIRTHSTONES,
        insurers=INSURERS,
        cursed_dob=cursed_dob,
        cursed_phone=cursed_phone,
        is_dad=is_dad,
        is_prefilled=is_prefilled,
    )


@app.route("/api/lookup-book")
def api_lookup_book():
    query = request.args.get("title", "")
    result = lookup_book_year(query)
    return jsonify(result)


@app.route("/api/check-rhyme")
def api_check_rhyme():
    text = request.args.get("text", "")
    lines = [l.strip() for l in text.strip().split("\n") if l.strip()]
    if len(lines) < 2:
        return jsonify({"valid": False, "message": "Must have at least 2 lines to rhyme"})
    
    w1 = lines[0].split()[-1]
    w2 = lines[1].split()[-1]
    res = check_rhyme_words(w1, w2)
    return jsonify(res)


@app.route("/api/check-haiku")
def api_check_haiku():
    text = request.args.get("text", "")
    res = check_haiku_structure(text)
    return jsonify(res)


@app.route("/submit", methods=["POST"])
def submit():
    if request.is_json:
        payload = request.get_json()
    else:
        payload = parse_form_payload(request.form)

    json_output = json.dumps(payload, indent=2)

    if request.headers.get("Accept") == "application/json" or request.args.get("format") == "json":
        return jsonify(payload)

    return render_template("submission.html", data=payload, json_output=json_output)


@app.route("/api/sample")
def sample_api():
    data = load_persistent_pain_sample()
    return jsonify(data)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=True)
