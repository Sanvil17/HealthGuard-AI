function AIExplanation({ explanation, loading }) {
  return (
    <section className="dashboard-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm">🤖</span>
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
          AI Clinical Insight
        </h3>
        {loading && (
          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-600">
            Analyzing...
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-[90%] animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-[75%] animate-pulse rounded bg-gray-100" />
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-gray-600">
          {explanation || 'AI explanation will auto-generate when risk enters critical.'}
        </p>
      )}
    </section>
  )
}

export default AIExplanation
