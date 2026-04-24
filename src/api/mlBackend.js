const ML_BACKEND_URL = 'http://localhost:8000'

/**
 * Parse a blood-pressure string like "120/80" into systolic and diastolic numbers.
 */
function parseBp(bp) {
  const [sRaw, dRaw] = String(bp).split('/')
  return {
    systolic: Number(sRaw) || 120,
    diastolic: Number(dRaw) || 80,
  }
}

/**
 * Send current patient vitals (including organ data) to the ML backend.
 * Returns the full prediction: { anomaly_score, risk_score, is_anomaly }
 *
 * @param {object} vitals - Full vitals object with organ data
 * @returns {Promise<{ anomalyScore: number, riskScore: number, isAnomaly: boolean }>}
 */
export async function getMLPrediction(vitals) {
  try {
    const { systolic, diastolic } = parseBp(vitals.bp)

    const response = await fetch(`${ML_BACKEND_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hr: vitals.hr,
        spo2: vitals.spo2,
        rr: vitals.rr,
        temp: vitals.temp,
        bp_systolic: systolic,
        bp_diastolic: diastolic,
        urine: vitals.urine ?? 40,
        bilirubin: vitals.bilirubin ?? 1.0,
        platelets: vitals.platelets ?? 150000,
        confusion: vitals.confusion ? 1.0 : 0.0,
      }),
    })

    if (!response.ok) {
      return { anomalyScore: 0, riskScore: 0, isAnomaly: false }
    }

    const data = await response.json()
    return {
      anomalyScore: typeof data.anomaly_score === 'number' ? data.anomaly_score : 0,
      riskScore: typeof data.risk_score === 'number' ? data.risk_score : 0,
      isAnomaly: Boolean(data.is_anomaly),
    }
  } catch {
    // ML backend is not running — return zeros
    return { anomalyScore: 0, riskScore: 0, isAnomaly: false }
  }
}

/**
 * Legacy convenience wrapper — returns just the anomaly score (0-1).
 */
export async function getAnomalyScore(vitals) {
  const prediction = await getMLPrediction(vitals)
  return prediction.anomalyScore
}
