import { useEffect } from 'react'

function AlertBanner({ alert, onClose }) {
  useEffect(() => {
    if (!alert) {
      return undefined
    }

    const timer = setTimeout(onClose, 8000)
    return () => clearTimeout(timer)
  }, [alert, onClose])

  if (!alert) {
    return null
  }

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex justify-center px-4 pt-3">
      <div className="w-full max-w-2xl animate-[slideDown_300ms_ease] rounded-xl border border-red-200 bg-white/95 px-5 py-3.5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm">
              🚨
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {alert.patientName} — Risk Score {alert.score}
              </p>
              <p className="text-xs text-gray-500">
                Escalated at {alert.time} • Immediate assessment recommended
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-200"
          >
            Dismiss
          </button>
        </div>

        {/* Auto-dismiss progress bar */}
        <div className="mt-2.5 h-0.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-red-400"
            style={{ animation: 'shrink 8s linear forwards' }}
          />
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

export default AlertBanner
