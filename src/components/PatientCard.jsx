import clsx from 'clsx'

const statusStyle = {
  green: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  yellow: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  red: 'border-rose-500/40 bg-rose-500/10 text-rose-200 animate-pulse',
}

function PatientCard({ patient, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'rounded-xl border p-3 text-left transition hover:border-cyan-400/70 hover:bg-slate-800/80',
        statusStyle[patient.status],
        selected && 'ring-2 ring-cyan-400/80',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">{patient.name}</div>
          <div className="text-xs opacity-90">Bed {patient.bed}</div>
        </div>
        <div className="rounded-full border border-white/20 px-2 py-0.5 text-xs font-semibold text-white">
          {patient.riskScore}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 text-xs text-slate-100">
        <span>HR {patient.currentVitals.hr}</span>
        <span>SpO2 {patient.currentVitals.spo2}%</span>
        <span>RR {patient.currentVitals.rr}</span>
      </div>
    </button>
  )
}

export default PatientCard
