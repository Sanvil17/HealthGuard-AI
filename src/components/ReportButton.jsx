import { generateReport } from '../utils/pdfGenerator'

function ReportButton({ patient }) {
  return (
    <button
      type="button"
      onClick={() => generateReport(patient)}
      className="rounded-lg border border-cyan-400/60 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
    >
      Generate Report
    </button>
  )
}

export default ReportButton
