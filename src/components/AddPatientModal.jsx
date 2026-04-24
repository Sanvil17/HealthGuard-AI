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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Add Patient</h3>
            <p className="text-xs text-gray-500">New patient joins the live simulation stream instantly.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-xs text-gray-600">
            Name
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#0F766E]"
              value={draft.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              placeholder="Patient name"
              required
            />
          </label>

          <label className="text-xs text-gray-600">
            Bed
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#0F766E]"
              value={draft.bed}
              onChange={(event) => handleFieldChange('bed', event.target.value)}
              placeholder="B06"
              required
            />
          </label>

          <label className="text-xs text-gray-600">
            Pattern
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#0F766E]"
              value={draft.pattern}
              onChange={(event) => handleFieldChange('pattern', event.target.value)}
            >
              <option value="stable">Stable</option>
              <option value="deteriorating">Deteriorating</option>
              <option value="recovering">Recovering</option>
            </select>
          </label>

          <label className="text-xs text-gray-600">
            Blood Pressure
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#0F766E]"
              value={draft.currentVitals.bp}
              onChange={(event) => handleVitalsChange('bp', event.target.value)}
              placeholder="120/80"
            />
          </label>

          <label className="text-xs text-gray-600">
            HR
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#0F766E]"
              type="number"
              min="30"
              max="220"
              value={draft.currentVitals.hr}
              onChange={(event) => handleVitalsChange('hr', event.target.value)}
            />
          </label>

          <label className="text-xs text-gray-600">
            SpO2
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#0F766E]"
              type="number"
              min="50"
              max="100"
              value={draft.currentVitals.spo2}
              onChange={(event) => handleVitalsChange('spo2', event.target.value)}
            />
          </label>

          <label className="text-xs text-gray-600">
            RR
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#0F766E]"
              type="number"
              min="8"
              max="40"
              value={draft.currentVitals.rr}
              onChange={(event) => handleVitalsChange('rr', event.target.value)}
            />
          </label>

          <label className="text-xs text-gray-600">
            Temperature (F)
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#0F766E]"
              type="number"
              min="94"
              max="106"
              step="0.1"
              value={draft.currentVitals.temp}
              onChange={(event) => handleVitalsChange('temp', event.target.value)}
            />
          </label>

          <label className="text-xs text-gray-600 md:col-span-2">
            Nurse Note (optional)
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#0F766E]"
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
              className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
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