# HealthGuard AI

HealthGuard AI is a real-time deterioration prediction dashboard for hospital wards. It continuously monitors patient vital signs and organ data, utilizing Machine Learning to detect early signs of clinical deterioration. When a patient reaches a critical threshold, it leverages Google's Gemini AI to generate immediate, actionable clinical explanations for the nursing staff.

![Dashboard Preview](screenshot.png) *(Note: You can add a screenshot here later)*

## 🌟 Key Features

*   **Machine Learning Risk Scoring:** Uses an **Isolation Forest** anomaly detection model (via Scikit-Learn) to score patient risk based on 10 continuous vital and organ parameters.
*   **Comprehensive Vital Tracking:** Monitors Heart Rate (HR), SpO2, Respiratory Rate (RR), Temperature, Blood Pressure (BP), Urine Output, Bilirubin, Platelets, and Confusion levels.
*   **Generative AI Explanations:** Integrates with the **Gemini AI API** to provide concise, under-90-word clinical summaries and nursing action priorities when a patient enters a critical state.
*   **Nurse Visit Logs & PDF Reports:** Includes a dedicated workflow for nurses to add timestamped visit notes, and the ability to generate and download comprehensive PDF patient reports.
*   **Modern UI:** A clean, responsive, light-themed dashboard built with React, Tailwind CSS, and Chart.js for real-time vitals trending.
*   **Live Simulation Engine:** Built-in simulation loop to demonstrate real-time patient deterioration and recovery scenarios.

## 🏗️ Architecture

The project operates as a two-tier architecture:
1.  **Frontend:** React + Vite + Tailwind CSS (runs on port 5173/5174).
2.  **ML Backend:** Python + FastAPI + Scikit-Learn (runs on port 8000).

## 🚀 Getting Started

To run the full application locally, you must run both the Frontend and the ML Backend simultaneously.

### Prerequisites
*   Node.js (v18+)
*   Python (3.9+)
*   A Google Gemini API Key

### 1. Environment Setup

In the root `healthguard-ai` directory, create a `.env` file and add your Gemini API key:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-2.5-flash
```

### 2. Start the ML Backend (Terminal 1)

The backend handles the Isolation Forest anomaly detection.

```bash
cd ml_backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
*You should see output indicating the model is training on synthetic data and the server is running.*

### 3. Start the Frontend (Terminal 2)

```bash
# From the root healthguard-ai directory
npm install
npm run dev
```

Navigate to `http://localhost:5173` (or the port specified in your terminal) to view the dashboard.

## 🧠 How the ML Scoring Works

The project has completely transitioned from a rule-based scoring system to a **100% ML-driven** approach. 
The `ml_backend` trains an `IsolationForest` model on 500 synthetic "normal" patient samples at startup. Every 5 seconds, the frontend simulation sends the latest vitals (including 10 features like HR, urine output, and platelets) to the `/predict` endpoint. The backend calculates an anomaly score and converts it into a 0-100 `risk_score` which directly dictates the patient's status (Stable, Warning, Critical) on the dashboard.
