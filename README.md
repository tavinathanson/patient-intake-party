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

Five synthetic patients live in `patients/`. Each folder has a short README (profile, history, medications), a `messages.md`, and where it makes sense a CSV or an image. Nothing here needs clinical expertise. Pick one, or several.

| Folder | What's in it |
|---|---|
| `patients/eczema` | Rash photo, OTC and prescribed creams, unanswered portal messages |
| `patients/strained-back` | Prior injury, watch step and sleep data, a nurse question the patient skipped |
| `patients/glp1` | Weight over time, labs before and after, dose confusion, a drug shortage |
| `patients/persistent-pain` | 9 visits, 5 prescribers, a wife as proxy, no clear story |
| `patients/glaucoma` | Real eye exam images, pressure readings, a daughter managing his drops |

`reference/` has the current paper intake form (the thing to rethink) and one example of the note a clinician might want at the end.

### What's synthetic and what's real

**Every name, date, message, and number is LLM-generated (Claude, September 2026).** The patients are not real people. Do not read any clinical meaning into the values.

The three images are real, from Wikimedia Commons, and belong to real anonymous people unrelated to the synthetic patients they sit next to:

| File | Source | Author | License |
|---|---|---|---|
| `patients/eczema/hand-photo.jpg` | [Atopic dermatitis ab.jpeg](https://commons.wikimedia.org/wiki/File:Atopic_dermatitis_ab.jpeg) | Assianir | CC BY-SA 3.0 |
| `patients/glaucoma/visual-field-right-eye.jpg` | [In glaucoma right eye visual fild by campimeter.jpg](https://commons.wikimedia.org/wiki/File:In_glaucoma_right_eye_visual_fild_by_campimeter.jpg) | Pignol23 | CC BY 3.0 |
| `patients/glaucoma/optic-disc-right-eye.png` | [Optic disc topography, case 1, R, glaucoma.png](https://commons.wikimedia.org/wiki/File:Optic_disc_topography,_case_1,_R,_glaucoma.png) | Jmarchn | CC BY-SA 3.0 |
