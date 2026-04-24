"""
HealthGuard AI — ML Backend
Isolation Forest anomaly detection for patient vital signs.
Runs on port 8000.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from sklearn.ensemble import IsolationForest

# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="HealthGuard AI ML Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model training at startup ────────────────────────────────────────────────

NUM_TRAINING_SAMPLES = 500

# Normal vital-sign ranges used to generate synthetic training data
NORMAL_RANGES = {
    "hr":           (60, 100),
    "spo2":         (95, 100),
    "rr":           (12, 20),
    "temp":         (97.0, 99.0),
    "bp_systolic":  (90, 120),
    "bp_diastolic": (60, 80),
}

def generate_normal_samples(n: int = NUM_TRAINING_SAMPLES) -> np.ndarray:
    """Create *n* synthetic samples drawn uniformly from normal vital ranges."""
    rng = np.random.default_rng(seed=42)
    samples = np.column_stack([
        rng.uniform(*NORMAL_RANGES["hr"], size=n),
        rng.uniform(*NORMAL_RANGES["spo2"], size=n),
        rng.uniform(*NORMAL_RANGES["rr"], size=n),
        rng.uniform(*NORMAL_RANGES["temp"], size=n),
        rng.uniform(*NORMAL_RANGES["bp_systolic"], size=n),
        rng.uniform(*NORMAL_RANGES["bp_diastolic"], size=n),
    ])
    return samples

# Train the Isolation Forest on synthetic normal data
print("Training Isolation Forest on", NUM_TRAINING_SAMPLES, "synthetic normal samples...")
training_data = generate_normal_samples()
model = IsolationForest(
    n_estimators=100,
    contamination=0.05,
    random_state=42,
)
model.fit(training_data)
print("Model training complete.")

# ── Request / Response schemas ───────────────────────────────────────────────

class VitalsInput(BaseModel):
    hr: float
    spo2: float
    rr: float
    temp: float
    bp_systolic: float
    bp_diastolic: float

class PredictionOutput(BaseModel):
    anomaly_score: float
    is_anomaly: bool

# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "message": "HealthGuard AI ML Backend is running."}


@app.get("/health")
def health_check():
    return {"status": "healthy", "model": "IsolationForest", "training_samples": NUM_TRAINING_SAMPLES}


@app.post("/predict", response_model=PredictionOutput)
def predict(vitals: VitalsInput):
    """
    Score a single set of patient vitals using the Isolation Forest model.

    Returns:
        anomaly_score: float in [0, 1] — higher means more anomalous
        is_anomaly: bool — True when the model flags the sample as an outlier
    """
    features = np.array([[
        vitals.hr,
        vitals.spo2,
        vitals.rr,
        vitals.temp,
        vitals.bp_systolic,
        vitals.bp_diastolic,
    ]])

    # decision_function returns negative values for anomalies, positive for normal.
    # score_samples returns the raw anomaly score (more negative = more anomalous).
    raw_score = model.decision_function(features)[0]
    prediction = model.predict(features)[0]  # 1 = normal, -1 = anomaly

    # Convert raw_score to a 0–1 range where 1 = most anomalous.
    # Typical raw scores range from about -0.5 (very anomalous) to +0.5 (very normal).
    # We use a sigmoid-like mapping for a smooth 0-1 output.
    anomaly_score = 1.0 / (1.0 + np.exp(raw_score * 5))
    anomaly_score = float(np.clip(anomaly_score, 0.0, 1.0))

    return PredictionOutput(
        anomaly_score=round(anomaly_score, 4),
        is_anomaly=(prediction == -1),
    )
