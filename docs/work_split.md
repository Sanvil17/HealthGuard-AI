I AM PERSON A 

# ⚡ HealthGuard AI — 24HR Team Work Split
### Athernex 2025 Hackathon

---

## 👥 Team Roles Overview

| Member | Level | Role Title |
|--------|-------|------------|
| **Person A** | 🔴 Strongest | Tech Lead — Core Logic + AI Integration |
| **Person B** | 🟡 Second | Frontend Lead — Dashboard UI + Graphs |
| **Person C** | 🟢 Basic | Content + Data — Mock Patients + Styling Help |
| **Person D** | 🟢 Basic | PDF + Presentation — Report + Demo Prep |

> **Golden Rule:** A and B build the app. C and D make sure A and B never have to stop and do anything else.

---

## 🔴 PERSON A — Tech Lead
### *Core Logic + AI Integration + Final Assembly*
**You are the engine. Everything critical goes through you.**
🔁 Simulation Behavior Rules (CRITICAL — READ BEFORE CODING)

This project uses a single global simulation engine.

🧠 Core Rule

There is ONLY ONE simulation loop for the entire system.

⚙️ How Simulation Works
A global setInterval() runs every 5–10 seconds
It updates ALL patients in the system
It recalculates:
vitals
risk score
alert status
setInterval(() => {
  patients.forEach(updateVitals);
}, 5000);
➕ When a New Patient is Added
Nurse adds patient via UI
Patient object is pushed into the global patients array
patients.push(newPatient);
That’s it — no extra setup required
🔄 What Happens Next
On the next simulation cycle, the new patient is automatically included
Their vitals begin updating like all other patients
Risk score starts calculating immediately
Alerts trigger normally if thresholds are crossed
❌ DO NOT DO THIS
❌ Do NOT create a separate setInterval() per patient
❌ Do NOT manually “start simulation” for a patient
❌ Do NOT create multiple loops

This will cause:

inconsistent updates
memory leaks
hard-to-debug issues
✅ Correct Mental Model
Simulation Engine (always running)
        ↓
Updates ALL patients
        ↓
New patient joins automatically
🧠 Key Insight

Patients do not start simulation. Simulation absorbs patients.

---

### Phase 1 — Hours 1–4 (Foundation)
- [ ] Set up React + Vite project (`npm create vite@latest`)
- [ ] Install Tailwind CSS, Chart.js, jsPDF
- [ ] Create `.env` file with Gemini API key
- [ ] Build `simulation.js` — the global setInterval vitals loop
- [ ] Build `riskEngine.js` — Layer 1 + Layer 2 score calculation
- [ ] Create `mockPatients.js` with 5 seed patients (use data from C)
- [ ] Make sure simulation runs and scores calculate correctly in console

### Phase 2 — Hours 5–10 (AI + Alerts)
- [ ] Build `gemini.js` — API call + prompt builder
- [ ] Connect auto-trigger: when riskScore > 70 → call Gemini automatically
- [ ] Build `AlertBanner.jsx` — drops from top on red alert
- [ ] Test full pipeline: vitals update → score → alert → Gemini fires → explanation appears
- [ ] Make sure no two Gemini calls fire for same patient repeatedly

### Phase 3 — Hours 11–16 (Integration)
- [ ] Take B's UI components and wire them to real simulation data
- [ ] Connect risk score to card color (green/yellow/red)
- [ ] Connect vitals history array to VitalsGraph component
- [ ] Connect AI explanation string to AIExplanation component
- [ ] Take D's PDF function and connect it to real patient data
- [ ] End-to-end test: open app → patient deteriorates → alert → AI → PDF

### Phase 4 — Hours 17–22 (Polish + Deploy)
- [ ] Fix any bugs from integration
- [ ] Deploy to Vercel (`vercel deploy`)
- [ ] Test deployed link works perfectly
- [ ] Do 3 full demo run-throughs with team
- [ ] Make sure Patient 03 always deteriorates within 3–4 minutes of opening app

### Phase 5 — Hours 23–24 (Buffer)
- [ ] Sleep / rest — do NOT keep coding
- [ ] This buffer is for unexpected breaks only

---

### ⚠️ A's Key Files
```
src/logic/simulation.js
src/logic/riskEngine.js
src/api/gemini.js
src/data/mockPatients.js   ← gets data from C
src/App.jsx                ← final wiring
```

---

## 🟡 PERSON B — Frontend Lead
### *Dashboard UI + Patient Cards + Graphs*
**You are the face of the product. Judges see your work first.**

---

### Phase 1 — Hours 1–4 (Setup + Layout)
- [ ] Wait for A to set up project, then pull it
- [ ] Build `WardDashboard.jsx` — grid layout of 6 patient slots
- [ ] Build `PatientCard.jsx` — shows name, bed, 3 vitals, risk badge
- [ ] Use dark theme: background `#0D1B2A`, cards `#132235`
- [ ] Risk badge colors: green `#22C55E` / yellow `#F5A623` / red `#EF4444`
- [ ] Make it look like real hospital software — not a student project

### Phase 2 — Hours 5–10 (Graphs + Detail View)
- [ ] Build `VitalsGraph.jsx` — line graph showing HR and SpO2 over time
- [ ] Use Chart.js or Recharts (whichever feels easier)
- [ ] Build patient detail panel — opens when you click a card
- [ ] Detail panel shows: full vitals, trend graph, risk score, AI explanation box
- [ ] `AIExplanation.jsx` — styled text box, shows loading state then explanation
- [ ] `RiskScore.jsx` — large number display with color ring around it

### Phase 3 — Hours 11–14 (Handoff to A)
- [ ] Hand all components to A for data wiring
- [ ] While A wires — polish UI spacing, fonts, animations
- [ ] Add subtle pulse animation on red patient cards
- [ ] Add small ECG-style line in header (decorative, makes it look medical)
- [ ] Make sure dashboard looks good on a laptop screen (1366×768 minimum)

### Phase 4 — Hours 15–20 (Final UI Polish)
- [ ] Review fully wired app from A
- [ ] Fix any visual bugs
- [ ] Add "Add Patient" modal/form UI
- [ ] Make alert banner look dramatic (bold red, slide-down animation)
- [ ] Final check — every screen looks clean and professional

---

### ⚠️ B's Key Files
```
src/components/WardDashboard.jsx
src/components/PatientCard.jsx
src/components/VitalsGraph.jsx
src/components/RiskScore.jsx
src/components/AIExplanation.jsx
src/components/AlertBanner.jsx
```

---

## 🟢 PERSON C — Content + Data Manager
### *Mock Data + Slide Content + Research Support*
**You keep A and B unblocked. Your job is to make sure they never have to stop and think about content.**

---

### Phase 1 — Hours 1–3 (Mock Patient Data)
Create 5 detailed mock patients in this exact format and hand to A:

```js
// Give A this as a Google Doc or WhatsApp message

Patient 1 — Arjun Sharma, Bed B01, pattern: "deteriorating"
Starting vitals: HR 88, SpO2 97, RR 17, Temp 98.4, BP 122/80
Story: Post-surgery patient, slowly declining

Patient 2 — Meena Rao, Bed B02, pattern: "stable"
Starting vitals: HR 72, SpO2 99, RR 14, Temp 98.2, BP 118/76
Story: Routine monitoring, no concerns

Patient 3 — Ravi Kumar, Bed B03, pattern: "deteriorating" (FAST — demo patient)
Starting vitals: HR 92, SpO2 96, RR 18, Temp 98.9, BP 126/82
Story: Respiratory patient — this is the one that goes red during demo

Patient 4 — Sunita Devi, Bed B04, pattern: "recovering"
Starting vitals: HR 95, SpO2 94, RR 20, Temp 99.0, BP 130/85
Story: Was critical, now improving

Patient 5 — Mohammed Ali, Bed B05, pattern: "stable"
Starting vitals: HR 68, SpO2 98, RR 15, Temp 98.1, BP 115/74
Story: Observation only
```

### Phase 2 — Hours 3–8 (Nurse Notes)
Write realistic nurse notes for each patient's history entries.
A will paste these into the data file.

```
Patient 3 (Ravi Kumar) notes — most important:
10:00 → "Patient comfortable, no complaints"
11:00 → "Mild shortness of breath reported"
12:00 → "Breathing appears laboured, patient anxious"
13:00 → "Requested extra pillow, difficulty lying flat"
```

### Phase 3 — Hours 8–16 (Pitch Deck Updates)
Update the Athernex PPT with actual project details:
- [ ] Fill in Team Check-in slide with all 4 member details
- [ ] Update Problem Statement slide with the 11M+ stat
- [ ] Update Solution slide with the final flow diagram
- [ ] Update Features slide with the 4 final features
- [ ] Update Tech Stack slide with React, Gemini, jsPDF, Vercel
- [ ] Update Impact slide with the stats from the project doc

### Phase 4 — Hours 16–22 (Demo Support)
- [ ] Write the demo script (7 steps from the project doc) on a notes app
- [ ] Prepare answers for judge questions (see FAQ below)
- [ ] Write the 1-minute elevator pitch for when judges first walk up
- [ ] Make sure Gemini API key is stored safely and shared with A

---

### 📋 C's Judge FAQ Prep

**Q: Why not just use existing hospital software?**
> Existing systems only alarm at fixed thresholds. We detect trends — a patient dropping from 98% to 91% SpO2 over 3 hours triggers us at 96%, not 91%.

**Q: Is the AI actually doing anything?**
> Yes — Gemini generates the clinical explanation in real-time. The risk score is rule-based and transparent. We intentionally kept prediction explainable, not a black box.

**Q: Can this work in real hospitals?**
> In production, we'd replace the simulation with HL7/FHIR API calls from actual bedside monitors. The entire logic layer stays the same.

**Q: What about patient data privacy?**
> All data stays local (LocalStorage). No patient data leaves the device. In production, on-premise deployment with encryption handles this.

---

## 🟢 PERSON D — PDF + Presentation + Demo Prep
### *Report Generator + Final Presenter*
**You own the output that judges can physically see and the words they remember.**

---

### Phase 1 — Hours 1–4 (Learn jsPDF)
- [ ] Go to: https://rawgit.com/MrRio/jsPDF/master/docs/
- [ ] Understand 3 functions only: `doc.text()`, `doc.line()`, `doc.save()`
- [ ] Build a simple test PDF in CodePen or a blank HTML file
- [ ] That's all you need to know

### Phase 2 — Hours 4–10 (Build PDF Generator)
Build `pdfGenerator.js` — this is your main job:

```js
// This is the structure you need to build
// Hand this file to A when done

import jsPDF from 'jspdf';

export function generateReport(patient) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('HEALTHGUARD AI', 105, 20, { align: 'center' });
  doc.text('Patient Risk Report', 105, 30, { align: 'center' });

  // Divider line
  doc.line(20, 35, 190, 35);

  // Patient Info
  doc.setFontSize(12);
  doc.text(`Patient: ${patient.name}`, 20, 45);
  doc.text(`Bed: ${patient.bed}`, 120, 45);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 52);

  // Vitals
  doc.line(20, 57, 190, 57);
  doc.setFontSize(14);
  doc.text('CURRENT VITALS', 20, 65);
  doc.setFontSize(11);
  doc.text(`HR: ${patient.currentVitals.hr} bpm`, 20, 73);
  doc.text(`SpO2: ${patient.currentVitals.spo2}%`, 80, 73);
  doc.text(`RR: ${patient.currentVitals.rr}`, 140, 73);
  doc.text(`Temp: ${patient.currentVitals.temp}°F`, 20, 80);
  doc.text(`BP: ${patient.currentVitals.bp}`, 80, 80);

  // Risk Score
  doc.line(20, 85, 190, 85);
  doc.setFontSize(14);
  doc.text(`RISK SCORE: ${patient.riskScore} / 100`, 20, 95);
  doc.text(
    patient.status === 'red' ? 'STATUS: CRITICAL' :
    patient.status === 'yellow' ? 'STATUS: WARNING' : 'STATUS: STABLE',
    120, 95
  );

  // AI Explanation
  doc.line(20, 100, 190, 100);
  doc.setFontSize(14);
  doc.text('AI CLINICAL EXPLANATION', 20, 110);
  doc.setFontSize(10);
  // Word wrap the AI text
  const splitText = doc.splitTextToSize(
    patient.aiExplanation || 'No critical concerns detected at this time.',
    170
  );
  doc.text(splitText, 20, 118);

  // Nurse Notes
  const notesY = 118 + splitText.length * 6 + 8;
  doc.line(20, notesY, 190, notesY);
  doc.setFontSize(12);
  doc.text('NURSE NOTES', 20, notesY + 10);
  const lastNote = patient.history[patient.history.length - 1]?.note || 'None';
  doc.setFontSize(10);
  doc.text(lastNote, 20, notesY + 18);

  // Save
  doc.save(`HealthGuard_${patient.name}_Report.pdf`);
}
```

### Phase 3 — Hours 10–16 (Practice the Demo)
This is critical. You are the one presenting.

- [ ] Read the 7-step demo flow from the project doc 10 times
- [ ] Practice saying each line out loud — time yourself (target: 4–5 minutes total)
- [ ] Know exactly which patient to click and when
- [ ] Practice the closing line until it sounds natural:
  *"This 10-second alert is the difference between ward care and an ICU admission."*

### Phase 4 — Hours 16–22 (Presentation Polish)
- [ ] Do 3 full mock demos with the team watching
- [ ] Get feedback — what looks confusing, what needs explaining
- [ ] Prepare for judges walking up mid-demo (be ready to restart)
- [ ] Charge all laptops fully before sleeping
- [ ] Know the Vercel link by heart — don't fumble opening it

---

### 📋 D's Elevator Pitch (Memorize This)
When a judge walks up and asks "what did you build?":

> *"HealthGuard AI is a real-time patient monitoring dashboard for hospital wards.
> Most hospital alarms only fire when a reading crosses a danger threshold —
> but by then it's often too late.
> We track trends across multiple vitals over time and predict deterioration
> 4 to 6 hours early.
> When our AI detects a pattern, it automatically generates a clinical explanation
> so nurses know exactly why a patient is at risk —
> and doctors get a downloadable report for handoff.
> Everything you see is running live."*

---

## 🕐 Shared Timeline

| Hours | A | B | C | D |
|-------|---|---|---|---|
| 1–4 | Project setup + simulation | Dashboard layout + cards | Mock patient data | Learn jsPDF |
| 5–8 | Risk engine + Gemini API | Graphs + detail view | Nurse notes | Build PDF generator |
| 9–12 | Auto-trigger pipeline | AI explanation UI | Update PPT slides | Test PDF with dummy data |
| 13–16 | Integration (wire everything) | Polish + animations | Judge FAQ prep | Practice demo script |
| 17–20 | Bug fixes + Vercel deploy | Final visual review | Pitch deck final | Mock demo x3 |
| 21–22 | Full demo run with team | Final check | Final check | Final check |
| 23–24 | 🛑 Rest | 🛑 Rest | 🛑 Rest | 🛑 Rest |

---

## 🚨 Critical Rules for All 4

1. **A and B never stop to search for content** — C handles all of that
2. **Nobody touches A's logic files** — only A edits simulation.js and riskEngine.js
3. **B builds components with dummy/hardcoded data first** — A wires real data later
4. **D practices the demo from Hour 10 onwards** — not just the last 2 hours
5. **Deploy to Vercel by Hour 18 at the latest** — never demo from localhost
6. **Sleep at least 2 hours** — a tired presenter loses to a rested average one

---

## 🔑 Tonight's Homework (Before Hackathon)

| Person | Do This Tonight |
|--------|----------------|
| **A** | Get Gemini API key from aistudio.google.com (free, 2 min) |
| **B** | Look at 2–3 dark medical dashboard UIs on Dribbble for inspiration |
| **C** | Read the full project doc once, write down 5 judge questions you think will come |
| **D** | Read the 7-step demo flow 5 times, memorize the elevator pitch |

---

*All the best. You have everything you need. Now execute. 🔥*
*HealthGuard AI — Built at Athernex 2025 | DSCE × BMSCE × RVU*