import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { generateClinicalExplanation } from './api/gemini'
import AIExplanation from './components/AIExplanation'
import AlertBanner from './components/AlertBanner'
import AddPatientModal from './components/AddPatientModal'
import ReportButton from './components/ReportButton'
import RiskScore from './components/RiskScore'
import VitalsGraph from './components/VitalsGraph'
import WardDashboard from './components/WardDashboard'
import { mockPatients } from './data/mockPatients'
import { calculateRiskScore, getStatusFromScore } from './logic/riskEngine'
import { startSimulation, stopSimulation } from './logic/simulation'

const fallbackVitals = {
  hr: 80,
  spo2: 98,
  rr: 16,
  temp: 98.6,
  bp: '120/80',
}

const PATIENTS_STORAGE_KEY = 'healthguard-ai-patients'

function getClockTime() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getNextPatientId(patients) {
  const highestIdNumber = patients.reduce((highest, patient) => {
    const numeric = Number(String(patient.id).replace(/\D/g, ''))
    if (!Number.isFinite(numeric)) {
      return highest
    }

    return Math.max(highest, numeric)
  }, 0)

  return `P${String(highestIdNumber + 1).padStart(3, '0')}`
}

function getNextBedId(patients) {
  const highestBedNumber = patients.reduce((highest, patient) => {
    const numeric = Number(String(patient.bed).replace(/\D/g, ''))
    if (!Number.isFinite(numeric)) {
      return highest
    }

    return Math.max(highest, numeric)
  }, 0)

  return `B${String(highestBedNumber + 1).padStart(2, '0')}`
}

function createAlertPayload(patient) {
  return {
    id: `${patient.id}-${Date.now()}`,
    patientName: patient.name,
    score: patient.riskScore,
    time: new Date().toLocaleTimeString(),
  }
}

function buildPatientFromDraft(draftPatient, patients) {
  const createdAt = getClockTime()
  const currentVitals = {
    hr: Number(draftPatient.currentVitals.hr),
    spo2: Number(draftPatient.currentVitals.spo2),
    rr: Number(draftPatient.currentVitals.rr),
    temp: Number(draftPatient.currentVitals.temp),
    bp: String(draftPatient.currentVitals.bp || fallbackVitals.bp),
  }

  const nextPatient = {
    id: getNextPatientId(patients),
    name: draftPatient.name,
    bed: draftPatient.bed,
    pattern: draftPatient.pattern,
    deteriorationSpeed: draftPatient.pattern === 'deteriorating' ? 'normal' : undefined,
    story: draftPatient.note || 'Added manually by nurse.',
    currentVitals,
    history: [
      {
        time: createdAt,
        ...currentVitals,
        note: draftPatient.note || 'Initial intake recorded.',
      },
    ],
    aiExplanation: '',
    simulationTicks: 0,
  }

  const riskScore = calculateRiskScore(nextPatient)

  return {
    ...nextPatient,
    riskScore,
    status: getStatusFromScore(riskScore),
    lastUpdated: createdAt,
  }
}

function hydratePatients(seedPatients) {
  return seedPatients.map((patient) => {
    const history = Array.isArray(patient.history) ? patient.history : []
    const currentVitals = patient.currentVitals ?? history.at(-1) ?? fallbackVitals
    const riskScore = calculateRiskScore({ ...patient, currentVitals, history })

    return {
      ...patient,
      currentVitals,
      history,
      riskScore,
      status: getStatusFromScore(riskScore),
      aiExplanation: patient.aiExplanation ?? '',
      lastUpdated: history.at(-1)?.time ?? 'Now',
    }
  })
}

function loadInitialPatients() {
  if (typeof window === 'undefined') {
    return hydratePatients(mockPatients)
  }

  const storedPatients = window.localStorage.getItem(PATIENTS_STORAGE_KEY)
  if (!storedPatients) {
    return hydratePatients(mockPatients)
  }

  try {
    const parsedPatients = JSON.parse(storedPatients)
    if (!Array.isArray(parsedPatients)) {
      throw new Error('Stored patient data must be an array.')
    }

    return hydratePatients(parsedPatients)
  } catch {
    window.localStorage.removeItem(PATIENTS_STORAGE_KEY)
    return hydratePatients(mockPatients)
  }
}

function App() {
  const [patients, setPatients] = useState(loadInitialPatients)
  const [selectedPatientId, setSelectedPatientId] = useState(
    () => mockPatients[0]?.id ?? null,
  )
  const [activeAlert, setActiveAlert] = useState(null)
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false)
  const [aiLoadingByPatient, setAiLoadingByPatient] = useState({})

  const autoTriggeredInRedRef = useRef(new Set())
  const aiInFlightRef = useRef(new Set())
  const aiRequestSessionRef = useRef(0)
  const patientsRef = useRef(patients)

  useEffect(() => {
    patientsRef.current = patients
    window.localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients))
  }, [patients])

  const selectedPatient = useMemo(() => {
    return patients.find((patient) => patient.id === selectedPatientId) ?? patients[0] ?? null
  }, [patients, selectedPatientId])

  const requestAiExplanation = useCallback(async (patient) => {
    if (!patient || aiInFlightRef.current.has(patient.id)) {
      return
    }

    const requestSession = aiRequestSessionRef.current
    aiInFlightRef.current.add(patient.id)
    setAiLoadingByPatient((previous) => ({ ...previous, [patient.id]: true }))

    try {
      const explanation = await generateClinicalExplanation(patient)
      if (requestSession !== aiRequestSessionRef.current) {
        return
      }

      setPatients((previousPatients) => {
        return previousPatients.map((item) => {
          if (item.id !== patient.id) {
            return item
          }

          return {
            ...item,
            aiExplanation: explanation,
          }
        })
      })
    } finally {
      aiInFlightRef.current.delete(patient.id)
      setAiLoadingByPatient((previous) => ({ ...previous, [patient.id]: false }))
    }
  }, [])

  useEffect(() => {
    for (const patient of patients) {
      if (patient.status !== 'red') {
        autoTriggeredInRedRef.current.delete(patient.id)
      }
    }
  }, [patients])

  useEffect(() => {
    startSimulation(setPatients, {
      intervalMs: 5000,
      patientsRef,
      onPatientTurnedRed: (patient) => {
        setActiveAlert(createAlertPayload(patient))

        if (autoTriggeredInRedRef.current.has(patient.id)) {
          return
        }

        autoTriggeredInRedRef.current.add(patient.id)
        void requestAiExplanation(patient)
      },
    })

    return () => {
      stopSimulation()
    }
  }, [requestAiExplanation])

  const suggestedBed = useMemo(() => getNextBedId(patients), [patients])

  const handleResetWard = useCallback(() => {
    aiRequestSessionRef.current += 1
    autoTriggeredInRedRef.current.clear()
    aiInFlightRef.current.clear()
    window.localStorage.removeItem(PATIENTS_STORAGE_KEY)
    setPatients(hydratePatients(mockPatients))
    setSelectedPatientId(mockPatients[0]?.id ?? null)
    setActiveAlert(null)
    setAiLoadingByPatient({})
    setIsAddPatientOpen(false)
  }, [])

  const handleAddPatient = useCallback(
    (draftPatient) => {
      const nextPatient = buildPatientFromDraft(draftPatient, patients)

      setPatients((previousPatients) => [...previousPatients, nextPatient])
      setSelectedPatientId(nextPatient.id)
      setIsAddPatientOpen(false)

      if (nextPatient.status !== 'red') {
        return
      }

      autoTriggeredInRedRef.current.add(nextPatient.id)
      setActiveAlert(createAlertPayload(nextPatient))
      void requestAiExplanation(nextPatient)
    },
    [patients, requestAiExplanation],
  )

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-app-bg text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="atmo-orb atmo-orb-a" />
        <div className="atmo-orb atmo-orb-b" />
        <div className="atmo-orb atmo-orb-c" />
      </div>

      <AlertBanner alert={activeAlert} onClose={() => setActiveAlert(null)} />

      <header className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="max-w-xl">
          <p className="mb-2 text-xs uppercase tracking-[0.28em] text-cyan-200/80">
            Athernex 2025 Live Ward Monitor
          </p>
          <h1 className="font-display text-2xl font-bold text-white lg:text-4xl">
            HealthGuard AI
          </h1>
          <p className="text-sm text-slate-300 lg:text-base">
            Real-time deterioration prediction for ward patients.
          </p>

          <div className="ecg-track mt-4">
            <svg className="ecg-wave" viewBox="0 0 400 48" preserveAspectRatio="none">
              <path d="M0 24 L32 24 L40 24 L50 12 L60 34 L68 24 L110 24 L128 24 L138 10 L150 36 L160 24 L206 24 L220 24 L230 13 L240 34 L248 24 L286 24 L302 24 L312 10 L326 36 L338 24 L400 24" />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetWard}
            className="rounded-xl border border-slate-500/80 bg-slate-800/50 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-rose-300/80 hover:bg-rose-500/15 hover:text-rose-50"
          >
            Reset Ward
          </button>
          <button
            type="button"
            onClick={() => setIsAddPatientOpen(true)}
            className="rounded-xl border border-cyan-300/70 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-400/25"
          >
            + Add Patient
          </button>
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold tracking-wide text-cyan-100">
            Simulation Live
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-8 lg:grid-cols-[1.25fr_1fr] lg:px-6">
        <WardDashboard
          patients={patients}
          selectedPatientId={selectedPatient?.id ?? null}
          onSelectPatient={setSelectedPatientId}
          onAddPatient={() => setIsAddPatientOpen(true)}
        />

        <section className="detail-panel rounded-2xl border border-slate-700/70 p-4 shadow-2xl shadow-black/35">
          {selectedPatient ? (
            <>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white lg:text-xl">
                    {selectedPatient.name}
                  </h2>
                  <p className="text-xs text-slate-300">
                    Bed {selectedPatient.bed} • Last update {selectedPatient.lastUpdated}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {selectedPatient.story || 'No clinical story available.'}
                  </p>
                </div>
                <RiskScore score={selectedPatient.riskScore} status={selectedPatient.status} />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-sm text-slate-100">
                <div className="rounded-lg border border-slate-700/70 bg-app-card/80 p-2">
                  HR: {selectedPatient.currentVitals.hr} bpm
                </div>
                <div className="rounded-lg bg-app-card p-2">
                  SpO2: {selectedPatient.currentVitals.spo2}%
                </div>
                <div className="rounded-lg border border-slate-700/70 bg-app-card/80 p-2">
                  RR: {selectedPatient.currentVitals.rr} /min
                </div>
                <div className="rounded-lg bg-app-card p-2">
                  Temp: {selectedPatient.currentVitals.temp} F
                </div>
                <div className="col-span-2 rounded-lg bg-app-card p-2">
                  BP: {selectedPatient.currentVitals.bp}
                </div>
              </div>

              <div className="mb-4 rounded-xl bg-app-card p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Vitals Trend
                </p>
                <VitalsGraph history={selectedPatient.history} />
              </div>

              <AIExplanation
                explanation={selectedPatient.aiExplanation}
                loading={Boolean(aiLoadingByPatient[selectedPatient.id])}
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void requestAiExplanation(selectedPatient)}
                  className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Explain Now
                </button>
                <ReportButton patient={selectedPatient} />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-app-card p-4 text-sm text-slate-300">
              Select a patient to see details.
            </div>
          )}
        </section>
      </main>

      {isAddPatientOpen ? (
        <AddPatientModal
          onClose={() => setIsAddPatientOpen(false)}
          onSubmit={handleAddPatient}
          suggestedBed={suggestedBed}
        />
      ) : null}
    </div>
  )
}

export default App
