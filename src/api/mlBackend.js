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
 * Send current patient vitals to the ML backend and return the anomaly score.
 *
 * @param {object} vitals - { hr, spo2, rr, temp, bp }
 * @returns {Promise<number>} anomaly_score between 0 and 1, or 0 on failure
 */
export async function getAnomalyScore(vitals) {
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
      }),
    })

    if (!response.ok) {
      return 0
    }

    const data = await response.json()
    return typeof data.anomaly_score === 'number' ? data.anomaly_score : 0
  } catch {
    // ML backend is not running — fall back to rule-based score only
    return 0
  }
}
