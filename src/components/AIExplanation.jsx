function AIExplanation({ explanation, loading }) {
  return (
    <section className="rounded-xl border border-slate-700/80 bg-app-card/85 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
        AI Clinical Explanation
      </h3>
      {loading ? (
        <div className="space-y-2">
          <p className="text-sm text-cyan-200">Generating explanation...</p>
          <div className="loading-shimmer h-3 w-full rounded-md" />
          <div className="loading-shimmer h-3 w-[92%] rounded-md" />
          <div className="loading-shimmer h-3 w-[85%] rounded-md" />
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-slate-100">
          {explanation || 'No AI explanation yet. It will auto-generate when risk enters red.'}
        </p>
      )}
    </section>
  )
}

export default AIExplanation
