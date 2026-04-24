import clsx from 'clsx'

const statusMeta = {
  green: {
    label: 'Stable',
    frame: 'border-white/5 bg-[#0F172A]',
    badge: 'bg-green-500/10 text-green-400',
  },
  yellow: {
    label: 'Warning',
    frame: 'border-white/5 bg-[#0F172A]',
    badge: 'bg-orange-500/10 text-orange-400',
  },
  red: {
    label: 'Critical',
    frame: 'border-red-500/20 bg-red-500/10',
    badge: 'bg-red-500/10 text-red-500',
  },
}

function PatientCard({ patient, selected, onSelect }) {
  const meta = statusMeta[patient.status] ?? statusMeta.green

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'rounded-xl border p-4 text-left transition-all duration-200 hover:border-white/10 hover:shadow-lg hover:shadow-black/20',
        meta.frame,
        selected && 'ring-1 ring-white/10',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-white">{patient.name}</div>
          <div className="text-xs text-slate-200/85">Bed {patient.bed}</div>
        </div>
        <div className="rounded-full border border-white/10 px-2 py-0.5 text-xs font-semibold text-white/90">
          Risk {patient.riskScore}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]', meta.badge)}>
          {meta.label}
        </span>
        <span className="text-[10px] text-gray-400">Updated {patient.lastUpdated || 'Now'}</span>
      </div>

      <div className="grid grid-cols-3 gap-1 text-xs text-slate-100">
        <span>HR {patient.currentVitals.hr}</span>
        <span>SpO2 {patient.currentVitals.spo2}%</span>
        <span>RR {patient.currentVitals.rr}</span>
      </div>

      <p className="mt-2 max-h-8 overflow-hidden text-[11px] text-slate-300/90">
        {patient.story || 'No patient story available.'}
      </p>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-900/40">
        <div
          className="h-full rounded-full bg-cyan-300/80"
          style={{ width: `${Math.max(4, patient.riskScore)}%` }}
        />
      </div>
    </button>
  )
}

export default PatientCard
