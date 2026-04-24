import clsx from 'clsx'

const styleByStatus = {
  green: 'border-emerald-500/70 text-emerald-300 bg-emerald-500/10',
  yellow: 'border-amber-500/70 text-amber-300 bg-amber-500/10',
  red: 'border-rose-500/70 text-rose-300 bg-rose-500/10',
}

function RiskScore({ score, status }) {
  return (
    <div
      className={clsx(
        'flex h-20 w-20 flex-col items-center justify-center rounded-full border-4 text-center',
        styleByStatus[status],
      )}
    >
      <span className="text-lg font-bold leading-none">{score}</span>
      <span className="text-[10px] uppercase tracking-wide">/100</span>
    </div>
  )
}

export default RiskScore
