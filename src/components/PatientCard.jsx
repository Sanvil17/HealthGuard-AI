import clsx from 'clsx'

const statusMeta = {
  green: {
    label: 'Stable',
    frame: 'border-[#22C55E]/45 bg-[#22C55E]/12',
    badge: 'bg-[#22C55E]/20 text-[#B9F8CC]',
  },
  yellow: {
    label: 'Warning',
    frame: 'border-[#F5A623]/45 bg-[#F5A623]/10',
    badge: 'bg-[#F5A623]/20 text-[#FFE4B2]',
  },
  red: {
    label: 'Critical',
    frame: 'border-[#EF4444]/45 bg-[#EF4444]/12 card-alert-pulse',
    badge: 'bg-[#EF4444]/20 text-[#FFD0D0]',
  },
}

function PatientCard({ patient, selected, onSelect }) {
  const meta = statusMeta[patient.status] ?? statusMeta.green

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'rounded-xl border p-3 text-left transition duration-200 hover:border-cyan-300/80 hover:bg-slate-800/80',
        meta.frame,
        selected && 'ring-2 ring-cyan-300/80',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-white">{patient.name}</div>
          <div className="text-xs text-slate-200/85">Bed {patient.bed}</div>
        </div>
        <div className="rounded-full border border-white/20 px-2 py-0.5 text-xs font-semibold text-white/95">
          Risk {patient.riskScore}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]', meta.badge)}>
          {meta.label}
        </span>
        <span className="text-[10px] text-slate-300">Updated {patient.lastUpdated || 'Now'}</span>
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
