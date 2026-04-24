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

function getTrendArrow(previous, current, smallerIsBetter = false) {
  if (!Number.isFinite(previous) || !Number.isFinite(current) || previous === current) {
    return '→'
  }

  const isIncreasing = current > previous
  const positiveTrend = smallerIsBetter ? !isIncreasing : isIncreasing
  return positiveTrend ? '↑' : '↓'
}

function getPatientRiskFactors(patient, entry) {
  const current = entry ?? patient.currentVitals
  const previous = patient.history.at(-2) ?? patient.history.at(-1) ?? current

  const factors = []

  if (Number(current.hr) >= Number(previous.hr)) {
    factors.push(`Heart Rate ${getTrendArrow(previous.hr, current.hr)}`)
  }
  if (Number(current.spo2) <= Number(previous.spo2)) {
    factors.push(`SpO2 ${getTrendArrow(previous.spo2, current.spo2, true)}`)
  }
  if (Number(current.rr) >= Number(previous.rr)) {
    factors.push(`RR ${getTrendArrow(previous.rr, current.rr)}`)
  }
  if (Number(current.temp) >= Number(previous.temp)) {
    factors.push(`Temp ${getTrendArrow(previous.temp, current.temp)}`)
  }

  if (factors.length === 0) {
    factors.push('Vitals stable')
  }

  return factors.join(', ')
}

function getAlertLabel(status) {
  if (status === 'red') {
    return 'CRITICAL'
  }
  if (status === 'yellow') {
    return 'WARNING'
  }

  return 'STABLE'
}

function getSnapshotScore(patient, entryIndex) {
  const historySlice = patient.history.slice(0, entryIndex + 1)
  const snapshotVitals = historySlice.at(-1) ?? patient.currentVitals

  return calculateRiskScore({
    ...patient,
    currentVitals: snapshotVitals,
    history: historySlice,
  })
}

function buildVisitNoteEntry(patient, note, time) {
  return {
    time,
    hr: patient.currentVitals.hr,
    spo2: patient.currentVitals.spo2,
    rr: patient.currentVitals.rr,
    temp: patient.currentVitals.temp,
    bp: patient.currentVitals.bp,
    note,
  }
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
  const [nurseNoteDrafts, setNurseNoteDrafts] = useState({})
  const [nurseNotePanelOpen, setNurseNotePanelOpen] = useState({})
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

  const handleSaveNurseNote = useCallback(() => {
    if (!selectedPatientId) {
      return
    }

    const note = String(nurseNoteDrafts[selectedPatientId] ?? '').trim()
    if (!note) {
      return
    }

    const noteTime = getClockTime()

    setPatients((previousPatients) => {
      return previousPatients.map((patient) => {
        if (patient.id !== selectedPatientId) {
          return patient
        }

        const nextHistory = [...patient.history, buildVisitNoteEntry(patient, note, noteTime)].slice(-180)
        const nextRiskScore = calculateRiskScore({
          ...patient,
          currentVitals: patient.currentVitals,
          history: nextHistory,
        })

        return {
          ...patient,
          history: nextHistory,
          riskScore: nextRiskScore,
          status: getStatusFromScore(nextRiskScore),
          lastUpdated: noteTime,
        }
      })
    })

    setNurseNoteDrafts((previous) => ({
      ...previous,
      [selectedPatientId]: '',
    }))
  }, [nurseNoteDrafts, selectedPatientId])

  const toggleNurseNotePanel = useCallback((patientId) => {
    setNurseNotePanelOpen((previous) => ({
      ...previous,
      [patientId]: !previous[patientId],
    }))
  }, [])

  const isSelectedPatientCritical = selectedPatient?.status === 'red'
  const isSelectedPatientNotePanelOpen = Boolean(
    selectedPatient && (isSelectedPatientCritical || nurseNotePanelOpen[selectedPatient.id]),
  )

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900">
      <AlertBanner alert={activeAlert} onClose={() => setActiveAlert(null)} />

      <header className="flex items-center justify-between border-b border-white/60 bg-[#0F766E] px-6 py-4 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-sm font-bold">
            HG
          </div>
          <div>
            <h1 className="text-lg font-semibold">HealthGuard AI</h1>
            <p className="text-xs text-emerald-50/80">Patient Monitoring Dashboard</p>
          </div>
        </div>

        <nav className="hidden flex-1 items-center justify-center px-4 lg:flex">
          <div className="flex items-center gap-1 rounded-full bg-white/10 p-1.5 text-sm backdrop-blur-sm">
            {['Dashboard', 'Patients', 'Appointment', 'Other', 'Settings'].map((item, index) => (
              <button
                key={item}
                type="button"
                className={index === 0
                  ? 'rounded-full bg-[#5FD1B7] px-5 py-2 text-sm font-medium text-white shadow-sm'
                  : 'rounded-full px-5 py-2 text-sm text-white/90 transition hover:bg-white/10'}
              >
                {item}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex items-center gap-4 text-white/90">
          <button type="button" className="text-lg transition hover:text-white" aria-label="Search">
            ⌕
          </button>
          <button type="button" className="text-lg transition hover:text-white" aria-label="Notifications">
            🔔
          </button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20" />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium">Jack Daniel</p>
              <p className="text-xs text-emerald-50/80">Admin</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-6">
        <div className="mb-6">
          <p className="text-xl font-semibold text-gray-900">Welcome back, Jack!</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <WardDashboard
            patients={patients}
            selectedPatientId={selectedPatient?.id ?? null}
            onSelectPatient={setSelectedPatientId}
            onAddPatient={() => setIsAddPatientOpen(true)}
          />

          <section className="dashboard-panel p-5">
            {selectedPatient ? (
              <>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedPatient.name}
                    </h2>
                    <p className="text-xs text-gray-500">
                      Bed {selectedPatient.bed} • Last update {selectedPatient.lastUpdated}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {selectedPatient.story || 'No clinical story available.'}
                    </p>
                  </div>
                  <RiskScore score={selectedPatient.riskScore} status={selectedPatient.status} />
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 text-sm text-gray-800">
                  <div className="dashboard-card p-3">HR: {selectedPatient.currentVitals.hr} bpm</div>
                  <div className="dashboard-card p-3">SpO2: {selectedPatient.currentVitals.spo2}%</div>
                  <div className="dashboard-card p-3">RR: {selectedPatient.currentVitals.rr} /min</div>
                  <div className="dashboard-card p-3">Temp: {selectedPatient.currentVitals.temp} F</div>
                  <div className="dashboard-card col-span-2 p-3">BP: {selectedPatient.currentVitals.bp}</div>
                </div>

                <div className="mb-4 dashboard-card p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Vitals Trend
                  </p>
                  <VitalsGraph history={selectedPatient.history} />
                </div>

                <div className="mb-4 dashboard-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                      History & Nurse Notes
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Latest entries from this patient</span>
                      {isSelectedPatientCritical ? (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-600">
                          Critical note open
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleNurseNotePanel(selectedPatient.id)}
                          className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600 transition hover:bg-emerald-100"
                        >
                          {nurseNotePanelOpen[selectedPatient.id] ? 'Hide note' : 'Add note'}
                        </button>
                      )}
                    </div>
                  </div>

                  {isSelectedPatientNotePanelOpen ? (
                    <div className="mb-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        Nurse Visit Note
                      </p>
                      <p className="mb-3 text-xs text-emerald-700/80">
                        Use this for scheduled hourly rounds or whenever the patient needs a warning check.
                      </p>
                      <textarea
                        value={nurseNoteDrafts[selectedPatient.id] ?? ''}
                        onChange={(event) => {
                          const value = event.target.value
                          setNurseNoteDrafts((previous) => ({
                            ...previous,
                            [selectedPatient.id]: value,
                          }))
                        }}
                        placeholder="Example: Patient resting comfortably, vitals stable, continue monitoring."
                        className="min-h-24 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#0F766E]"
                      />

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-emerald-700/70">
                          Saving will timestamp this note into the patient history.
                        </p>
                        <button
                          type="button"
                          onClick={handleSaveNurseNote}
                          className="dashboard-button px-4 py-2 text-sm font-medium"
                        >
                          Save Visit Note
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {selectedPatient.history
                      .slice()
                      .reverse()
                      .slice(0, 4)
                      .map((entry, reverseIndex) => {
                      const entryIndex = selectedPatient.history.length - 1 - reverseIndex
                      const factorText = getPatientRiskFactors(selectedPatient, entry)
                      const snapshotScore = getSnapshotScore(selectedPatient, entryIndex)
                      const snapshotStatus = getStatusFromScore(snapshotScore)
                      const isCritical = snapshotStatus === 'red'
                      const isWarning = snapshotStatus === 'yellow'
                      const labelClass = isCritical
                        ? 'text-red-500'
                        : isWarning
                          ? 'text-orange-500'
                          : 'text-green-600'
                      const scoreClass = isCritical
                        ? 'text-red-500'
                        : isWarning
                          ? 'text-orange-500'
                          : 'text-green-600'
                      const cardClass = isCritical
                        ? 'border-red-200 bg-red-50'
                        : isWarning
                          ? 'border-orange-200 bg-orange-50'
                          : 'border-green-200 bg-green-50'

                      return (
                        <article
                          key={`${entry.time}-${entry.hr}-${entry.spo2}`}
                          className={`rounded-xl border px-4 py-3 ${cardClass}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-semibold uppercase tracking-[0.12em] ${labelClass}`}>
                                {getAlertLabel(snapshotStatus)}
                              </p>
                              <p className="mt-1 text-sm text-gray-700">
                                Risk factors: {factorText}
                              </p>
                              <p className="mt-2 text-xs text-gray-500">
                                {entry.time}
                              </p>
                              <p className="mt-1 text-sm text-gray-600">
                                Nurse Note: {entry.note || 'Pending'}
                              </p>
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                              <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${labelClass}`}>
                                {getAlertLabel(snapshotStatus)}
                              </span>
                              <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200">
                                Score: <span className={scoreClass}>{snapshotScore}</span>
                              </div>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>

                <AIExplanation
                  explanation={selectedPatient.aiExplanation}
                  loading={Boolean(aiLoadingByPatient[selectedPatient.id])}
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void requestAiExplanation(selectedPatient)}
                    className="dashboard-button px-4 py-2 text-sm font-medium"
                  >
                    Explain Now
                  </button>
                  <ReportButton patient={selectedPatient} />
                </div>
              </>
            ) : (
              <div className="dashboard-card p-4 text-sm text-gray-500">
                Select a patient to see details.
              </div>
            )}
          </section>
        </div>
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
