const statusMeta = {
  green: { color: '#22C55E', label: 'Stable' },
  yellow: { color: '#F5A623', label: 'Warning' },
  red: { color: '#EF4444', label: 'Critical' },
}

function RiskScore({ score, status }) {
  const safeScore = Number.isFinite(score) ? Math.round(score) : 0
  const normalizedScore = Math.max(0, Math.min(100, safeScore))
  const ringSweep = normalizedScore * 3.6
  const meta = statusMeta[status] ?? statusMeta.green

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div
        className="relative grid h-24 w-24 place-items-center rounded-full p-1"
        style={{
          background: `conic-gradient(${meta.color} ${ringSweep}deg, rgba(148, 163, 184, 0.18) ${ringSweep}deg 360deg)`,
        }}
      >
        <div className="grid h-full w-full place-items-center rounded-full bg-slate-950/75">
          <span className="text-2xl font-bold leading-none" style={{ color: meta.color }}>
            {normalizedScore}
          </span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-slate-300">/100</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
        {meta.label}
      </span>
    </div>
  )
}

export default RiskScore
