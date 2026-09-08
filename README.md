## Patient Intake Party

patient intake is usually a form, but the broader goal is helping the care team understand the patient's situation.

this repo has some synthetic, LLM-generated patient examples.

your mission, if you like missions: **Build something that makes patient intake better.**

This could mean:
* collect information differently
* use/summarize/expand information we already have
* figure out what’s missing
* help get the patient to the right next step
* etc.

And maybe the patient has some constraints, like:
* what if they can only use audio
* what if their parent is doing this for them
* what if they have bad internet

Or if you're brave, invent a really silly constraint. Some silly ideas to get you started:
* the patient has an incredibly short attention span: you can only ask the patient 3 questions
* the patient can only communicate using... photos? emoji? yes/no answers? 1 word at a time?
* the patient has an extremely relevant comorbidity that he/she will not notice in a list of checkboxes because he/she doesn't remember what it's called

Anything goes here, e.g. UI, API, agent, workflow, voice, visualization

## The patients

Five made-up patients in [`patients/`](patients). Same shape each: a README, `messages.md`, one CSV, one image. Don't care which? Start with [strained back](patients/strained-back).

| Patient | Photo | Time series | Proxy | The catch |
|---|---|---|---|---|
| [Eczema](patients/eczema) | rash | itch log | | Nobody looked at the photo |
| [Strained back](patients/strained-back) | old x-ray | watch steps and sleep | | Skipped the nurse's red flag question |
| [GLP-1 / weight loss](patients/glp1) | mystery pen | weight | | Chart dose and real dose disagree |
| [Persistent pain](patients/persistent-pain) | pill bottle | 9 visits, 5 prescribers | wife | Stopped a med, nobody knows |
| [Glaucoma](patients/glaucoma) | 2023 eye scan | eye pressure | daughter | Everything is stale and secondhand |

Today's intake form, for reference: name, date of birth, insurance, reason for visit, medications, allergies, a checkbox list of past conditions, signature.

## Real vs. generated

All names, dates, messages, and numbers were LLM-generated (Claude, September 2026). No real patients. The images are real, from unrelated anonymous people:

| File | Source | License |
|---|---|---|
| `eczema/elbow-photo.png` | [SCIN dataset](https://github.com/google-research-datasets/scin) (Google), case -3059654233454543811 | CC BY 4.0 |
| `strained-back/xray-2021.jpg` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lateral_lumbar_x_ray.jpg), FitBro | CC BY-SA 4.0 |
| `glp1/pen-photo.jpg` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Ozempic%C2%AE_3ml.jpg), HualinXMN | CC BY-SA 4.0 |
| `persistent-pain/pill-bottle.jpg` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Pill_Bottle_of_Assorted_Pills.JPG), ParentingPatch | CC BY-SA 3.0 |
| `glaucoma/optic-disc-2023.png` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Optic_disc_topography,_case_1,_R,_glaucoma.png), Jmarchn | CC BY-SA 3.0 |
