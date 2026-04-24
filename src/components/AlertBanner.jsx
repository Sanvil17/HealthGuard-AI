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
      <div className="w-full max-w-3xl rounded-xl border border-rose-300/70 bg-rose-600 px-4 py-3 text-sm text-white shadow-2xl shadow-rose-950/60">
        <p className="font-semibold">
          Critical Alert: {alert.patientName} reached risk score {alert.score} at {alert.time}
        </p>
      </div>
    </div>
  )
}

export default AlertBanner
