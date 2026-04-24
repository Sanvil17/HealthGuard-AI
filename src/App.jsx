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
  urine: 40,
  liverFlag: false,
  bilirubin: 1.0,
  eyeYellow: false,

  // ✅ NEW
  platelets: 150000,
  confusion: false,
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

  const current = selectedPatient?.currentVitals ?? {}

  const kidneyRisk =
    current.urine !== undefined && current.urine < 30

  const heartRisk =
    current.hr > 110 ||
    (current.hr > 100 && current.spo2 < 94)

  const liverRisk =
    current.liverFlag ||
    current.eyeYellow ||
    (current.bilirubin !== undefined && current.bilirubin > 2)

  // ✅ NEW
  const plateletRisk =
    current.platelets !== undefined && current.platelets < 100000

  const brainRisk =
    current.confusion === true

  const requestAiExplanation = useCallback(async (patient) => {
    if (!patient || aiInFlightRef.current.has(patient.id)) return

    aiInFlightRef.current.add(patient.id)
    setAiLoadingByPatient((previous) => ({ ...previous, [patient.id]: true }))

    try {
      const explanation = await generateClinicalExplanation(patient)
      setPatients((previousPatients) => {
        return previousPatients.map((item) => {
          if (item.id !== patient.id) return item
          return { ...item, aiExplanation: explanation }
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

        if (autoTriggeredInRedRef.current.has(patient.id)) return

        autoTriggeredInRedRef.current.add(patient.id)
        void requestAiExplanation(patient)
      },
    })

    return () => stopSimulation()
  }, [requestAiExplanation])

  return (
    <div className="min-h-screen bg-app-bg text-slate-100">
      <AlertBanner alert={activeAlert} onClose={() => setActiveAlert(null)} />

      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-8 lg:grid-cols-[1.3fr_1fr] lg:px-6">

        <WardDashboard
          patients={patients}
          selectedPatientId={selectedPatient?.id ?? null}
          onSelectPatient={setSelectedPatientId}
        />

        <section className="rounded-2xl border border-slate-700/70 bg-app-panel p-4 shadow-lg shadow-black/30">
          {selectedPatient && (
            <>
              <RiskScore score={selectedPatient.riskScore} status={selectedPatient.status} />

              <div className="grid grid-cols-2 gap-2">

                <div className="bg-app-card p-2">
                  Urine: {(current.urine ?? '--')}
                </div>

                <div className="bg-app-card p-2">
                  Kidney: {kidneyRisk ? "🚨 Risk" : "Normal"}
                </div>

                <div className="bg-app-card p-2">
                  Heart: {heartRisk ? "🚨 Risk" : "Normal"}
                </div>

                <div className="bg-app-card p-2">
                  Liver: {liverRisk ? "🚨 Risk" : "Normal"}
                </div>

                <div className="bg-app-card p-2">
                  Bilirubin: {current.bilirubin ?? '--'}
                </div>

                <div className="bg-app-card p-2">
                  Eyes: {current.eyeYellow ? "⚠️ Yellow" : "Normal"}
                </div>

                {/* ✅ NEW */}
                <div className="bg-app-card p-2">
                  Platelets: {current.platelets ?? '--'}
                </div>

                <div className="bg-app-card p-2">
                  Brain: {brainRisk ? "🚨 Confused" : "Normal"}
                </div>

                <div className="bg-app-card p-2">
                  HR: {current.hr}
                </div>

                <div className="bg-app-card p-2">
                  SpO2: {current.spo2}
                </div>

              </div>

              <VitalsGraph history={selectedPatient.history} />

              <AIExplanation
                explanation={selectedPatient.aiExplanation}
                loading={Boolean(aiLoadingByPatient[selectedPatient.id])}
              />

              <button onClick={() => requestAiExplanation(selectedPatient)}>
                Explain
              </button>

              <ReportButton patient={selectedPatient} />
            </>
          )}
        </section>

      </main>
    </div>
  )
}

export default App