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
  urine: 40,
  liverFlag: false,
  bilirubin: 1.0,
  eyeYellow: false,
  platelets: 150000,
  confusion: false,
  pf_ratio: 450,
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

// ── UI helpers from UI branch ──────────────────────────────────────────

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
  if (status === 'red') return 'CRITICAL'
  if (status === 'yellow') return 'WARNING'
  return 'STABLE'
}

function getSnapshotScore(patient, entryIndex) {
  const entry = patient.history[entryIndex]
  // Use stored ML risk score if available (from simulation)
  if (entry?.mlRiskScore !== undefined) {
    return entry.mlRiskScore
  }
  // Fallback to rule-based calculation for old entries
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
    urine: patient.currentVitals.urine,
    liverFlag: patient.currentVitals.liverFlag,
    bilirubin: patient.currentVitals.bilirubin,
    eyeYellow: patient.currentVitals.eyeYellow,
    platelets: patient.currentVitals.platelets,
    confusion: patient.currentVitals.confusion,
    pf_ratio: patient.currentVitals.pf_ratio,
    note,
  }
}

// ── Patient lifecycle ──────────────────────────────────────────────────

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
    urine: fallbackVitals.urine,
    liverFlag: fallbackVitals.liverFlag,
    bilirubin: fallbackVitals.bilirubin,
    eyeYellow: fallbackVitals.eyeYellow,
    platelets: fallbackVitals.platelets,
    confusion: fallbackVitals.confusion,
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
    const currentVitals = { ...fallbackVitals, ...(patient.currentVitals ?? history.at(-1) ?? {}) }
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

// ── App Component ──────────────────────────────────────────────────────

function App() {
  const [patients, setPatients] = useState(loadInitialPatients)
  const [selectedPatientId, setSelectedPatientId] = useState(
    () => mockPatients[0]?.id ?? null,
  )
  const [activeAlert, setActiveAlert] = useState(null)
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false)
  const [aiLoadingByPatient, setAiLoadingByPatient] = useState({})
  const [nurseNoteDrafts, setNurseNoteDrafts] = useState({})
  const [nurseNotePanelOpen, setNurseNotePanelOpen] = useState({})

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

  // ── Organ risk indicators ──
  const currentVitals = selectedPatient?.currentVitals ?? {}
  const kidneyRisk = currentVitals.urine !== undefined && currentVitals.urine < 30
  const heartRisk = currentVitals.hr > 100 || (currentVitals.hr > 100 && currentVitals.spo2 < 94)
  const liverRisk = currentVitals.liverFlag || currentVitals.eyeYellow || (currentVitals.bilirubin !== undefined && currentVitals.bilirubin > 2)
  const lungRisk = currentVitals.rr > 22 || currentVitals.spo2 < 94 || (currentVitals.pf_ratio !== undefined && currentVitals.pf_ratio < 300)
  const plateletRisk = currentVitals.platelets !== undefined && currentVitals.platelets < 100000
  const brainRisk = currentVitals.confusion === true

  // ── Nurse notes helpers (from UI branch) ──
  const isSelectedPatientCritical = selectedPatient?.status === 'red'
  const isSelectedPatientNotePanelOpen =
    isSelectedPatientCritical || Boolean(nurseNotePanelOpen[selectedPatient?.id])

  function toggleNurseNotePanel(patientId) {
    setNurseNotePanelOpen((previous) => ({
      ...previous,
      [patientId]: !previous[patientId],
    }))
  }

  function handleSaveNurseNote() {
    if (!selectedPatient) return
    const draft = (nurseNoteDrafts[selectedPatient.id] ?? '').trim()
    if (!draft) return

    const entry = buildVisitNoteEntry(selectedPatient, draft, getClockTime())
    setPatients((prev) =>
      prev.map((p) =>
        p.id === selectedPatient.id
          ? { ...p, history: [...p.history, entry].slice(-180) }
          : p,
      ),
    )
    setNurseNoteDrafts((prev) => ({ ...prev, [selectedPatient.id]: '' }))
    setNurseNotePanelOpen((prev) => ({ ...prev, [selectedPatient.id]: false }))
  }

  // ── AI explanation (from main) ──
  const requestAiExplanation = useCallback(async (patient) => {
    if (!patient || aiInFlightRef.current.has(patient.id)) return

    const requestSession = aiRequestSessionRef.current
    aiInFlightRef.current.add(patient.id)
    setAiLoadingByPatient((previous) => ({ ...previous, [patient.id]: true }))

    try {
      const explanation = await generateClinicalExplanation(patient)
      if (requestSession !== aiRequestSessionRef.current) return

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
      intervalMs: 8000,
      patientsRef,
      onPatientTurnedRed: (patient) => {
        setActiveAlert(createAlertPayload(patient))
        if (autoTriggeredInRedRef.current.has(patient.id)) return
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
    setNurseNoteDrafts({})
    setNurseNotePanelOpen({})
  }, [])

  const handleAddPatient = useCallback(
    (draftPatient) => {
      const nextPatient = buildPatientFromDraft(draftPatient, patients)
      setPatients((previousPatients) => [...previousPatients, nextPatient])
      setSelectedPatientId(nextPatient.id)
      setIsAddPatientOpen(false)

      if (nextPatient.status !== 'red') return
      autoTriggeredInRedRef.current.add(nextPatient.id)
      setActiveAlert(createAlertPayload(nextPatient))
      void requestAiExplanation(nextPatient)
    },
    [patients, requestAiExplanation],
  )

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-gray-900">
      <AlertBanner alert={activeAlert} onClose={() => setActiveAlert(null)} />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white shadow-sm">H</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">HealthGuard AI</h1>
            <p className="text-[11px] text-gray-400">Real-time patient deterioration prediction</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 status-pulse" />
            Live
          </div>
          <button
            type="button"
            onClick={handleResetWard}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-rose-200 hover:text-rose-600"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setIsAddPatientOpen(true)}
            className="dashboard-button px-3 py-1.5 text-xs"
          >
            + Add Patient
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-8 lg:px-6">
        <div className="grid items-start gap-5 lg:grid-cols-[1.25fr_1fr]">
          <WardDashboard
            patients={patients}
            selectedPatientId={selectedPatient?.id ?? null}
            onSelectPatient={setSelectedPatientId}
            onAddPatient={() => setIsAddPatientOpen(true)}
          />

          <section className="dashboard-panel max-h-[calc(100vh-7rem)] overflow-y-auto p-4">
            {selectedPatient ? (
              <>
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {selectedPatient.name}
                    </h2>
                    <p className="text-[11px] text-gray-500">
                      Bed {selectedPatient.bed} • {selectedPatient.lastUpdated}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {selectedPatient.story || 'No clinical story available.'}
                    </p>
                  </div>
                  <RiskScore score={selectedPatient.riskScore} status={selectedPatient.status} />
                </div>

                {/* Current Vitals */}
                <div className="mb-3 grid grid-cols-5 gap-1.5">
                  {[
                    { label: 'HR', value: selectedPatient.currentVitals.hr, unit: 'bpm' },
                    { label: 'SpO2', value: `${selectedPatient.currentVitals.spo2}%` },
                    { label: 'RR', value: selectedPatient.currentVitals.rr, unit: '/min' },
                    { label: 'Temp', value: selectedPatient.currentVitals.temp, unit: '°F' },
                    { label: 'BP', value: selectedPatient.currentVitals.bp },
                  ].map((v) => (
                    <div key={v.label} className="rounded-lg bg-gray-50 px-2 py-1.5 text-center">
                      <div className="text-[9px] font-medium text-gray-400">{v.label}</div>
                      <div className="text-xs font-semibold text-gray-800">{v.value}</div>
                    </div>
                  ))}
                </div>

                {/* Organ Risk Assessment */}
                <div className="mb-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
                    Organ Risk
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 text-[11px] text-gray-700">
                    <div className={`rounded-lg px-2 py-1.5 ${lungRisk ? 'border border-rose-200 bg-rose-50' : 'bg-gray-50'}`}>
                      🫁 {lungRisk ? '⚠️' : '✓'}
                      <span className="ml-0.5 text-[10px] text-gray-400">PF {currentVitals.pf_ratio ?? '--'}</span>
                    </div>
                    <div className={`rounded-lg px-2 py-1.5 ${heartRisk ? 'border border-rose-200 bg-rose-50' : 'bg-gray-50'}`}>
                      ❤️ {heartRisk ? '⚠️' : '✓'}
                      <span className="ml-0.5 text-[10px] text-gray-400">{currentVitals.hr} bpm</span>
                    </div>
                    <div className={`rounded-lg px-2 py-1.5 ${kidneyRisk ? 'border border-rose-200 bg-rose-50' : 'bg-gray-50'}`}>
                      🫘 {kidneyRisk ? '⚠️' : '✓'}
                      <span className="ml-0.5 text-[10px] text-gray-400">{currentVitals.urine ?? '--'} ml/hr</span>
                    </div>
                    <div className={`rounded-lg px-2 py-1.5 ${liverRisk ? 'border border-rose-200 bg-rose-50' : 'bg-gray-50'}`}>
                      🟤 {liverRisk ? '⚠️' : '✓'}
                      <span className="ml-0.5 text-[10px] text-gray-400">Bili {currentVitals.bilirubin?.toFixed(1) ?? '--'}</span>
                    </div>
                    <div className={`rounded-lg px-2 py-1.5 ${plateletRisk ? 'border border-rose-200 bg-rose-50' : 'bg-gray-50'}`}>
                      🩸 {plateletRisk ? '⚠️' : '✓'}
                      <span className="ml-0.5 text-[10px] text-gray-400">{currentVitals.platelets != null ? `${Math.round(currentVitals.platelets / 1000)}k` : '--'}</span>
                    </div>
                    <div className={`rounded-lg px-2 py-1.5 ${brainRisk ? 'border border-rose-200 bg-rose-50' : 'bg-gray-50'}`}>
                      🧠 {brainRisk ? '⚠️' : '✓'}
                      <span className="ml-0.5 text-[10px] text-gray-400">{currentVitals.confusion ? 'Yes' : 'Clear'}</span>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-2 py-1.5">
                      👁️ {currentVitals.eyeYellow ? '⚠️' : '✓'}
                      <span className="ml-0.5 text-[10px] text-gray-400">{currentVitals.eyeYellow ? 'Yellow' : 'Normal'}</span>
                    </div>
                  </div>
                </div>

                {/* Vitals Trend */}
                <div className="mb-4 dashboard-card p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Vitals Trend
                  </p>
                  <VitalsGraph history={selectedPatient.history} />
                </div>

                {/* History & Nurse Notes (from UI branch) */}
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
                    <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
                      <textarea
                        value={nurseNoteDrafts[selectedPatient.id] ?? ''}
                        onChange={(event) => {
                          const value = event.target.value
                          setNurseNoteDrafts((previous) => ({
                            ...previous,
                            [selectedPatient.id]: value,
                          }))
                        }}
                        placeholder="Write nurse observation..."
                        className="min-h-16 w-full rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-teal-500"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveNurseNote}
                          className="dashboard-button px-3 py-1.5 text-xs"
                        >
                          Save Note
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
                          className={`rounded-lg border px-3 py-2.5 ${cardClass}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${labelClass}`}>
                                  {getAlertLabel(snapshotStatus)}
                                </span>
                                <span className="text-[10px] text-gray-400">{entry.time}</span>
                              </div>
                              <p className="mt-1 text-xs text-gray-600">{factorText}</p>
                              {entry.note && <p className="mt-1 text-xs text-gray-500 italic">{entry.note}</p>}
                            </div>
                            <div className={`shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold shadow-sm ring-1 ring-gray-100 ${scoreClass}`}>
                              {snapshotScore}
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

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void requestAiExplanation(selectedPatient)}
                    className="dashboard-button px-3 py-1.5 text-xs"
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
