const statusMeta = {
  green: { color: '#22C55E', label: 'Stable' },
  yellow: { color: '#F5A623', label: 'Warning' },
  red: { color: '#EF4444', label: 'Critical' },
}

function RiskScore({ score, status }) {
  const safeScore = Number.isFinite(score) ? Math.round(score) : 0
  const normalizedScore = Math.max(0, Math.min(100, safeScore))
  const meta = statusMeta[status] ?? statusMeta.green

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#111827] text-xl font-bold" style={{ color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}33` }}>
        {normalizedScore}
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
        {meta.label}
      </span>
    </div>
  )
}

export default RiskScore
