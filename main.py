import json
import os
from pathlib import Path
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
PERSISTENT_PAIN_JSON = BASE_DIR / "patients" / "persistent-pain" / "intake-form.json"

DEFAULT_CONDITIONS = [
    {"id": "arthritis", "label": "Arthritis"},
    {"id": "asthma", "label": "Asthma"},
    {"id": "cancer", "label": "Cancer"},
    {"id": "copd", "label": "COPD / emphysema"},
    {"id": "depression_anxiety", "label": "Depression / anxiety"},
    {"id": "diabetes", "label": "Diabetes"},
    {"id": "glaucoma", "label": "Glaucoma"},
    {"id": "heart_disease", "label": "Heart disease"},
    {"id": "high_blood_pressure", "label": "High blood pressure"},
    {"id": "high_cholesterol", "label": "High cholesterol"},
    {"id": "kidney_disease", "label": "Kidney disease"},
    {"id": "seizures", "label": "Seizures"},
    {"id": "stroke", "label": "Stroke"},
    {"id": "thyroid_disease", "label": "Thyroid disease"},
]


def load_persistent_pain_sample() -> dict:
    if PERSISTENT_PAIN_JSON.exists():
        try:
            with open(PERSISTENT_PAIN_JSON, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def parse_form_payload(form_data) -> dict:
    """Extract and normalize intake form fields matching intake-form.json structure."""
    # Past conditions handling
    selected_conditions = form_data.getlist("past_conditions")
    other_condition = form_data.get("past_conditions_other", "").strip()
    
    # Process conditions list
    past_conditions = []
    for cond in selected_conditions:
        cond_clean = cond.strip()
        if cond_clean and cond_clean.lower() != "other":
            past_conditions.append(cond_clean)
            
    if "other" in [c.lower() for c in selected_conditions] and other_condition:
        past_conditions.append(other_condition)
    elif other_condition and "other" not in [c.lower() for c in selected_conditions]:
        past_conditions.append(other_condition)

    # Allergies handling
    allergies_none = form_data.get("allergies_none")
    allergies_text = form_data.get("allergies", "").strip()
    if allergies_none and not allergies_text:
        allergies = "none"
    elif not allergies_text and not allergies_none:
        allergies = "none"
    else:
        allergies = allergies_text

    # Tobacco handling
    tobacco_status = form_data.get("tobacco_status", "").strip()
    tobacco_detail = form_data.get("tobacco_detail", "").strip()
    if tobacco_status == "former" and tobacco_detail:
        tobacco = f"quit ({tobacco_detail})"
    elif tobacco_status:
        tobacco = tobacco_status
    else:
        tobacco = form_data.get("tobacco", "").strip()

    # Alcohol handling
    alcohol_status = form_data.get("alcohol_status", "").strip()
    alcohol_detail = form_data.get("alcohol_detail", "").strip()
    if alcohol_status:
        alcohol = f"{alcohol_status} ({alcohol_detail})" if alcohol_detail else alcohol_status
    else:
        alcohol = form_data.get("alcohol", "").strip()

    # Recreational drugs
    drugs_status = form_data.get("drugs_status", "").strip()
    drugs_detail = form_data.get("drugs_detail", "").strip()
    if drugs_status:
        drugs = f"{drugs_status} ({drugs_detail})" if drugs_detail else drugs_status
    else:
        drugs = form_data.get("drugs", "").strip()

    # Signature
    sig = form_data.get("signature", "").strip()
    sig_relationship = form_data.get("signature_relationship", "").strip()
    if sig_relationship and sig:
        if sig_relationship.lower() not in sig.lower():
            signature = f"{sig} ({sig_relationship})"
        else:
            signature = sig
    else:
        signature = sig

    return {
        "filled_out_by": form_data.get("filled_out_by", "").strip(),
        "date": form_data.get("date", "").strip(),
        "name": form_data.get("name", "").strip(),
        "date_of_birth": form_data.get("date_of_birth", "").strip(),
        "address": form_data.get("address", "").strip(),
        "phone": form_data.get("phone", "").strip(),
        "insurance": form_data.get("insurance", "").strip(),
        "member_id": form_data.get("member_id", "").strip(),
        "emergency_contact": form_data.get("emergency_contact", "").strip(),
        "reason_for_visit": form_data.get("reason_for_visit", "").strip(),
        "current_medications": form_data.get("current_medications", "").strip(),
        "allergies": allergies,
        "past_conditions": past_conditions,
        "past_surgeries": form_data.get("past_surgeries", "").strip(),
        "family_history": form_data.get("family_history", "").strip(),
        "tobacco": tobacco,
        "alcohol": alcohol,
        "drugs": drugs,
        "signature": signature,
    }


@app.route("/")
def index():
    prefill_param = request.args.get("prefill", "")
    form_values = {}
    
    if prefill_param in ("1", "true", "sample", "fig", "persistent-pain"):
        form_values = load_persistent_pain_sample()
        is_prefilled = True
    else:
        is_prefilled = False

    return render_template(
        "form.html",
        form_data=form_values,
        conditions=DEFAULT_CONDITIONS,
        is_prefilled=is_prefilled,
    )


@app.route("/submit", methods=["POST"])
def submit():
    if request.is_json:
        payload = request.get_json()
    else:
        payload = parse_form_payload(request.form)

    # Pretty JSON string for display and download
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
