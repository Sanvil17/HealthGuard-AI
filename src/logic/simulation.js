import { calculateRiskScore, calculateCombinedScore, getStatusFromScore } from './riskEngine.js'
import { getMLPrediction } from '../api/mlBackend.js'

let simulationTimeoutId = null

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min, max, precision = 1) {
  const value = Math.random() * (max - min) + min
  return Number(value.toFixed(precision))
}

function roundTo(value, decimals = 1) {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

function nextClockTime() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function nextBloodPressure(currentBp, hr, trend = 'stable') {
  const [sRaw, dRaw] = String(currentBp).split('/')
  const systolic = Number(sRaw) || 120
  const diastolic = Number(dRaw) || 80

  let sDelta = randInt(-2, 2)
  let dDelta = randInt(-1, 1)

  if (trend === 'deteriorating') {
    sDelta = randInt(1, 4)
    dDelta = randInt(0, 2)
  }
  if (trend === 'recovering') {
    sDelta = randInt(-3, -1)
    dDelta = randInt(-2, 0)
  }

  const targetByHr = hr > 105 ? 132 : hr < 68 ? 112 : systolic
  const nextS = clamp(systolic + sDelta + Math.sign(targetByHr - systolic), 90, 180)
  const nextD = clamp(diastolic + dDelta, 55, 110)
  return `${nextS}/${nextD}`
}

function updateStableVitals(current) {
  // Tight ranges — stable patients should NOT drift into yellow during demo
  const hr = clamp(current.hr + randInt(-1, 1), 60, 95)
  const spo2 = clamp(current.spo2 + randInt(0, 1), 96, 100)
  const rr = clamp(current.rr + randInt(-1, 1), 12, 18)
  const temp = roundTo(clamp(current.temp + randFloat(-0.1, 0.1), 97.4, 98.8))

  return {
    hr,
    spo2,
    rr,
    temp,
    bp: nextBloodPressure(current.bp, hr, 'stable'),

    urine: clamp((current.urine ?? 40) + randInt(-1, 1), 35, 55),
    liverFlag: current.liverFlag ?? false,
    bilirubin: roundTo(clamp((current.bilirubin ?? 1.0) + randFloat(-0.05, 0.05), 0.5, 1.5)),
    eyeYellow: false,
    platelets: clamp((current.platelets ?? 150000) + randInt(-500, 500), 140000, 300000),
    confusion: false,
    pf_ratio: clamp((current.pf_ratio ?? 450) + randInt(-5, 5), 420, 500),
  }
}

function updateRecoveringVitals(current) {
  const hr = clamp(current.hr - randInt(1, 3), 60, 100)
  const spo2 = clamp(current.spo2 + randInt(0, 2), 93, 100)
  const rr = clamp(current.rr - randInt(0, 2), 12, 20)
  const temp = roundTo(clamp(current.temp - randFloat(0, 0.2), 97.2, 99.3))

  return {
    hr,
    spo2,
    rr,
    temp,
    bp: nextBloodPressure(current.bp, hr, 'recovering'),

    urine: clamp((current.urine ?? 40) + randInt(0, 2), 25, 60),
    liverFlag: current.liverFlag ?? false,
    bilirubin: roundTo(clamp((current.bilirubin ?? 1.0) - randFloat(0, 0.1), 0.5, 5)),
    eyeYellow: current.eyeYellow ?? false,
    platelets: clamp((current.platelets ?? 150000) + randInt(2000, 5000), 20000, 300000),
    confusion: false,
    pf_ratio: clamp((current.pf_ratio ?? 350) + randInt(5, 15), 200, 500),
  }
}

function updateDeterioratingVitals(current, speed = 'normal', ticks = 0) {
  // ── Gradual demo-friendly deterioration ──
  // Phase 1 (ticks 0–8):   Near-stable, subtle hints         (~72 sec)
  // Phase 2 (ticks 9–18):  Noticeable worsening, enters yellow (~80 sec)
  // Phase 3 (ticks 19+):   Rapid decline, enters red           (~16 sec)
  // Total: ~2.5 minutes from green to red

  let hr, spo2, rr, temp, pf_ratio

  if (ticks < 9) {
    // Phase 1: subtle — looks almost stable, tiny hints of trouble
    hr       = clamp(current.hr + randInt(0, 2), 80, 98)
    spo2     = clamp(current.spo2 - randInt(0, 1), 94, 98)
    rr       = clamp(current.rr + randInt(0, 1), 15, 20)
    temp     = roundTo(clamp(current.temp + randFloat(0, 0.1), 98.2, 99.0))
    pf_ratio = clamp((current.pf_ratio ?? 450) - randInt(5, 15), 320, 460)
  } else if (ticks < 19) {
    // Phase 2: moderate — clearly worsening, lungs struggling
    hr       = clamp(current.hr + randInt(1, 3), 95, 115)
    spo2     = clamp(current.spo2 - randInt(0, 2), 90, 96)
    rr       = clamp(current.rr + randInt(0, 2), 18, 28)
    temp     = roundTo(clamp(current.temp + randFloat(0.1, 0.2), 98.8, 100.5))
    pf_ratio = clamp((current.pf_ratio ?? 350) - randInt(10, 25), 200, 350)
  } else {
    // Phase 3: rapid — critical, lung failure
    hr       = clamp(current.hr + randInt(2, 5), 110, 160)
    spo2     = clamp(current.spo2 - randInt(1, 3), 80, 93)
    rr       = clamp(current.rr + randInt(1, 3), 24, 38)
    temp     = roundTo(clamp(current.temp + randFloat(0.1, 0.3), 99.5, 103.5))
    pf_ratio = clamp((current.pf_ratio ?? 250) - randInt(15, 30), 80, 220)
  }

  const newPlatelets = clamp((current.platelets ?? 150000) - randInt(3000, 8000), 10000, 300000)

  return {
    hr,
    spo2,
    rr,
    temp,
    bp: nextBloodPressure(current.bp, hr, 'deteriorating'),

    urine: clamp((current.urine ?? 40) - randInt(1, 3), 5, 60),
    liverFlag: current.liverFlag ?? false,
    bilirubin: roundTo(clamp((current.bilirubin ?? 1.0) + randFloat(0.1, 0.3), 0.5, 5)),
    eyeYellow: (current.bilirubin ?? 1.0) > 2.5,
    platelets: newPlatelets,
    confusion: newPlatelets < 50000 ? true : current.confusion,
    pf_ratio,
  }
}

function updatePatientVitals(patient) {
  const current = patient.currentVitals
  const ticks = patient.simulationTicks ?? 0

  if (patient.pattern === 'deteriorating') {
    return updateDeterioratingVitals(current, patient.deteriorationSpeed, ticks)
  }
  if (patient.pattern === 'recovering') {
    return updateRecoveringVitals(current)
  }

  return updateStableVitals(current)
}

function nextHistoryEntry(vitals, previousEntry) {
  return {
    time: nextClockTime(),
    hr: vitals.hr,
    spo2: vitals.spo2,
    rr: vitals.rr,
    temp: vitals.temp,
    bp: vitals.bp,

    urine: vitals.urine,
    liverFlag: vitals.liverFlag,
    bilirubin: vitals.bilirubin,
    eyeYellow: vitals.eyeYellow,
    platelets: vitals.platelets,
    confusion: vitals.confusion,
    pf_ratio: vitals.pf_ratio,

    note: previousEntry?.note ?? '',
  }
}

async function evolvePatient(patient) {
  const vitals = updatePatientVitals(patient)

  // 2% chance of random liver flag trigger on each tick
  if (Math.random() < 0.02) {
    vitals.liverFlag = true
  }

  const previousHistory = Array.isArray(patient.history) ? patient.history : []
  const entry = nextHistoryEntry(vitals, previousHistory.at(-1))
  const history = [...previousHistory, entry].slice(-180)
  const simulationTicks = (patient.simulationTicks ?? 0) + 1

  // ── Scoring: BLEND ML anomaly detection with rule-based organ scoring ──
  let riskScore
  let anomalyScore = 0
  let isAnomaly = false

  // Always calculate the rule-based score (organ-specific: lungs, kidneys, liver, etc.)
  const ruleScore = calculateRiskScore({ ...patient, currentVitals: vitals, history })

  const mlPrediction = await getMLPrediction(vitals)

  if (mlPrediction.riskScore > 0) {
    // ML backend is running — blend ML + rule-based for comprehensive scoring
    anomalyScore = mlPrediction.anomalyScore
    isAnomaly = mlPrediction.isAnomaly
    riskScore = calculateCombinedScore(ruleScore, anomalyScore)
  } else {
    // ML backend is down — use rule-based engine only
    riskScore = ruleScore
  }

  const status = getStatusFromScore(riskScore)

  // Also store the entry's risk score so history cards can use it
  entry.mlRiskScore = riskScore

  return {
    ...patient,
    currentVitals: vitals,
    history,
    riskScore,
    anomalyScore,
    isAnomaly,
    status,
    lastUpdated: entry.time,
    simulationTicks,
  }
}

export async function runSimulationCycle(patients) {
  if (!Array.isArray(patients)) {
    return []
  }

  return Promise.all(patients.map(evolvePatient))
}

export function startSimulation(setPatients, options = {}) {
  if (simulationTimeoutId) {
    return simulationTimeoutId
  }

  const { intervalMs = 8000, onPatientTurnedRed, patientsRef } = options

  async function tick() {
    // Read the latest patients from the ref (kept in sync by App.jsx)
    const previousPatients = patientsRef ? patientsRef.current : []

    if (!previousPatients || previousPatients.length === 0) {
      simulationTimeoutId = setTimeout(tick, intervalMs)
      return
    }

    const previousById = new Map(previousPatients.map((patient) => [patient.id, patient]))
    const nextPatients = await runSimulationCycle(previousPatients)

    setPatients(() => {
      if (typeof onPatientTurnedRed === 'function') {
        const escalatedPatients = nextPatients.filter((nextPatient) => {
          const previous = previousById.get(nextPatient.id)
          return previous && previous.status !== 'red' && nextPatient.status === 'red'
        })

        if (escalatedPatients.length > 0) {
          queueMicrotask(() => {
            escalatedPatients.forEach((patient) => onPatientTurnedRed(patient))
          })
        }
      }

      return nextPatients
    })

    // Schedule next tick
    simulationTimeoutId = setTimeout(tick, intervalMs)
  }

  // Start the first tick
  simulationTimeoutId = setTimeout(tick, intervalMs)
  return simulationTimeoutId
}

export function stopSimulation() {
  if (!simulationTimeoutId) {
    return
  }

  clearTimeout(simulationTimeoutId)
  simulationTimeoutId = null
}

export function isSimulationRunning() {
  return simulationTimeoutId !== null
}
