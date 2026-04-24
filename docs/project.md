# 🏥 HealthGuard AI
### Real-Time Patient Deterioration Prediction Dashboard
**Hackathon:** Athernex 2025 — Tri College Tech Fest (DSCE, BMSCE & RVU)
**Domain:** AI/ML × HealthTech
**Team Size:** 4

---

## 🧠 Overview

HealthGuard AI is a nurse-focused hospital dashboard that helps detect early signs of patient deterioration **before critical thresholds are reached**.

Instead of reacting to emergencies, the system continuously analyzes patient vitals and trends to **predict risk early**, alert nurses, and provide clear explanations for action.

---

## 🎯 Core Idea (One Line)

> App starts → simulation auto-runs → vitals update live → risk calculated → alert fires → AI explanation auto-generates → downloadable PDF report

---

## 🚨 Problem

Hospitals today are **reactive**:

- Alerts trigger only when values cross dangerous thresholds
- Nurses monitor multiple patients manually
- Subtle deterioration patterns go unnoticed

**Result:**
- Late intervention
- Increased ICU admissions
- Preventable complications

> **11 million+** preventable hospital deaths occur globally every year due to delayed recognition of deterioration.
> **7,000+** hospitals in India alone — none have an AI early warning layer.

---

## 💡 Solution

HealthGuard AI introduces a **predictive monitoring layer**:

- Tracks patient vitals over time automatically
- Detects worsening **trends** (not just current values)
- Assigns a **Risk Score (0–100)** per patient
- Alerts nurses early — before the critical stage
- **Auto-generates AI explanation the moment red alert fires** (no click needed)
- Generates a **downloadable PDF report** for doctor handoff

---

## 🏗️ System Flow

```
App Starts
    ↓
Simulation Engine Auto-Starts
(No manual trigger needed)
    ↓
Vitals Update Every 5–10 Seconds (All Patients)
    ↓
Risk Engine Recalculates Score Each Cycle
    ↓
Score 0–40 → 🟢 Green (Stable)
Score 41–70 → 🟡 Yellow (Warning)
Score 71–100 → 🔴 Red (Critical)
    ↓
🔴 If Score > 70:
    → Alert Banner Fires
    → Gemini API Auto-Triggers (no click)
    → AI Explanation Appears on Screen (3–5 sec)
    ↓
Nurse Reviews Patient Detail View
    ↓
📄 One Click → PDF Report Downloads Instantly
```

---

## ⚙️ How the Simulation Works

### Auto-Start on App Launch
When the app runs (`npm run dev`), the **simulation engine starts automatically**.
No manual trigger. No button click. It just runs.

```
App Start → Simulation Engine Starts → Vitals Update Every 5s
         → Risk Recalculated → Alerts Trigger → AI Fires
```

### The Global Simulation Loop
A single loop runs for the **entire system** — not per patient.

```js
setInterval(() => {
  patients.forEach(updateVitals); // all patients updated every cycle
}, 5000);
```

Every patient is part of this stream from the moment they're added.

### Patient Behavior Patterns
Each patient follows one of three predefined patterns:

```js
// pattern: "stable" | "deteriorating" | "recovering"

deteriorating: {
  hr:   increases by 2–5 each cycle,
  spo2: decreases by 1–2 each cycle,
  rr:   increases by 1–2 each cycle,
  temp: slight increase
}

stable: {
  all vitals: minor random fluctuation (±1–2)
}

recovering: {
  hr:   slowly decreasing toward normal,
  spo2: slowly increasing toward normal
}
```

### What Happens When Nurse Adds a New Patient

```js
// Step 1 — Nurse fills form and submits
{
  id: "P006",
  name: "New Patient",
  bed: "B06",
  pattern: "stable",       // default — can be changed
  vitals: { hr: 80, spo2: 98, rr: 16, temp: 98.6, bp: "120/80" },
  history: [],
  riskScore: 0,
  status: "green"
}

// Step 2 — Push to global patient list
patients.push(newPatient);

// Step 3 — DONE ✅
// The simulation loop is already running.
// Next cycle automatically picks up the new patient.
// No manual start needed.
```

> **Key Insight:** Simulation doesn't start *for* a patient.
> Simulation runs *for the system*. Patients just join the stream.

---

## 👩‍⚕️ User Flow (Nurse)

### 1. App Opens
- Dashboard loads with all existing patients
- Vitals already updating live — no setup needed

### 2. Add New Patient (Optional)
- Click "Add Patient"
- Enter: Name, Bed ID, basic info
- Patient immediately joins the live simulation stream

### 3. Add Checkup Note (Optional, Hourly)
- HR, SpO2, BP, Temp, RR can be manually confirmed
- Optional nurse note: *"patient tired"*, *"breathing heavy"*
- Note feeds into AI explanation context

### 4. Watch Alerts Fire Automatically
- 🟢 Green → Stable, monitor normally
- 🟡 Yellow → Watch closely
- 🔴 Red → **AI explanation auto-fires immediately, no action needed**

### 5. Patient Detail View
- Click any patient card
- See vitals trend graph over last 6 hours
- See full AI-generated explanation
- See risk score breakdown

### 6. Generate Report
- Click "Generate Report" button
- **PDF downloads instantly**
- Doctor-ready handoff document

---

## 🧮 Risk Score Logic (Core Intelligence)

Calculated every simulation cycle using **two layers**:

### Layer 1 — Current Value Check
| Vital | Condition | Points |
|-------|-----------|--------|
| Heart Rate | HR > 100 bpm | +20 |
| Oxygen Saturation | SpO2 < 94% | +30 |
| Respiratory Rate | RR > 22 | +15 |
| Temperature | Temp > 99.5°F | +10 |

### Layer 2 — Trend Analysis (The Real Intelligence)
| Trend | Condition | Points |
|-------|-----------|--------|
| SpO2 | Dropping across last 3 readings | +25 |
| Heart Rate | Increasing across last 3 readings | +20 |
| Multiple vitals | 2+ abnormal simultaneously | +15 |

```
Final Score = min(total points, 100)
```

### Why Trends Beat Thresholds
> A patient with SpO2 at 93% is concerning.
> A patient with SpO2 dropping **98% → 96% → 93%** over 3 hours is **critical**.
> HealthGuard AI catches the second case. Normal hospital alarms don't.

---

## 🤖 AI Explanation Layer (Gemini API)

### Two Triggers
| Trigger | When | How |
|---------|------|-----|
| **Auto** | Risk score crosses 71 | Fires in background, no click |
| **On-demand** | Any time | Nurse clicks "Explain" button |

### Auto-Trigger Pipeline
```
Risk score hits 71+
    ↓
Alert banner fires on dashboard
    ↓
Gemini API call made in background (simultaneously)
    ↓
3–5 seconds later → explanation appears on patient card
    ↓
No nurse interaction needed — it just appears
```

### Input Sent to Gemini
```
Current vitals: HR 104, SpO2 91%, RR 24, Temp 99.1°F
Trend: SpO2 dropped 98 → 95 → 91 over last 3 hours
       HR increased 82 → 95 → 104 over last 3 hours
Nurse note: "breathing difficulty"
Risk Score: 84 / 100
```

### Example Gemini Output
> *"Patient shows a consistent oxygen saturation decline of 7% over 3 hours alongside progressive tachycardia (HR rising from 82 to 104 bpm) and elevated respiratory rate. This pattern is consistent with early respiratory distress or possible early sepsis. Immediate clinical assessment is strongly recommended."*

### Design Principle
- AI handles **explanation only** — not the prediction
- Prediction is done by the rule-based risk engine (transparent + auditable)
- This is **Explainable AI** — judges and doctors can understand every decision

---

## 📄 PDF Report Generation

### Trigger
Single button click — works for any patient at any risk level.

### Report Structure
```
┌──────────────────────────────────┐
│         HEALTHGUARD AI           │
│       Patient Risk Report        │
├──────────────────────────────────┤
│ Patient: [Name]   Bed: [ID]      │
│ Generated: [Date & Time]         │
├──────────────────────────────────┤
│ CURRENT VITALS                   │
│ HR: 104 bpm     SpO2: 91%        │
│ RR: 24          Temp: 99.1°F     │
│ BP: 128/84                       │
├──────────────────────────────────┤
│ RISK SCORE: 84 / 100  🔴 CRITICAL│
├──────────────────────────────────┤
│ VITAL TRENDS                     │
│ SpO2: ↓ 98 → 95 → 91            │
│ HR:   ↑ 82 → 95 → 104           │
├──────────────────────────────────┤
│ AI CLINICAL EXPLANATION          │
│ [Gemini generated text]          │
├──────────────────────────────────┤
│ NURSE NOTES                      │
│ [notes logged during shift]      │
└──────────────────────────────────┘
```

### Tech
- **jsPDF** — free, runs entirely in browser, zero backend needed
- One function call → PDF file downloads to device instantly

---

## 🔴 Alert System

| Score | Status | Color | Automatic Action |
|-------|--------|-------|-----------------|
| 0–40 | Stable | 🟢 Green | Normal monitoring |
| 41–70 | Warning | 🟡 Yellow | Card highlights, observe |
| 71–100 | Critical | 🔴 Red | Banner fires + AI auto-triggers |

### What Happens at Red Alert
1. Patient card border flashes red
2. Notification banner drops from top of screen
3. Gemini API call fires in background automatically
4. AI explanation appears on card within 3–5 seconds
5. Alert logged with timestamp in alert history

---

## 📊 Data Model

```js
{
  id: "P001",
  name: "Patient Name",
  bed: "B12",
  pattern: "deteriorating",       // drives simulation behavior

  currentVitals: {
    hr: 104,
    spo2: 91,
    rr: 24,
    temp: 99.1,
    bp: "128/84"
  },

  history: [
    { time: "10:00", hr: 82, spo2: 98, rr: 16, temp: 98.2, note: "Stable" },
    { time: "11:00", hr: 95, spo2: 95, rr: 20, temp: 98.8, note: "Slight fatigue" },
    { time: "12:00", hr: 104, spo2: 91, rr: 24, temp: 99.1, note: "Breathing difficulty" }
  ],

  riskScore: 84,
  status: "red",
  aiExplanation: "auto-generated string from Gemini",
  lastUpdated: "12:00"
}
```

---

## 🎬 Demo Flow (Memorize This)

```
[Step 1] Run: npm run dev → Open app in browser
         → 5 patients visible, all green
         → Vitals already moving live on every card
         → "This is our ward — every patient monitored in real-time"

[Step 2] Point to Patient 03
         → Vitals visibly shifting (simulation running)
         → "Watch Patient 03 — SpO2 is dropping, HR is rising"

[Step 3] Risk score climbs live: 32 → 55 → 71
         → Badge turns YELLOW, then RED
         → "Score just crossed 71 — watch what happens next"

[Step 4] 🔴 RED ALERT FIRES
         → Notification banner drops from top
         → AI explanation AUTOMATICALLY appears on card
         → Nobody clicked anything
         → "The AI generated that explanation on its own —
            no nurse action needed"

[Step 5] Click the patient card
         → Show vitals trend graph (deterioration visible clearly)
         → Show full AI explanation text
         → "You can see exactly WHY it flagged this patient —
            it's not a black box"

[Step 6] Click "Generate Report"
         → PDF downloads instantly
         → Hold it up or show screen
         → "One click — doctor-ready report for shift handover"

[Step 7] Close with the line
         → "This 10-second alert is the difference between
            ward care and an ICU admission."
```

---

## ⚙️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React (Vite)** | Main UI framework |
| **Tailwind CSS** | Dark medical-grade UI styling |
| **Chart.js / Recharts** | Real-time vitals line graphs |

### State & Storage
| Technology | Purpose |
|------------|---------|
| **React State** | Live vitals, scores, alerts |
| **LocalStorage** | Patient data survives page refresh |

### AI
| Technology | Purpose |
|------------|---------|
| **Google Gemini API** | Auto-triggered explanation + report text generation |

### PDF
| Technology | Purpose |
|------------|---------|
| **jsPDF** | Browser-side PDF, no backend needed |



### 💰 Cost: Everything is FREE
- Gemini API → free tier (Google AI Studio)

- jsPDF → open source
- React + Vite + Tailwind + Chart.js → open source

---

## 📁 Project File Structure

```
healthguard-ai/
├── index.html
├── .env                           ← GEMINI_API_KEY=your_key_here
├── src/
│   ├── App.jsx                    ← Root, starts simulation on mount
│   ├── components/
│   │   ├── WardDashboard.jsx      ← Main grid of all patient cards
│   │   ├── PatientCard.jsx        ← Individual card: vitals + badge
│   │   ├── VitalsGraph.jsx        ← Live line graph (Chart.js)
│   │   ├── RiskScore.jsx          ← 0–100 score + green/yellow/red
│   │   ├── AlertBanner.jsx        ← Top notification on red alert
│   │   ├── AIExplanation.jsx      ← Auto-triggered Gemini output
│   │   └── ReportButton.jsx       ← PDF download (jsPDF)
│   ├── logic/
│   │   ├── riskEngine.js          ← Score calculation (Layer 1 + 2)
│   │   └── simulation.js          ← Global setInterval vitals loop
│   ├── api/
│   │   └── gemini.js              ← Gemini API call + prompt builder
│   ├── utils/
│   │   └── pdfGenerator.js        ← jsPDF report layout + download
│   └── data/
│       └── mockPatients.js        ← 5 seed patients with patterns
├── package.json
└── README.md
```

---



## 📌 Tagline

> **"We don't wait for patients to crash — we predict it early."**

---

*HealthGuard AI — Built at Athernex 2025 | DSCE × BMSCE × RVU*