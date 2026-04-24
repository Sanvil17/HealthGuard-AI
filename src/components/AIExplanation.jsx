function AIExplanation({ explanation, loading }) {
  return (
    <section className="rounded-xl border border-slate-700 bg-app-card p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
        AI Clinical Explanation
      </h3>
      {loading ? (
        <p className="text-sm text-cyan-300">Generating explanation...</p>
      ) : (
        <p className="text-sm leading-relaxed text-slate-100">
          {explanation || 'No AI explanation yet. It will auto-generate when risk enters red.'}
        </p>
      )}
    </section>
  )
}

export default AIExplanation
