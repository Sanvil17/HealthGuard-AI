function AIExplanation({ explanation, loading }) {
  return (
    <section className="dashboard-card p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
        AI Clinical Explanation
      </h3>
      {loading ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Generating explanation...</p>
          <div className="h-3 w-full animate-pulse rounded-md bg-gray-100" />
          <div className="h-3 w-[92%] animate-pulse rounded-md bg-gray-100" />
          <div className="h-3 w-[85%] animate-pulse rounded-md bg-gray-100" />
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-gray-700">
          {explanation || 'No AI explanation yet. It will auto-generate when risk enters red.'}
        </p>
      )}
    </section>
  )
}

export default AIExplanation
