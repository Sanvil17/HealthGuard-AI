const statusMeta = {
  green: { color: '#10b981', label: 'Stable', bg: 'rgba(16, 185, 129, 0.08)' },
  yellow: { color: '#f59e0b', label: 'Warning', bg: 'rgba(245, 158, 11, 0.08)' },
  red: { color: '#ef4444', label: 'Critical', bg: 'rgba(239, 68, 68, 0.08)' },
}

function RiskScore({ score, status }) {
  const safeScore = Number.isFinite(score) ? Math.round(score) : 0
  const normalizedScore = Math.max(0, Math.min(100, safeScore))
  const meta = statusMeta[status] ?? statusMeta.green

  // SVG circle progress
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-[88px] w-[88px]">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="6" />
          <circle
            cx="44" cy="44" r={radius}
            fill="none"
            stroke={meta.color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 600ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color: meta.color }}>{normalizedScore}</span>
        </div>
      </div>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]"
        style={{ background: meta.bg, color: meta.color }}
      >
        {meta.label}
      </span>
    </div>
  )
}

export default RiskScore
