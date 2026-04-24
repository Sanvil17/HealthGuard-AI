const THRESHOLD_POINTS = {
  hr: 20,
  spo2: 30,
  rr: 15,
  temp: 10,
}

const TREND_POINTS = {
  spo2Dropping: 25,
  hrRising: 20,
  multipleAbnormal: 15,

  // Kidney
  urineLow: 10,
  urineVeryLow: 15,

  // Liver
  liverIssue: 15,
  bilirubinHigh: 15,
  bilirubinVeryHigh: 20,
  eyeYellow: 10,

  // Platelets (dengue detection)
  plateletLow: 15,
  plateletVeryLow: 25,

  // Brain
  confusion: 20,

  // Multi-organ
  multiOrganRisk: 25,
}

function hasThreeReadings(history) {
  return Array.isArray(history) && history.length >= 3
}

function pickLastThree(history) {
  return history.slice(-3)
}

function isStrictlyDropping(values) {
  return values[0] > values[1] && values[1] > values[2]
}

function isStrictlyRising(values) {
  return values[0] < values[1] && values[1] < values[2]
}

export function countCurrentAbnormalVitals(currentVitals) {
  let abnormal = 0

  if (currentVitals.hr > 100) {
    abnormal += 1
  }
  if (currentVitals.spo2 < 94) {
    abnormal += 1
  }
  if (currentVitals.rr > 22) {
    abnormal += 1
  }
  if (currentVitals.temp > 99.5) {
    abnormal += 1
  }

  return abnormal
}

export function calculateRiskScore(patient) {
  const current = patient.currentVitals
  const history = Array.isArray(patient.history) ? patient.history : []
  let score = 0

  if (current.hr > 100) {
    score += THRESHOLD_POINTS.hr
  }
  if (current.spo2 < 94) {
    score += THRESHOLD_POINTS.spo2
  }
  if (current.rr > 22) {
    score += THRESHOLD_POINTS.rr
  }
  if (current.temp > 99.5) {
    score += THRESHOLD_POINTS.temp
  }

  if (hasThreeReadings(history)) {
    const lastThree = pickLastThree(history)
    const spo2Values = lastThree.map((entry) => Number(entry.spo2))
    const hrValues = lastThree.map((entry) => Number(entry.hr))

    if (isStrictlyDropping(spo2Values)) {
      score += TREND_POINTS.spo2Dropping
    }
    if (isStrictlyRising(hrValues)) {
      score += TREND_POINTS.hrRising
    }
  }

  if (countCurrentAbnormalVitals(current) >= 2) {
    score += TREND_POINTS.multipleAbnormal
  }

  // ── Kidney ──
  if (current.urine !== undefined) {
    if (current.urine < 30) {
      score += TREND_POINTS.urineLow
    }
    if (current.urine < 20) {
      score += TREND_POINTS.urineVeryLow
    }
  }

  // ── Liver ──
  if (current.liverFlag) {
    score += TREND_POINTS.liverIssue
  }

  if (current.bilirubin !== undefined) {
    if (current.bilirubin > 2) {
      score += TREND_POINTS.bilirubinHigh
    }
    if (current.bilirubin > 3) {
      score += TREND_POINTS.bilirubinVeryHigh
    }
  }

  if (current.eyeYellow) {
    score += TREND_POINTS.eyeYellow
  }

  // Strong liver failure signal
  if (
    current.bilirubin !== undefined &&
    current.bilirubin > 3 &&
    current.eyeYellow
  ) {
    score += 20
  }

  // ── Platelets (dengue) ──
  if (current.platelets !== undefined) {
    if (current.platelets < 100000) {
      score += TREND_POINTS.plateletLow
    }
    if (current.platelets < 50000) {
      score += TREND_POINTS.plateletVeryLow
    }
  }

  // ── Brain ──
  if (current.confusion) {
    score += TREND_POINTS.confusion
  }

  // ── Multi-organ risk ──
  if (
    current.urine !== undefined &&
    current.urine < 20 &&
    current.hr > 110 &&
    current.spo2 < 94
  ) {
    score += TREND_POINTS.multiOrganRisk
  }

  return Math.min(score, 100)
}

export function getStatusFromScore(score) {
  if (score > 70) {
    return 'red'
  }
  if (score > 40) {
    return 'yellow'
  }
  return 'green'
}

/**
 * Blend the rule-based score with the ML anomaly score.
 *
 * Formula: final = (ruleScore × 0.6) + (anomalyScore × 100 × 0.4)
 *
 * @param {number} ruleScore - Rule-based score (0–100)
 * @param {number} anomalyScore - ML anomaly score (0–1)
 * @returns {number} Combined score clamped to 0–100
 */
export function calculateCombinedScore(ruleScore, anomalyScore) {
  const combined = (ruleScore * 0.6) + (anomalyScore * 100 * 0.4)
  return Math.min(100, Math.max(0, Math.round(combined)))
}
