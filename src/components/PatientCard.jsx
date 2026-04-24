import clsx from 'clsx'

const statusMeta = {
  green: {
    label: 'Stable',
    frame: 'border-white/5 bg-white',
    badge: 'bg-green-50 text-green-600',
  },
  yellow: {
    label: 'Warning',
    frame: 'border-white/5 bg-white',
    badge: 'bg-orange-50 text-orange-500',
  },
  red: {
    label: 'Critical',
    frame: 'border-red-500/20 bg-red-50',
    badge: 'bg-red-50 text-red-500',
  },
}

function PatientCard({ patient, selected, onSelect }) {
  const meta = statusMeta[patient.status] ?? statusMeta.green

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'rounded-xl border p-4 text-left transition-all duration-200 hover:border-slate-200 hover:shadow-md hover:shadow-black/5',
        meta.frame,
        selected && 'ring-2 ring-[#5FD1B7]/35',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-gray-900">{patient.name}</div>
          <div className="text-xs text-gray-500">Bed {patient.bed}</div>
        </div>
        <div className="rounded-full border border-white/60 px-2 py-0.5 text-xs font-semibold text-gray-700">
          Risk {patient.riskScore}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]', meta.badge)}>
          {meta.label}
        </span>
        <span className="text-[10px] text-gray-500">Updated {patient.lastUpdated || 'Now'}</span>
      </div>

      <div className="grid grid-cols-3 gap-1 text-xs text-gray-700">
        <span>HR {patient.currentVitals.hr}</span>
        <span>SpO2 {patient.currentVitals.spo2}%</span>
        <span>RR {patient.currentVitals.rr}</span>
      </div>

      <p className="mt-2 max-h-8 overflow-hidden text-[11px] text-gray-500">
        {patient.story || 'No patient story available.'}
      </p>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={clsx('h-full rounded-full', patient.status === 'red' ? 'bg-red-400' : patient.status === 'yellow' ? 'bg-orange-400' : 'bg-green-500')}
          style={{ width: `${Math.max(4, patient.riskScore)}%` }}
        />
      </div>
    </button>
  )
}

export default PatientCard
