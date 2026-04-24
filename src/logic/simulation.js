import { calculateRiskScore, getStatusFromScore } from './riskEngine.js'
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
  const hr = clamp(current.hr + randInt(-2, 2), 55, 100)
  const spo2 = clamp(current.spo2 + randInt(-1, 1), 95, 100)
  const rr = clamp(current.rr + randInt(-1, 1), 12, 20)
  const temp = roundTo(clamp(current.temp + randFloat(-0.2, 0.2), 97.4, 99.2))

  return {
    hr,
    spo2,
    rr,
    temp,
    bp: nextBloodPressure(current.bp, hr, 'stable'),

    urine: clamp((current.urine ?? 40) + randInt(-1, 1), 30, 60),
    liverFlag: current.liverFlag ?? false,
    bilirubin: roundTo(clamp((current.bilirubin ?? 1.0) + randFloat(-0.1, 0.1), 0.5, 1.8)),
    eyeYellow: false,
    platelets: clamp((current.platelets ?? 150000) + randInt(-1000, 1000), 120000, 300000),
    confusion: false,
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
  }
}

function updateDeterioratingVitals(current, speed = 'normal', ticks = 0) {
  // ── Gradual demo-friendly deterioration ──
  // Phase 1 (ticks 0–5):  Near-stable, subtle hints
  // Phase 2 (ticks 6–12): Noticeable worsening, enters yellow
  // Phase 3 (ticks 13+):  Rapid decline, enters red

  let hr, spo2, rr, temp

  if (ticks < 6) {
    // Phase 1: subtle — looks almost stable
    hr   = clamp(current.hr + randInt(0, 2), 88, 100)
    spo2 = clamp(current.spo2 - randInt(0, 1), 94, 98)
    rr   = clamp(current.rr + randInt(0, 1), 16, 20)
    temp = roundTo(clamp(current.temp + randFloat(0, 0.1), 98.4, 99.2))
  } else if (ticks < 13) {
    // Phase 2: moderate — clearly worsening
    hr   = clamp(current.hr + randInt(1, 3), 95, 112)
    spo2 = clamp(current.spo2 - randInt(0, 2), 90, 96)
    rr   = clamp(current.rr + randInt(0, 2), 18, 26)
    temp = roundTo(clamp(current.temp + randFloat(0.1, 0.2), 98.8, 100.2))
  } else {
    // Phase 3: rapid — critical
    hr   = clamp(current.hr + randInt(2, 4), 105, 160)
    spo2 = clamp(current.spo2 - randInt(1, 2), 80, 94)
    rr   = clamp(current.rr + randInt(1, 2), 22, 36)
    temp = roundTo(clamp(current.temp + randFloat(0.1, 0.3), 99.2, 103.5))
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

  // ── Scoring: try ML backend, fallback to rule-based engine ──
  let riskScore
  let anomalyScore = 0
  let isAnomaly = false

  const mlPrediction = await getMLPrediction(vitals)

  if (mlPrediction.riskScore > 0) {
    // ML backend is running and returned a real score
    riskScore = mlPrediction.riskScore
    anomalyScore = mlPrediction.anomalyScore
    isAnomaly = mlPrediction.isAnomaly
  } else {
    // ML backend is down — use rule-based engine as fallback
    riskScore = calculateRiskScore({ ...patient, currentVitals: vitals, history })
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
