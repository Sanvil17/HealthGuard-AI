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
      <div className="w-full max-w-4xl rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">ALERT</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">Critical Patient Escalation</p>
              <p className="text-sm text-gray-600">
                {alert.patientName} reached risk score {alert.score} at {alert.time}. Immediate clinical
                assessment is recommended.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Dismiss
          </button>
        </div>

        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full w-full rounded-full bg-blue-500/60" />
        </div>
      </div>
    </div>
  )
}

export default AlertBanner
