import { useEffect } from 'react'

function AlertBanner({ alert, onClose }) {
  useEffect(() => {
    if (!alert) {
      return undefined
    }

    const timer = setTimeout(onClose, 6000)
    return () => clearTimeout(timer)
  }, [alert, onClose])

  if (!alert) {
    return null
  }

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex justify-center px-4 pt-4">
      <div className="alert-drop w-full max-w-4xl rounded-xl border border-rose-300/70 bg-gradient-to-r from-rose-700 via-rose-600 to-red-700 px-4 py-3 text-sm text-white shadow-2xl shadow-rose-950/70">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">ALERT</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em]">Critical Patient Escalation</p>
              <p className="text-sm text-rose-50">
                {alert.patientName} reached risk score {alert.score} at {alert.time}. Immediate clinical
                assessment is recommended.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/35 px-2 py-1 text-xs font-semibold text-white transition hover:bg-white/15"
          >
            Dismiss
          </button>
        </div>

        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/25">
          <div className="alert-timer-bar h-full rounded-full bg-white/80" />
        </div>
      </div>
    </div>
  )
}

export default AlertBanner
