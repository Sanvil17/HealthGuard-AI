import { useEffect, useState } from 'react'

function toNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function createInitialDraft(suggestedBed) {
  return {
    name: '',
    bed: suggestedBed,
    pattern: 'stable',
    currentVitals: {
      hr: 80,
      spo2: 98,
      rr: 16,
      temp: 98.6,
      bp: '120/80',
    },
    note: '',
  }
}

function AddPatientModal({ onClose, onSubmit, suggestedBed }) {
  const [draft, setDraft] = useState(() => createInitialDraft(suggestedBed))

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleFieldChange(field, value) {
    setDraft((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  function handleVitalsChange(field, value) {
    setDraft((previous) => ({
      ...previous,
      currentVitals: {
        ...previous.currentVitals,
        [field]: value,
      },
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const name = draft.name.trim()
    const bed = draft.bed.trim().toUpperCase()
    if (!name || !bed) {
      return
    }

    onSubmit({
      ...draft,
      name,
      bed,
      note: draft.note.trim(),
      currentVitals: {
        hr: Math.round(toNumber(draft.currentVitals.hr, 80)),
        spo2: Math.round(toNumber(draft.currentVitals.spo2, 98)),
        rr: Math.round(toNumber(draft.currentVitals.rr, 16)),
        temp: Number(toNumber(draft.currentVitals.temp, 98.6).toFixed(1)),
        bp: String(draft.currentVitals.bp || '120/80').trim(),
      },
    })
  }

  const inputClasses = 'w-full rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/80'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-600/70 bg-[#102236] p-4 shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-white">Add Patient</h3>
            <p className="text-xs text-slate-300">New patient joins the live simulation stream instantly.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-500 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-700/50"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-300">
            Name
            <input
              className={inputClasses}
              value={draft.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              placeholder="Patient name"
              required
            />
          </label>

          <label className="text-xs text-slate-300">
            Bed
            <input
              className={inputClasses}
              value={draft.bed}
              onChange={(event) => handleFieldChange('bed', event.target.value)}
              placeholder="B06"
              required
            />
          </label>

          <label className="text-xs text-slate-300">
            Pattern
            <select
              className={inputClasses}
              value={draft.pattern}
              onChange={(event) => handleFieldChange('pattern', event.target.value)}
            >
              <option value="stable">Stable</option>
              <option value="deteriorating">Deteriorating</option>
              <option value="recovering">Recovering</option>
            </select>
          </label>

          <label className="text-xs text-slate-300">
            Blood Pressure
            <input
              className={inputClasses}
              value={draft.currentVitals.bp}
              onChange={(event) => handleVitalsChange('bp', event.target.value)}
              placeholder="120/80"
            />
          </label>

          <label className="text-xs text-slate-300">
            HR
            <input
              className={inputClasses}
              type="number"
              min="30"
              max="220"
              value={draft.currentVitals.hr}
              onChange={(event) => handleVitalsChange('hr', event.target.value)}
            />
          </label>

          <label className="text-xs text-slate-300">
            SpO2
            <input
              className={inputClasses}
              type="number"
              min="50"
              max="100"
              value={draft.currentVitals.spo2}
              onChange={(event) => handleVitalsChange('spo2', event.target.value)}
            />
          </label>

          <label className="text-xs text-slate-300">
            RR
            <input
              className={inputClasses}
              type="number"
              min="8"
              max="40"
              value={draft.currentVitals.rr}
              onChange={(event) => handleVitalsChange('rr', event.target.value)}
            />
          </label>

          <label className="text-xs text-slate-300">
            Temperature (F)
            <input
              className={inputClasses}
              type="number"
              min="94"
              max="106"
              step="0.1"
              value={draft.currentVitals.temp}
              onChange={(event) => handleVitalsChange('temp', event.target.value)}
            />
          </label>

          <label className="text-xs text-slate-300 md:col-span-2">
            Nurse Note (optional)
            <textarea
              className={inputClasses}
              rows="2"
              value={draft.note}
              onChange={(event) => handleFieldChange('note', event.target.value)}
              placeholder="Initial intake observation"
            />
          </label>

          <div className="mt-1 flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-500 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Add to Ward
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddPatientModal