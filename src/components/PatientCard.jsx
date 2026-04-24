import clsx from 'clsx'

const statusMeta = {
  green: {
    label: 'Stable',
    dot: 'bg-emerald-400',
    frame: 'border-gray-100 bg-white hover:border-emerald-200',
    badge: 'bg-emerald-50 text-emerald-700',
  },
  yellow: {
    label: 'Warning',
    dot: 'bg-amber-400 status-pulse',
    frame: 'border-amber-100 bg-amber-50/30 hover:border-amber-200',
    badge: 'bg-amber-50 text-amber-700',
  },
  red: {
    label: 'Critical',
    dot: 'bg-red-500 status-pulse',
    frame: 'border-red-200 bg-red-50/40 hover:border-red-300',
    badge: 'bg-red-50 text-red-600',
  },
}

function PatientCard({ patient, selected, onSelect }) {
  const meta = statusMeta[patient.status] ?? statusMeta.green

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'group rounded-xl border p-3.5 text-left transition-all duration-200',
        meta.frame,
        selected && 'ring-2 ring-teal-400/40 shadow-sm',
      )}
    >
      {/* Top row: name + status dot */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900">{patient.name}</div>
          <div className="text-[11px] text-gray-400">Bed {patient.bed}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className={clsx('h-2.5 w-2.5 rounded-full', meta.dot)} />
          <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-semibold', meta.badge)}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Vitals row */}
      <div className="mb-2 flex items-center gap-3 text-xs text-gray-600">
        <span>HR <strong className="text-gray-800">{patient.currentVitals.hr}</strong></span>
        <span className="text-gray-300">•</span>
        <span>SpO2 <strong className="text-gray-800">{patient.currentVitals.spo2}%</strong></span>
        <span className="text-gray-300">•</span>
        <span>RR <strong className="text-gray-800">{patient.currentVitals.rr}</strong></span>
      </div>

      {/* Risk bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            patient.status === 'red' ? 'bg-red-400' : patient.status === 'yellow' ? 'bg-amber-400' : 'bg-emerald-400',
          )}
          style={{ width: `${Math.max(4, patient.riskScore)}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
        <span>Risk {patient.riskScore}/100</span>
        <span>{patient.lastUpdated || 'Now'}</span>
      </div>
    </button>
  )
}

export default PatientCard
