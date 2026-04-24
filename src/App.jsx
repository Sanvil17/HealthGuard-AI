import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { generateClinicalExplanation } from './api/gemini'
import AIExplanation from './components/AIExplanation'
import AlertBanner from './components/AlertBanner'
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
        setActiveAlert({
          id: `${patient.id}-${Date.now()}`,
          patientName: patient.name,
          score: patient.riskScore,
          time: new Date().toLocaleTimeString(),
        })

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

  return (
    <div className="min-h-screen bg-app-bg text-slate-100">
      <AlertBanner alert={activeAlert} onClose={() => setActiveAlert(null)} />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
            HealthGuard AI
          </h1>
          <p className="text-sm text-slate-300">
            Real-time deterioration prediction for ward patients.
          </p>
        </div>
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs text-cyan-100">
          Simulation Live
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-8 lg:grid-cols-[1.3fr_1fr] lg:px-6">
        <WardDashboard
          patients={patients}
          selectedPatientId={selectedPatient?.id ?? null}
          onSelectPatient={setSelectedPatientId}
        />

        <section className="rounded-2xl border border-slate-700/70 bg-app-panel p-4 shadow-lg shadow-black/30">
          {selectedPatient ? (
            <>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selectedPatient.name}
                  </h2>
                  <p className="text-xs text-slate-300">
                    Bed {selectedPatient.bed} • Last update {selectedPatient.lastUpdated}
                  </p>
                </div>
                <RiskScore score={selectedPatient.riskScore} status={selectedPatient.status} />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-sm text-slate-100">
                <div className="rounded-lg bg-app-card p-2">HR: {selectedPatient.currentVitals.hr}</div>
                <div className="rounded-lg bg-app-card p-2">
                  SpO2: {selectedPatient.currentVitals.spo2}%
                </div>
                <div className="rounded-lg bg-app-card p-2">RR: {selectedPatient.currentVitals.rr}</div>
                <div className="rounded-lg bg-app-card p-2">
                  Temp: {selectedPatient.currentVitals.temp}
                </div>
                <div className="col-span-2 rounded-lg bg-app-card p-2">
                  BP: {selectedPatient.currentVitals.bp}
                </div>
              </div>

              <div className="mb-4 rounded-xl bg-app-card p-3">
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
                  className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
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
    </div>
  )
}

export default App
