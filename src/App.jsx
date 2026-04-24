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

function App() {
  const [patients, setPatients] = useState(() => hydratePatients(mockPatients))
  const [selectedPatientId, setSelectedPatientId] = useState(
    () => mockPatients[0]?.id ?? null,
  )
  const [activeAlert, setActiveAlert] = useState(null)
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false)
  const [aiLoadingByPatient, setAiLoadingByPatient] = useState({})

  const autoTriggeredInRedRef = useRef(new Set())
  const aiInFlightRef = useRef(new Set())

  const selectedPatient = useMemo(() => {
    return patients.find((patient) => patient.id === selectedPatientId) ?? patients[0] ?? null
  }, [patients, selectedPatientId])

  const requestAiExplanation = useCallback(async (patient) => {
    if (!patient || aiInFlightRef.current.has(patient.id)) {
      return
    }

    aiInFlightRef.current.add(patient.id)
    setAiLoadingByPatient((previous) => ({ ...previous, [patient.id]: true }))

    try {
      const explanation = await generateClinicalExplanation(patient)
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
    <div className="min-h-screen bg-[#0B1320] text-gray-200">
      <AlertBanner alert={activeAlert} onClose={() => setActiveAlert(null)} />

      <header className="flex items-center justify-between border-b border-white/5 bg-[#0F172A] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-white">HealthGuard AI</h1>
          <p className="text-xs text-gray-400">Patient Monitoring Dashboard</p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-green-400">● Live</span>
          <button
            type="button"
            onClick={() => setIsAddPatientOpen(true)}
            className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Add Patient
          </button>
          <button type="button" className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            Alerts
          </button>
          <button type="button" className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            Logout
          </button>
        </div>
      </header>

      <main className="grid gap-5 px-6 py-5 lg:grid-cols-[1.25fr_1fr]">
        <WardDashboard
          patients={patients}
          selectedPatientId={selectedPatient?.id ?? null}
          onSelectPatient={setSelectedPatientId}
          onAddPatient={() => setIsAddPatientOpen(true)}
        />

        <section className="detail-panel rounded-xl border border-white/5 p-5">
          {selectedPatient ? (
            <>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selectedPatient.name}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Bed {selectedPatient.bed} • Last update {selectedPatient.lastUpdated}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {selectedPatient.story || 'No clinical story available.'}
                  </p>
                </div>
                <RiskScore score={selectedPatient.riskScore} status={selectedPatient.status} />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-sm text-slate-100">
                <div className="clean-card p-2">
                  HR: {selectedPatient.currentVitals.hr} bpm
                </div>
                <div className="clean-card p-2">
                  SpO2: {selectedPatient.currentVitals.spo2}%
                </div>
                <div className="clean-card p-2">
                  RR: {selectedPatient.currentVitals.rr} /min
                </div>
                <div className="clean-card p-2">
                  Temp: {selectedPatient.currentVitals.temp} F
                </div>
                <div className="clean-card col-span-2 p-2">
                  BP: {selectedPatient.currentVitals.bp}
                </div>
              </div>

              <div className="mb-4 clean-card p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
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
                  className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Explain Now
                </button>
                <ReportButton patient={selectedPatient} />
              </div>
            </>
          ) : (
            <div className="clean-card p-4 text-sm text-gray-400">
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
