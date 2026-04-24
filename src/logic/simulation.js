import { calculateRiskScore, calculateCombinedScore, getStatusFromScore } from './riskEngine.js'
import { getAnomalyScore } from '../api/mlBackend.js'

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
  const hr = clamp(current.hr + randInt(-2, 2), 55, 110)
  const spo2 = clamp(current.spo2 + randInt(-1, 1), 92, 100)
  const rr = clamp(current.rr + randInt(-1, 1), 12, 24)
  const temp = clamp(current.temp + randFloat(-0.2, 0.2), 97.4, 100.2)

  return {
    hr,
    spo2,
    rr,
    temp,
    bp: nextBloodPressure(current.bp, hr, 'stable'),
  }
}

function updateRecoveringVitals(current) {
  const hr = clamp(current.hr - randInt(1, 3), 60, 100)
  const spo2 = clamp(current.spo2 + randInt(0, 2), 93, 100)
  const rr = clamp(current.rr - randInt(0, 2), 12, 20)
  const temp = clamp(current.temp - randFloat(0, 0.2), 97.2, 99.3)

  return {
    hr,
    spo2,
    rr,
    temp,
    bp: nextBloodPressure(current.bp, hr, 'recovering'),
  }
}

function updateDemoDeterioratingVitals(current, ticks) {
  if (ticks < 24) {
    const hr = clamp(current.hr + randInt(-1, 1), 88, 97)
    const spo2 = clamp(current.spo2 + randInt(-1, 1), 95, 98)
    const rr = clamp(current.rr + randInt(-1, 1), 16, 20)
    const temp = clamp(current.temp + randFloat(-0.1, 0.1), 98.4, 99.1)

    return {
      hr,
      spo2,
      rr,
      temp,
      bp: nextBloodPressure(current.bp, hr, 'stable'),
    }
  }

  if (ticks < 36) {
    const hr = clamp(current.hr + randInt(1, 2), 90, 102)
    const spo2 = clamp(current.spo2 - randInt(0, 1), 94, 97)
    const rr = clamp(current.rr + randInt(0, 1), 17, 22)
    const temp = clamp(current.temp + randFloat(0, 0.1), 98.6, 99.5)

    return {
      hr,
      spo2,
      rr,
      temp,
      bp: nextBloodPressure(current.bp, hr, 'deteriorating'),
    }
  }

  const hr = clamp(current.hr + randInt(2, 4), 95, 176)
  const spo2 = clamp(current.spo2 - randInt(1, 2), 78, 96)
  const rr = clamp(current.rr + randInt(1, 2), 18, 36)
  const temp = clamp(current.temp + randFloat(0.1, 0.3), 98.8, 103.5)

  return {
    hr,
    spo2,
    rr,
    temp,
    bp: nextBloodPressure(current.bp, hr, 'deteriorating'),
  }
}

function updateDeterioratingVitals(current, speed = 'normal', ticks = 0) {
  if (speed === 'demo') {
    return updateDemoDeterioratingVitals(current, ticks)
  }

  const fast = speed === 'fast'

  const hr = clamp(current.hr + randInt(fast ? 3 : 2, fast ? 6 : 5), 65, 180)
  const spo2 = clamp(current.spo2 - randInt(fast ? 2 : 1, 2), 78, 99)
  const rr = clamp(current.rr + randInt(1, fast ? 3 : 2), 14, 36)
  const temp = clamp(current.temp + randFloat(0.1, fast ? 0.4 : 0.3), 97.8, 103.5)

  return {
    hr,
    spo2,
    rr,
    temp,
    bp: nextBloodPressure(current.bp, hr, 'deteriorating'),
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
    note: previousEntry?.note ?? '',
  }
}

async function evolvePatient(patient) {
  const vitals = updatePatientVitals(patient)
  const previousHistory = Array.isArray(patient.history) ? patient.history : []
  const entry = nextHistoryEntry(vitals, previousHistory.at(-1))
  const history = [...previousHistory, entry].slice(-180)
  const simulationTicks = (patient.simulationTicks ?? 0) + 1

  const ruleScore = calculateRiskScore({ ...patient, currentVitals: vitals, history })

  // Call ML backend for anomaly score (falls back to 0 if backend is down)
  const anomalyScore = await getAnomalyScore(vitals)

  const riskScore = calculateCombinedScore(ruleScore, anomalyScore)
  const status = getStatusFromScore(riskScore)

  return {
    ...patient,
    currentVitals: vitals,
    history,
    riskScore,
    ruleScore,
    anomalyScore,
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

  const { intervalMs = 5000, onPatientTurnedRed, patientsRef } = options

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
