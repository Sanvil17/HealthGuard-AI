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

  // ✅ EXISTING
  urineLow: 10,
  urineVeryLow: 15,
  liverIssue: 15,
  multiOrganRisk: 25,

  // ✅ NEW
  bilirubinHigh: 15,
  bilirubinVeryHigh: 20,
  eyeYellow: 10,
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

  if (currentVitals.hr > 100) abnormal += 1
  if (currentVitals.spo2 < 94) abnormal += 1
  if (currentVitals.rr > 22) abnormal += 1
  if (currentVitals.temp > 99.5) abnormal += 1

  return abnormal
}

export function calculateRiskScore(patient) {
  const current = patient.currentVitals
  const history = Array.isArray(patient.history) ? patient.history : []
  let score = 0

  // ============================
  // EXISTING VITALS
  // ============================
  if (current.hr > 100) score += THRESHOLD_POINTS.hr
  if (current.spo2 < 94) score += THRESHOLD_POINTS.spo2
  if (current.rr > 22) score += THRESHOLD_POINTS.rr
  if (current.temp > 99.5) score += THRESHOLD_POINTS.temp

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

  // ============================
  // ✅ KIDNEY LOGIC
  // ============================
  if (current.urine !== undefined) {
    if (current.urine < 30) {
      score += TREND_POINTS.urineLow
    }
    if (current.urine < 20) {
      score += TREND_POINTS.urineVeryLow
    }
  }

  // ============================
  // ✅ LIVER (OLD FLAG)
  // ============================
  if (current.liverFlag) {
    score += TREND_POINTS.liverIssue
  }

  // ============================
  // ✅ NEW: BILIRUBIN LOGIC
  // ============================
  if (current.bilirubin !== undefined) {
    if (current.bilirubin > 2) {
      score += TREND_POINTS.bilirubinHigh
    }
    if (current.bilirubin > 3) {
      score += TREND_POINTS.bilirubinVeryHigh
    }
  }

  // ============================
  // ✅ NEW: EYE DETECTION
  // ============================
  if (current.eyeYellow) {
    score += TREND_POINTS.eyeYellow
  }

  // ============================
  // ✅ MULTI-ORGAN (OLD)
  // ============================
  if (
    current.urine !== undefined &&
    current.urine < 20 &&
    current.hr > 110 &&
    current.spo2 < 94
  ) {
    score += TREND_POINTS.multiOrganRisk
  }

  // ============================
  // ✅ NEW: STRONG LIVER FAILURE SIGNAL
  // ============================
  if (
    current.bilirubin !== undefined &&
    current.bilirubin > 3 &&
    current.eyeYellow
  ) {
    score += 20
  }

  return Math.min(score, 100)
}

export function getStatusFromScore(score) {
  if (score > 70) return 'red'
  if (score > 40) return 'yellow'
  return 'green'
}